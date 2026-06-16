/**
 * Maps browser locale / country to a Dodo Payments currency for checkout.
 *
 * Usage (client-side):
 *   import { getCurrencyFromLocale } from '$lib/utils/locale-currency';
 *   const currency = getCurrencyFromLocale();
 *
 * Usage (server-side, if you already have a locale):
 *   import { localeToCurrency } from '$lib/utils/locale-currency';
 *   const currency = localeToCurrency('en-GB'); // 'GBP'
 */

import type { Currency } from 'dodopayments/resources';

/** EU / Eurozone country codes that map to EUR. */
const EU_CODES = new Set([
	'AT',
	'BE',
	'BG',
	'CY',
	'CZ',
	'DE',
	'DK',
	'EE',
	'ES',
	'FI',
	'FR',
	'GR',
	'HR',
	'HU',
	'IE',
	'IT',
	'LT',
	'LU',
	'LV',
	'MT',
	'NL',
	'PL',
	'PT',
	'RO',
	'SE',
	'SI',
	'SK'
]);

/**
 * Given a BCP 47 language tag (e.g. "en-GB", "fr-FR"), return the
 * Dodo Payments currency code that best matches that locale.
 */
export function localeToCurrency(locale?: string | null): Currency {
	if (!locale) return 'USD';

	const tag = locale.toLowerCase();
	const country = tag.includes('-') ? tag.split('-')[1].toUpperCase() : '';

	if (country === 'GB') return 'GBP';
	if (country === 'IN') return 'INR';
	if (EU_CODES.has(country)) return 'EUR';

	return 'USD';
}

/**
 * Convenience: read the browser's preferred locale and map to a currency.
 * Works in the browser only — returns 'USD' on the server.
 */
export function getCurrencyFromLocale(): Currency {
	if (typeof window === 'undefined') return 'USD';
	return localeToCurrency(navigator.language);
}

/**
 * 4 currencies we support: USD, EUR, GBP, INR.
 */
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR'] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/** Map currency to the slug suffix used in checkout. */
const CURRENCY_SLUG_SUFFIX: Record<SupportedCurrency, string> = {
	USD: 'usd',
	EUR: 'eur',
	GBP: 'gbp',
	INR: 'inr'
};

/** Build a slug like "ace_blocker_monthly_usd" */
export function makeSlug(billingPeriod: 'monthly' | 'yearly', currency: SupportedCurrency): string {
	return `ace_blocker_${billingPeriod}_${CURRENCY_SLUG_SUFFIX[currency]}`;
}

/** Product name used when creating Dodo products. */
export function makeProductName(
	billingPeriod: 'monthly' | 'yearly',
	currency: SupportedCurrency
): string {
	const periodName = billingPeriod === 'monthly' ? 'Monthly' : 'Yearly';
	return `Ace Blocker ${periodName} ${currency}`;
}
