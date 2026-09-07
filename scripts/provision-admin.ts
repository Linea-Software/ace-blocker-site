#!/usr/bin/env bun

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { eq } from 'drizzle-orm';
import { auth } from '../src/lib/server/auth';
import { db } from '../src/lib/server/db';
import { user } from '../src/lib/server/db/schema';
import { updateProExpiration } from '../src/lib/server/pro';

interface Args {
	email: string;
	username: string;
	passwordStdin: boolean;
}

function parseArgs(argv: string[]): Args {
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
	if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('--email must be a valid email');
	if (!username.trim()) throw new Error('--username is required');
	return { email: email.toLowerCase(), username: username.trim(), passwordStdin };
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	let existing = await db.select().from(user).where(eq(user.email, args.email)).limit(1);
	let created = false;

	if (existing.length === 0) {
		if (!args.passwordStdin) {
			throw new Error('New administrators require --password-stdin');
		}
		const password = readFileSync(0, 'utf8').replace(/[\r\n]+$/, '');
		if (password.length < 12) throw new Error('Administrator password must be at least 12 characters');

		await auth.api.createUser({
			body: { name: args.username, email: args.email, password }
		});
		existing = await db.select().from(user).where(eq(user.email, args.email)).limit(1);
		created = true;
	}

	const admin = existing[0];
	if (!admin) throw new Error('Administrator record was not created');

	// Promotion is idempotent. Intentionally do not touch the password of an
	// existing account, and do not bypass Better Auth's verified 2FA enrollment.
	await db
		.update(user)
		.set({ role: 'admin', emailVerified: true })
		.where(eq(user.id, admin.id));
	await updateProExpiration(args.email, new Date('2099-01-01'));

	console.log(created ? 'Administrator created and promoted.' : 'Existing account promoted/confirmed as administrator.');
	console.log('TOTP is not pre-enabled. Sign in and complete the normal verified 2FA enrollment flow.');
}

main().catch((error) => {
	console.error(`Provisioning failed: ${error instanceof Error ? error.message : 'unknown error'}`);
	process.exit(1);
});
