/**
 * In-memory registry of Dodo Payments products, populated by the seeder
 * on startup. Maps currency + billing period → { productId, slug }.
 *
 * Also exports `dodoProducts` as a mutable array that Better Auth's
 * checkout plugin holds a reference to — the seeder fills it before
 * any HTTP requests arrive.
 */

import type { Currency } from 'dodopayments/resources';
import { makeSlug, type SupportedCurrency } from '$lib/utils/locale-currency';
import type { Product } from '@dodopayments/better-auth';

export type DodoProduct = {
	productId: string;
	slug: string;
	priceMinor?: number;
	trialDays: number;
};

/** All products keyed by "monthly:USD" / "yearly:GBP" etc. */
const products = new Map<string, DodoProduct>();

/** Mutable array the Better Auth checkout plugin holds a reference to. */
export const dodoProducts: Product[] = [];

export function registerProduct(
	billingPeriod: 'monthly' | 'yearly',
	currency: SupportedCurrency,
	productId: string,
	priceMinor?: number,
	trialDays = 0
): void {
	const slug = makeSlug(billingPeriod, currency);
	const entry = { productId, slug, priceMinor, trialDays };
	products.set(`${billingPeriod}:${currency}`, entry);
	dodoProducts.push(entry);
}

export function getProduct(
	billingPeriod: 'monthly' | 'yearly',
	currency: Currency
): DodoProduct | undefined {
	return products.get(`${billingPeriod}:${currency}`);
}

export function getProductBySlug(slug: string): DodoProduct | undefined {
	for (const p of products.values()) {
		if (p.slug === slug) return p;
	}
	return undefined;
}

/** All registered products for the checkout plugin. */
export function getAllProducts(): DodoProduct[] {
	return [...products.values()];
}

/** How many products have been registered. */
export function productCount(): number {
	return products.size;
}
