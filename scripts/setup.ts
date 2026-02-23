import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';

function runCommand(command: string, args: string[]) {
	// Use sudo on Linux for docker and apt commands
	const isLinux = process.platform === 'linux';
	const useSudo = isLinux && (command === 'docker' || command === 'apt');
	const cmd = useSudo ? `sudo ${command}` : command;

	console.log(`🚀 Running: ${cmd} ${args.join(' ')}...`);
	const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
	return result.status === 0;
}

async function main() {
	const isLinux = process.platform === 'linux';

	// 0. Install system dependencies (Linux only)
	if (isLinux) {
		console.log('\n🛠️  Checking system dependencies...');
		const hasNss = spawnSync('dpkg', ['-l', 'libnss3-tools'], { stdio: 'ignore' }).status === 0;
		if (!hasNss) {
			console.log('📦 Installing libnss3-tools (required for SSL)...');
			runCommand('apt', ['update']);
			runCommand('apt', ['install', '-y', 'libnss3-tools']);
		} else {
			console.log('✅ libnss3-tools is already installed.');
		}
	}
	const rootDir = process.cwd();
	const envPath = join(rootDir, '.env');
	const envExamplePath = join(rootDir, '.env.example');

	if (!existsSync(envExamplePath)) {
		console.error('❌ .env.example not found!');
		process.exit(1);
	}

	let envContent = '';
	let isNewFile = false;

	if (existsSync(envPath)) {
		console.log('ℹ️  .env file already exists. Checking configuration...');
		envContent = readFileSync(envPath, 'utf-8');
	} else {
		console.log('ℹ️  Creating .env file from .env.example...');
		envContent = readFileSync(envExamplePath, 'utf-8');
		isNewFile = true;
	}

	// 1. Generate BETTER_AUTH_SECRET if missing or empty
	const secretRegex = /BETTER_AUTH_SECRET=(.*)/;
	const match = envContent.match(secretRegex);

	let needsUpdate = false;

	if (!match || match[1].trim() === '' || match[1].trim() === '""' || match[1].trim() === "''") {
		console.log('🔑 Generating BETTER_AUTH_SECRET...');
		const secret = randomBytes(32).toString('hex'); // 64 chars hex

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

	// 2. Check DODO_PAYMENTS_API_KEY
	if (
		!envContent.includes('DODO_PAYMENTS_API_KEY') ||
		envContent.includes('DODO_PAYMENTS_API_KEY=""')
	) {
		console.warn('⚠️  DODO_PAYMENTS_API_KEY is not set. Please add it to your .env file manually.');
	}

	if (isNewFile || needsUpdate) {
		writeFileSync(envPath, envContent);
		console.log(`✅ ${isNewFile ? 'Created' : 'Updated'} .env file successfully.`);
	} else {
		console.log('✨ .env is already up to date.');
	}

	// 3. Database & Auth Setup
	console.log('\n🗄️  Setting up database...');

	// Ensure docker is running
	if (!runCommand('docker', ['compose', 'up', '-d'])) {
		console.warn('⚠️  Failed to start docker containers. Please make sure Docker is running.');
	} else {
		console.log('✅ Docker containers are running.');

		// Wait a bit for Postgres to be ready
		console.log('⏳ Waiting for database to be ready...');
		await new Promise((resolve) => setTimeout(resolve, 3000));

		// Push schema
		console.log('📦 Applying database migrations...');
		if (!runCommand('bun', ['run', 'db:migrate'])) {
			console.error('❌ Failed to apply database migrations.');
		} else {
			console.log('✅ Database migrations applied successfully.');
		}
	}

	console.log('\n✨ Setup complete! You can now run the development server.');
}

main().catch(console.error);
