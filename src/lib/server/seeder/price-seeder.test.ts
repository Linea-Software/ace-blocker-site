import { afterEach, describe, expect, it, vi } from 'vitest';

const productsList = vi.hoisted(() => vi.fn());
vi.mock('$lib/server/auth', () => ({
	dodoPayments: { products: { list: productsList } }
}));
vi.mock('$lib/server/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	})
}));

import { seedPrices } from './price-seeder';

const originalNodeEnv = process.env.NODE_ENV;
const originalDodoKey = process.env.DODO_PAYMENTS_API_KEY;

afterEach(() => {
	if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
	else process.env.NODE_ENV = originalNodeEnv;
	if (originalDodoKey === undefined) delete process.env.DODO_PAYMENTS_API_KEY;
	else process.env.DODO_PAYMENTS_API_KEY = originalDodoKey;
	vi.clearAllMocks();
});

describe('Dodo price seeding without a provider key', () => {
	it('skips external API calls during development', async () => {
		process.env.NODE_ENV = 'development';
		delete process.env.DODO_PAYMENTS_API_KEY;

		await expect(seedPrices()).resolves.toBeUndefined();
		expect(productsList).not.toHaveBeenCalled();
	});

	it('does not relax the missing-key requirement in production', async () => {
		process.env.NODE_ENV = 'production';
		delete process.env.DODO_PAYMENTS_API_KEY;

		await expect(seedPrices()).rejects.toThrow(/DODO_PAYMENTS_API_KEY/);
		expect(productsList).not.toHaveBeenCalled();
	});
});
