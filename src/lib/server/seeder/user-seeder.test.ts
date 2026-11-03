import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createUser, selectQueue, updateSet, updateWhere, updateProExpiration } = vi.hoisted(() => ({
	createUser: vi.fn(),
	selectQueue: [] as unknown[][],
	updateSet: vi.fn(),
	updateWhere: vi.fn(),
	updateProExpiration: vi.fn()
}));

vi.mock('$app/environment', () => ({ dev: true }));

vi.mock('$lib/server/auth', () => ({
	auth: {
		api: {
			createUser
		}
	}
}));

vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn(() => {
			const chain = {
				from: vi.fn(),
				where: vi.fn(),
				limit: vi.fn()
			};
			chain.from.mockReturnValue(chain);
			chain.where.mockReturnValue(chain);
			chain.limit.mockImplementation(() => Promise.resolve(selectQueue.shift() ?? []));
			return chain;
		}),
		update: vi.fn(() => {
			const whereChain = {
				where: updateWhere
			};
			updateSet.mockReturnValue(whereChain);
			return {
				set: updateSet
			};
		})
	}
}));

vi.mock('$lib/server/pro', () => ({
	updateProExpiration
}));

vi.mock('$lib/server/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn()
	})
}));

import { seedDatabase } from './user-seeder';

function queueExistingNonAdminFixtures() {
	selectQueue.push(
		[{ id: 'pro-id', email: 'delivered+pro@resend.dev' }],
		[{ id: 'free-1' }],
		[{ id: 'free-2' }],
		[{ id: 'free-3' }],
		[{ id: 'free-4' }],
		[{ id: 'free-5' }]
	);
}

const originalEnvironment = { ...process.env };

afterEach(() => {
	for (const key of [
		'DATABASE_URL',
		'NODE_ENV',
		'DEFAULT_ADMIN_EMAIL',
		'DEFAULT_ADMIN_USERNAME',
		'DEFAULT_ADMIN_PASSWORD'
	] as const) {
		if (originalEnvironment[key] === undefined) delete process.env[key];
		else process.env[key] = originalEnvironment[key];
	}
});

describe('development user seeder', () => {
	beforeEach(() => {
		process.env.NODE_ENV = 'development';
		process.env.DATABASE_URL = 'postgresql://postgres@localhost:5432/aceblocker';
		vi.clearAllMocks();
		selectQueue.length = 0;
		process.env.DEFAULT_ADMIN_EMAIL = 'Admin@Example.com';
		process.env.DEFAULT_ADMIN_USERNAME = 'Admin';
		process.env.DEFAULT_ADMIN_PASSWORD = 'x'.repeat(16);
		updateWhere.mockResolvedValue(undefined);
		updateProExpiration.mockResolvedValue(undefined);
		createUser.mockResolvedValue(undefined);
	});

	it('creates and promotes the configured development admin when it is missing', async () => {
		selectQueue.push([], [{ id: 'admin-id', email: 'admin@example.com' }]);
		queueExistingNonAdminFixtures();

		await seedDatabase();

		expect(createUser).toHaveBeenCalledTimes(1);
		expect(createUser).toHaveBeenCalledWith({
			body: {
				name: 'Admin',
				email: 'admin@example.com',
				password: 'x'.repeat(16)
			}
		});
		expect(updateSet).toHaveBeenCalledWith({
			role: 'admin',
			emailVerified: true
		});
		expect(updateProExpiration).toHaveBeenCalledWith(
			'admin@example.com',
			new Date('2099-01-01')
		);
	});

	it('uses the default development admin when .env has no admin credentials', async () => {
		delete process.env.DEFAULT_ADMIN_EMAIL;
		delete process.env.DEFAULT_ADMIN_USERNAME;
		delete process.env.DEFAULT_ADMIN_PASSWORD;
		selectQueue.push([], [{ id: 'dev-id', email: 'dev@example.com' }]);
		queueExistingNonAdminFixtures();

		await seedDatabase();

		expect(createUser).toHaveBeenCalledWith({
			body: { name: 'Admin', email: 'dev@example.com', password: 'dev-password' }
		});
		expect(updateSet).toHaveBeenCalledWith({ role: 'admin', emailVerified: true });
	});

	it('refuses to seed any user accounts into a nonlocal database', async () => {
		process.env.DATABASE_URL = 'postgresql://postgres@db.example.com:5432/aceblocker';
		await expect(seedDatabase()).rejects.toThrow(/\[ACE DEV SEED ERROR\]/);
		expect(createUser).not.toHaveBeenCalled();
		expect(updateSet).not.toHaveBeenCalled();
	});

	it('never creates a custom admin with the default password', async () => {
		process.env.DEFAULT_ADMIN_EMAIL = 'real@example.com';
		delete process.env.DEFAULT_ADMIN_PASSWORD;
		await expect(seedDatabase()).rejects.toThrow(/custom DEFAULT_ADMIN_PASSWORD/);
		expect(createUser).not.toHaveBeenCalled();
	});

	it('re-promotes an existing configured development admin without resetting its password', async () => {
		selectQueue.push([{ id: 'admin-id', email: 'admin@example.com', role: 'user' }]);
		queueExistingNonAdminFixtures();

		await seedDatabase();

		expect(createUser).not.toHaveBeenCalled();
		expect(updateSet).toHaveBeenCalledWith({
			role: 'admin',
			emailVerified: true
		});
		expect(updateProExpiration).toHaveBeenCalledWith(
			'admin@example.com',
			new Date('2099-01-01')
		);
	});
});
