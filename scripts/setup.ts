import { $ } from 'bun';
import { join } from 'path';
import { resolveLinuxNssInstallPlan } from './linux-setup';
import { configureDevelopmentAdminEnv } from './dev-admin-setup';

async function runCommand(command: string, args: string[]) {
	// Use sudo only for privileged Linux commands and only when not already root.
	const isLinux = process.platform === 'linux';
	const privilegedCommands = ['docker', 'apt', 'pacman', 'dnf', 'zypper', 'apk'];
	const useSudo = isLinux && process.getuid?.() !== 0 && privilegedCommands.includes(command);

	console.log(`🚀 Running: ${useSudo ? 'sudo ' : ''}${command} ${args.join(' ')}...`);

	const result = useSudo
		? await $`sudo ${command} ${args}`.nothrow()
		: await $`${command} ${args}`.nothrow();

	return result.exitCode === 0;
}

async function ensureLinuxNssTools() {
	console.log('\n🛠️  Checking system dependencies...');

	// certutil is provided by different packages on different Linux distros.
	// Checking the executable also handles manually installed NSS tools.
	if (Bun.which('certutil')) {
		console.log('✅ NSS certutil is already installed.');
		return;
	}

	const osReleasePaths = ['/etc/os-release', '/usr/lib/os-release'];
	let osRelease = '';
	for (const path of osReleasePaths) {
		if (await Bun.file(path).exists()) {
			osRelease = await Bun.file(path).text();
			break;
		}
	}
	const plan = resolveLinuxNssInstallPlan(osRelease);
	if (!plan) {
		throw new Error(
			'Unsupported Linux distribution: please install NSS certutil manually and rerun setup.'
		);
	}

	console.log(
		`📦 Installing ${plan.packageName} (${plan.family}) for local HTTPS certificates...`
	);
	for (const { command, args } of plan.commands) {
		if (!Bun.which(command)) {
			throw new Error(
				`Missing ${command} package manager. Install NSS certutil manually or check your Linux distribution.`
			);
		}
		if (!(await runCommand(command, args))) {
			throw new Error(
				`Could not install ${plan.packageName} with ${command}. Install it manually and rerun setup.` +
					(command === 'pacman'
						? ' On Arch, update your system with sudo pacman -Syu first if package databases are outdated.'
						: '')
			);
		}
	}

	if (!Bun.which('certutil')) {
		throw new Error(`Installed ${plan.packageName}, but certutil is not on PATH.`);
	}
	console.log('✅ NSS certutil is available.');
}

async function main() {
	if (process.env.NODE_ENV === 'production') {
		throw new Error(
			'[ACE DEV SETUP ERROR] bun run setup is development-only. Use the production VPS provisioning workflow instead.'
		);
	}

	// 0. Install system dependencies (Linux only)
	if (process.platform === 'linux') {
		await ensureLinuxNssTools();
	}
	const rootDir = process.cwd();
	const envPath = join(rootDir, '.env');
	const envExamplePath = join(rootDir, '.env.example');

	if (!(await Bun.file(envExamplePath).exists())) {
		console.error('❌ .env.example not found!');
		process.exit(1);
	}

	let envContent = '';
	let isNewFile = false;

	if (await Bun.file(envPath).exists()) {
		console.log('ℹ️  .env file already exists. Checking configuration...');
		envContent = await Bun.file(envPath).text();
	} else {
		console.log('ℹ️  Creating .env file from .env.example...');
		envContent = await Bun.file(envExamplePath).text();
		isNewFile = true;
	}

	// 1. Generate BETTER_AUTH_SECRET if missing or empty
	const secretRegex = /BETTER_AUTH_SECRET=(.*)/;
	const match = envContent.match(secretRegex);

	let needsUpdate = false;

	if (!match || match[1].trim() === '' || match[1].trim() === '""' || match[1].trim() === "''") {
		console.log('🔑 Generating BETTER_AUTH_SECRET...');
		const secret = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');

		if (match) {
			// Replace existing empty definition
			envContent = envContent.replace(secretRegex, `BETTER_AUTH_SECRET="${secret}"`);
		} else {
			// Append to end
			// Ensure connection with newline
			if (!envContent.endsWith('\n')) envContent += '\n';
			envContent += `\n# Auth Secret\nBETTER_AUTH_SECRET="${secret}"\n`;
		}
		needsUpdate = true;
	} else {
		console.log('✅ BETTER_AUTH_SECRET is already configured.');
	}

	// 1.5. Set BETTER_AUTH_URL if missing
	if (!envContent.includes('BETTER_AUTH_URL')) {
		console.log('🔗 Adding BETTER_AUTH_URL...');
		if (!envContent.endsWith('\n')) envContent += '\n';
		envContent += `BETTER_AUTH_URL="https://localhost:5173"\n`;
		needsUpdate = true;
	}

	// 1.6. Prepare the local development admin account, independent of the
	// production-only provisioning flow. Existing custom credentials are kept.
	const devAdminSetup = configureDevelopmentAdminEnv(envContent);
	envContent = devAdminSetup.content;
	needsUpdate ||= devAdminSetup.changed;
	console.log(`👤 Development administrator: ${devAdminSetup.email}`);

	// 2. Check DODO_PAYMENTS_API_KEY
	if (
		!envContent.includes('DODO_PAYMENTS_API_KEY') ||
		envContent.includes('DODO_PAYMENTS_API_KEY=""')
	) {
		console.warn(
			'⚠️  DODO_PAYMENTS_API_KEY is not set. Please add it to your .env file manually.'
		);
	}

	if (isNewFile || needsUpdate) {
		await Bun.write(envPath, envContent);
		console.log(`✅ ${isNewFile ? 'Created' : 'Updated'} .env file successfully.`);
	} else {
		console.log('✨ .env is already up to date.');
	}

	// 3. Database & Auth Setup
	console.log('\n🗄️  Setting up database...');

	// Ensure docker is running
	if (!(await runCommand('docker', ['compose', 'up', '-d', '--wait', '--wait-timeout', '60']))) {
		throw new Error(
			'Failed to start a healthy database container. Make sure Docker is running.'
		);
	}
	console.log('Docker containers are running and healthy.');

	console.log('Checking local migration history...');
	if (!(await runCommand('bun', ['scripts/db-baseline.ts']))) {
		throw new Error(
			'Failed to reconcile local migration history. No database reset was performed.'
		);
	}

	console.log('Applying database migrations...');
	if (!(await runCommand('bun', ['run', 'db:migrate']))) {
		throw new Error('Failed to apply database migrations.');
	}
	console.log('Database migrations applied successfully.');

	console.log('\n✨ Setup complete! You can now run the development server.');
	console.log(`🔐 Development admin: ${devAdminSetup.email} — https://localhost:5173/signin`);
	console.log(
		'   New accounts use the password configured in DEFAULT_ADMIN_PASSWORD (existing passwords are not changed).'
	);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
