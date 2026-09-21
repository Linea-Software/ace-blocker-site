#!/usr/bin/env bun

import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin as adminPlugin } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';
import { db, dbClient } from '../src/lib/server/db';
import { proStatus, user } from '../src/lib/server/db/schema';

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

// Keep this provisioning instance deliberately minimal. Importing the app's
// full auth.ts pulls in SvelteKit-only virtual modules such as $env/static/private,
// which plain `bun scripts/provision-admin.ts` cannot resolve on the VPS.
// Better Auth still owns password hashing and credential-account creation here.
const provisioningAuth = betterAuth({
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 12
	},
	plugins: [adminPlugin()]
});

async function grantAdminProAccess(userId: string): Promise<void> {
	await db.update(user).set({ role: 'admin', emailVerified: true }).where(eq(user.id, userId));

	const now = new Date();
	await db
		.insert(proStatus)
		.values({
			id: randomUUID(),
			userId,
			cachedAt: now,
			expiration: new Date('2099-01-01')
		})
		.onConflictDoUpdate({
			target: proStatus.userId,
			set: {
				cachedAt: now,
				expiration: new Date('2099-01-01')
			}
		});
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

		await provisioningAuth.api.createUser({
			body: { name: args.username, email: args.email, password }
		});
		existing = await db.select().from(user).where(eq(user.email, args.email)).limit(1);
		created = true;
	}

	const adminUser = existing[0];
	if (!adminUser) throw new Error('Administrator record was not created');

	// Promotion is idempotent. Intentionally do not touch the password of an
	// existing account, and do not bypass Better Auth's verified 2FA enrollment.
	await grantAdminProAccess(adminUser.id);

	console.log(created ? 'Administrator created and promoted.' : 'Existing account promoted/confirmed as administrator.');
	console.log('TOTP is not pre-enabled. Sign in and complete the normal verified 2FA enrollment flow.');
}

try {
	await main();
} catch (error) {
	console.error(`Provisioning failed: ${error instanceof Error ? error.message : 'unknown error'}`);
	process.exitCode = 1;
} finally {
	await dbClient.end({ timeout: 5 });
}
