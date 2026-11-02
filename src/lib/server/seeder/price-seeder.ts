/**
 * On startup, ensures the 8 Dodo Payments subscription products exist
 * (4 currencies × 2 billing periods). Lists existing products, matches
 * by name, and only creates missing ones.
 */

import { dodoPayments } from '$lib/server/auth';
import {
	makeProductName,
	makeSlug,
	SUPPORTED_CURRENCIES,
	type SupportedCurrency
} from '$lib/utils/locale-currency';
import { registerProduct, productCount } from '$lib/server/products';
import { MONTHLY_PRICE_MAP, YEARLY_PRICE_MAP } from '$lib/server/seeder/price-maps';
import { createLogger } from '$lib/server/logger';
import { isProduction } from '$lib/env';

const log = createLogger('seeder:prices');

const BILLING_PERIODS = ['monthly', 'yearly'] as const;

export async function seedPrices() {
	if (!process.env.DODO_PAYMENTS_API_KEY?.trim()) {
		if (isProduction()) {
			throw new Error('DODO_PAYMENTS_API_KEY is required for production price seeding');
		}
		log.warn('Dodo Payments is disabled in development: DODO_PAYMENTS_API_KEY is missing');
		return;
	}

	// An invalid test-mode key (401) or an offline payment API must not prevent
	// the development server from starting. Keep production fail-closed.
	let existing: Awaited<ReturnType<typeof dodoPayments.products.list>>;
	try {
		existing = await dodoPayments.products.list();
	} catch (error) {
		if (isProduction()) throw error;
		log.warn(
			'Dodo Payments price synchronization unavailable in development; check DODO_PAYMENTS_API_KEY and its test-mode permissions'
		);
		return;
	}
	const existingNames = new Map(existing.items.map((p) => [p.name, p]));

	log.info(`found ${existing.items.length} existing products`);

	for (const period of BILLING_PERIODS) {
		for (const currency of SUPPORTED_CURRENCIES) {
			const name = makeProductName(period, currency);
			const priceMap = period === 'monthly' ? MONTHLY_PRICE_MAP : YEARLY_PRICE_MAP;
			const priceAmount = priceMap[currency];

			if (!priceAmount || priceAmount === 0) {
				log.info(`skipping ${name} — no price configured`);
				continue;
			}

			const existingProduct = existingNames.get(name);

			if (existingProduct) {
				log.info(`found existing: ${name} (${existingProduct.product_id})`);
				// Existing Dodo products may differ from seeding defaults. Use their
				// actual recurring price and trial settings for truthful UI copy.
				const detail = existingProduct.price_detail;
				if (
					detail?.type !== 'recurring_price' ||
					detail.currency !== currency ||
					!detail.tax_inclusive
				) {
					log.error(
						{ name, productId: existingProduct.product_id },
						'Dodo product currency or tax mode does not match catalog'
					);
					continue;
				}
				registerProduct(
					period,
					currency,
					existingProduct.product_id,
					detail?.type === 'recurring_price'
						? detail.price
						: (existingProduct.price ?? undefined),
					detail?.type === 'recurring_price' && !detail.trial_amount
						? (detail.trial_period_days ?? 0)
						: 0
				);
			} else {
				log.info(`creating: ${name} at ${priceAmount} ${currency}...`);
				try {
					const result = await dodoPayments.products.create({
						name,
						price: {
							currency,
							discount: 0,
							price: priceAmount,
							purchasing_power_parity: false,
							tax_inclusive: true,
							type: 'recurring_price',

							subscription_period_interval: period === 'monthly' ? 'Month' : 'Year',
							subscription_period_count: period === 'monthly' ? 1 : 1,

							payment_frequency_count: 1,
							payment_frequency_interval: period === 'monthly' ? 'Month' : 'Year',

							trial_period_days: 14
						},
						tax_category: 'digital_products'
					});
					log.info(`created: ${name} → ${result.product_id}`);
					registerProduct(period, currency, result.product_id, priceAmount, 14);
				} catch (err) {
					log.error({ err, name }, 'Failed to create product');
				}
			}
		}
	}

	log.info(`done — ${productCount()} products registered`);
}
