import { spawnSync } from 'node:child_process';

function runCommand(command: string, args: string[]) {
	const isLinux = process.platform === 'linux';
	const useSudo = isLinux && command === 'docker';
	const cmd = useSudo ? `sudo ${command}` : command;

	console.log(`🚀 Running: ${cmd} ${args.join(' ')}...`);
	const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
	return result.status === 0;
}

async function main() {
	console.log('\n🗑️  Deleting database and volumes...');

	// docker compose down -v removes containers AND the named volumes defined in compose.yaml
	if (!runCommand('docker', ['compose', 'down', '-v'])) {
		console.error('❌ Failed to delete database and volumes. Please make sure Docker is running.');
		process.exit(1);
	}

	console.log('\n✨ Database and volumes deleted successfully!');
}

main().catch(console.error);
