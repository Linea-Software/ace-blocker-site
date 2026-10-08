/**
 * Currency selection and formatting for Ace Blocker subscriptions.
 * Use the verified Cloudflare country signal for public prices, not language.
 */
import type { Currency } from 'dodopayments/resources';

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/** Euro-area countries in 2026 plus jurisdictions using the euro. */
const EURO_CODES = new Set([
	'AD',
	'AT',
	'BE',
	'BG',
	'CY',
	'DE',
	'EE',
	'ES',
	'FI',
	'FR',
	'GR',
	'HR',
	'IE',
	'IT',
	'LT',
	'LU',
	'LV',
	'MC',
	'ME',
	'MT',
	'NL',
	'PT',
	'SI',
	'SK',
	'SM',
	'VA',
	'XK'
]);

export function countryToCurrency(country?: string | null): SupportedCurrency {
	const code = country?.trim().toUpperCase();
	if (code === 'GB' || code === 'UK') return 'GBP';
	if (code === 'IN') return 'INR';
	if (EURO_CODES.has(code ?? '')) return 'EUR';
	return 'USD';
}

/**
 * CF-IPCountry is authoritative only when forwarded by the configured trusted
 * Cloudflare/Nginx proxy. Missing or invalid geolocation defaults to USD.
 */
export function requestCurrency(headers: Headers): SupportedCurrency {
	const country = headers.get('cf-ipcountry');
	return country && /^[A-Z]{2}$/i.test(country) ? countryToCurrency(country) : 'USD';
}

/** Display currency symbols before numbers while preserving decimal separators. */
export function formatCurrency(amountMinor: number, currency: SupportedCurrency): string {
	const symbols: Record<SupportedCurrency, string> = {
		USD: '$',
		EUR: '€',
		GBP: '£',
		INR: '₹'
	};
	const locales: Record<SupportedCurrency, string> = {
		USD: 'en-US',
		EUR: 'it-IT',
		GBP: 'en-GB',
		INR: 'en-IN'
	};
	const digits = currency === 'INR' && amountMinor % 100 === 0 ? 0 : 2;
	const number = new Intl.NumberFormat(locales[currency], {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
	}).format(amountMinor / 100);
	return symbols[currency] + number;
}

/** Legacy locale mapping for non-billing use. Never use for visitor pricing. */
export function localeToCurrency(locale?: string | null): Currency {
	if (!locale) return 'USD';
	const tag = locale.toLowerCase();
	const country = tag.includes('-') ? tag.split('-')[1].toUpperCase() : '';
	return countryToCurrency(country);
}

/** Legacy client-side locale helper, not suitable for checkout selection. */
export function getCurrencyFromLocale(): Currency {
	if (typeof window === 'undefined') return 'USD';
	return localeToCurrency(navigator.language);
}

const CURRENCY_SLUG_SUFFIX: Record<SupportedCurrency, string> = {
	USD: 'usd',
	EUR: 'eur',
	GBP: 'gbp',
	INR: 'inr'
};

export function makeSlug(billingPeriod: 'monthly' | 'yearly', currency: SupportedCurrency): string {
	return `ace_blocker_${billingPeriod}_${CURRENCY_SLUG_SUFFIX[currency]}`;
}

export function makeProductName(
	billingPeriod: 'monthly' | 'yearly',
	currency: SupportedCurrency
): string {
	const periodName = billingPeriod === 'monthly' ? 'Monthly' : 'Yearly';
	return `Ace Blocker ${periodName} ${currency}`;
}
