import { readFileSync } from 'node:fs';

export interface ProvisionAdminArgs {
	email: string;
	username: string;
	passwordStdin: boolean;
}

interface PasswordInputOptions {
	stdinIsTTY?: boolean;
	outputIsTTY?: boolean;
	readPipedPassword?: () => string;
	promptPassword?: () => Promise<string>;
}

export function parseProvisionAdminArgs(argv: string[]): ProvisionAdminArgs {
	let email = '';
	let username = '';
	let passwordStdin = false;

	for (let i = 0; i < argv.length; i++) {
		switch (argv[i]) {
			case '--email':
				email = argv[++i] ?? '';
				break;
			case '--username':
				username = argv[++i] ?? '';
				break;
			case '--password-stdin':
				passwordStdin = true;
				break;
			default:
				throw new Error(`Unknown argument: ${argv[i]}`);
		}
	}

	if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
		throw new Error('--email must be a valid email');
	}
	if (!username.trim()) {
		throw new Error('--username is required');
	}

	return {
		email: email.toLowerCase(),
		username: username.trim(),
		passwordStdin
	};
}

export function validateAdminPassword(password: string): string {
	if (password.length < 12) {
		throw new Error('Administrator password must be at least 12 characters');
	}
	return password;
}

function readPipedPassword(): string {
	return validateAdminPassword(readFileSync(0, 'utf8').replace(/[\r\n]+$/, ''));
}

async function readHiddenLine(prompt: string): Promise<string> {
	if (!process.stdin.isTTY || !process.stderr.isTTY || !process.stdin.setRawMode) {
		throw new Error('A secure interactive password prompt requires a terminal');
	}

	const stdin = process.stdin;
	const wasRaw = stdin.isRaw;
	const wasPaused = stdin.isPaused();

	process.stderr.write(prompt);
	stdin.setRawMode(true);
	stdin.resume();

	try {
		return await new Promise<string>((resolve, reject) => {
			let value = '';

			const finish = (result: { value?: string; error?: Error }) => {
				stdin.off('data', onData);
				process.stderr.write('\n');
				if (result.error) reject(result.error);
				else resolve(result.value ?? '');
			};

			const onData = (chunk: Buffer | string) => {
				for (const char of chunk.toString()) {
					if (char === '\r' || char === '\n') {
						finish({ value });
						return;
					}
					if (char === '\u0003' || char === '\u0004') {
						finish({ error: new Error('Provisioning cancelled') });
						return;
					}
					if (char === '\u007f' || char === '\b') {
						value = value.slice(0, -1);
						continue;
					}
					if (char === '\u0015') {
						value = '';
						continue;
					}
					if (char >= ' ') value += char;
				}
			};

			stdin.on('data', onData);
		});
	} finally {
		stdin.setRawMode(Boolean(wasRaw));
		if (wasPaused) stdin.pause();
	}
}

async function promptForPassword(): Promise<string> {
	while (true) {
		const password = await readHiddenLine('Administrator password (12+ characters): ');
		if (password.length < 12) {
			process.stderr.write('Password must be at least 12 characters. Try again.\n');
			continue;
		}

		const confirmation = await readHiddenLine('Confirm administrator password: ');
		if (password !== confirmation) {
			process.stderr.write('Passwords do not match. Try again.\n');
			continue;
		}

		return password;
	}
}

export async function readNewAdminPassword(
	passwordStdin: boolean,
	options: PasswordInputOptions = {}
): Promise<string> {
	const stdinIsTTY = options.stdinIsTTY ?? Boolean(process.stdin.isTTY);
	const outputIsTTY = options.outputIsTTY ?? Boolean(process.stderr.isTTY);
	const readPiped = options.readPipedPassword ?? readPipedPassword;
	const prompt = options.promptPassword ?? promptForPassword;

	if (passwordStdin && !stdinIsTTY) {
		return validateAdminPassword(readPiped());
	}

	if (stdinIsTTY && outputIsTTY) {
		return validateAdminPassword(await prompt());
	}

	if (passwordStdin) {
		throw new Error(
			'--password-stdin requires piped input when no interactive terminal is available'
		);
	}

	throw new Error(
		'New administrators require an interactive terminal or --password-stdin with piped input'
	);
}
