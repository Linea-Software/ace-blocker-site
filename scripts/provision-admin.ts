#!/usr/bin/env bun

import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin as adminPlugin } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';
import { db, dbClient } from '../src/lib/server/db';
import * as schema from '../src/lib/server/db/schema';
import { proStatus, user } from '../src/lib/server/db/schema';
import {
	assertCompatibleBetterAuthProvisioningVersion,
	normalizeProvisioningAuthError,
	parseProvisionAdminArgs,
	readNewAdminPassword
} from './provision-admin-input';

const require = createRequire(import.meta.url);
const installedBetterAuthVersion = (require('better-auth/package.json') as { version: string })
	.version;

function formatError(error: unknown): string {
	const messages: string[] = [];
	let current: unknown = error;
	while (current instanceof Error) {
		if (current.message && !messages.includes(current.message)) messages.push(current.message);
		current = current.cause;
	}
	return messages.join(' -> ') || String(error);
}

// Keep this provisioning instance deliberately minimal. Importing the app's
// full auth.ts pulls in SvelteKit-only virtual modules such as $env/static/private,
// which plain `bun scripts/provision-admin.ts` cannot resolve on the VPS.
// Better Auth still owns password hashing and credential-account creation here.
const provisioningAuth = betterAuth({
	database: drizzleAdapter(db, { provider: 'pg', schema }),
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
	const args = parseProvisionAdminArgs(process.argv.slice(2));

	console.log(`Checking administrator account: ${args.email}`);
	let existing = await db.select().from(user).where(eq(user.email, args.email)).limit(1);
	let created = false;

	if (existing.length === 0) {
		assertCompatibleBetterAuthProvisioningVersion(installedBetterAuthVersion);
		const password = await readNewAdminPassword(args.passwordStdin);
		console.log('Creating administrator account with Better Auth...');

		try {
			await provisioningAuth.api.createUser({
				body: { name: args.username, email: args.email, password }
			});
		} catch (error) {
			throw normalizeProvisioningAuthError(error, installedBetterAuthVersion);
		}
		existing = await db.select().from(user).where(eq(user.email, args.email)).limit(1);
		created = true;
	}

	const adminUser = existing[0];
	if (!adminUser) throw new Error('Administrator record was not created');

	// Promotion is idempotent. Intentionally do not touch the password of an
	// existing account, and do not bypass Better Auth's verified 2FA enrollment.
	await grantAdminProAccess(adminUser.id);

	console.log(
		created
			? 'Administrator created and promoted.'
			: 'Existing account promoted/confirmed as administrator.'
	);
	console.log(
		'TOTP is not pre-enabled. Sign in and complete the normal verified 2FA enrollment flow.'
	);
}

try {
	await main();
} catch (error) {
	console.error(`Provisioning failed: ${formatError(error)}`);
	process.exitCode = 1;
} finally {
	await dbClient.end({ timeout: 5 });
}
