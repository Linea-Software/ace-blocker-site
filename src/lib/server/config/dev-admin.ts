/**
 * Development-only admin fixtures. Never use these credentials or bootstrap
 * behavior in production; production uses scripts/provision-admin.ts.
 */
export const DEFAULT_DEVELOPMENT_ADMIN = {
	email: 'dev@example.com',
	username: 'Admin',
	password: 'dev-password'
} as const;

const LOCAL_DATABASE_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function assertLocalDevelopmentDatabase(environment: NodeJS.ProcessEnv = process.env): void {
	let local = false;

	if (environment.NODE_ENV !== 'production' && environment.DATABASE_URL) {
		try {
			const url = new URL(environment.DATABASE_URL);
			local =
				['postgres:', 'postgresql:'].includes(url.protocol) &&
				LOCAL_DATABASE_HOSTS.has(url.hostname) &&
				url.pathname.length > 1;
		} catch {
			// Invalid database URLs are never considered local.
		}
	}

	if (!local) {
		throw new Error(
			'[ACE DEV SEED ERROR] Refusing to create development users: DATABASE_URL must target a local PostgreSQL database (localhost, 127.0.0.1 or ::1), and NODE_ENV must not be production.'
		);
	}
}

export function resolveDevelopmentAdmin(environment: NodeJS.ProcessEnv = process.env): {
	email: string;
	username: string;
	password: string;
} {
	const email =
		environment.DEFAULT_ADMIN_EMAIL?.trim().toLowerCase() || DEFAULT_DEVELOPMENT_ADMIN.email;
	const username =
		environment.DEFAULT_ADMIN_USERNAME?.trim() || DEFAULT_DEVELOPMENT_ADMIN.username;
	const password =
		environment.DEFAULT_ADMIN_PASSWORD?.trim() || DEFAULT_DEVELOPMENT_ADMIN.password;

	if (
		email !== DEFAULT_DEVELOPMENT_ADMIN.email &&
		password === DEFAULT_DEVELOPMENT_ADMIN.password
	) {
		throw new Error(
			'[ACE DEV SEED ERROR] A custom DEFAULT_ADMIN_EMAIL requires a custom DEFAULT_ADMIN_PASSWORD; never use the known development password for a custom administrator.'
		);
	}
	if (password.length < 12) {
		throw new Error(
			'[ACE DEV SEED ERROR] DEFAULT_ADMIN_PASSWORD must contain at least 12 characters.'
		);
	}

	return { email, username, password };
}
