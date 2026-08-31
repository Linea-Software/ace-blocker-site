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

const log = createLogger('seeder:prices');

const BILLING_PERIODS = ['monthly', 'yearly'] as const;

export async function seedPrices() {
	// Fetch all existing products from Dodo
	const existing = await dodoPayments.products.list();
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
				registerProduct(period, currency, existingProduct.product_id);
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
					registerProduct(period, currency, result.product_id);
				} catch (err) {
					log.error({ err, name }, 'Failed to create product');
				}
			}
		}
	}

	log.info(`done — ${productCount()} products registered`);
}
