import { $ } from 'bun';

async function runCommand(command: string, args: string[]) {
	const isLinux = process.platform === 'linux';
	const useSudo = isLinux && command === 'docker';

	console.log(`🚀 Running: ${useSudo ? 'sudo ' : ''}${command} ${args.join(' ')}...`);

	const result = useSudo
		? await $`sudo ${command} ${args}`.nothrow()
		: await $`${command} ${args}`.nothrow();

	return result.exitCode === 0;
}

async function main() {
	console.log('\n🗑️  Deleting database and volumes...');

	// docker compose down -v removes containers AND the named volumes defined in compose.yaml
	if (!(await runCommand('docker', ['compose', 'down', '-v']))) {
		console.error(
			'❌ Failed to delete database and volumes. Please make sure Docker is running.'
		);
		process.exit(1);
	}

	console.log('\n✨ Database and volumes deleted successfully!');
}

main().catch(console.error);
