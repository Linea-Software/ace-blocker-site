/**
 * Currency selection and formatting for Ace Blocker subscriptions.
 * Use the verified reverse-proxy country signal for public prices, not language.
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
	'XK',
	'AX',
	'BL',
	'GF',
	'GP',
	'MF',
	'MQ',
	'PM',
	'RE',
	'YT',
	'TF'
]);

export function countryToCurrency(country?: string | null): SupportedCurrency {
	const code = country?.trim().toUpperCase();
	if (['GB', 'UK', 'GG', 'JE', 'IM', 'GS'].includes(code ?? '')) return 'GBP';
	if (code === 'IN') return 'INR';
	if (EURO_CODES.has(code ?? '')) return 'EUR';
	return 'USD';
}

export { timeZoneToCurrency } from './timezone-currency';
import { timeZoneToCurrency } from './timezone-currency';

/** Send only a currency hint, not the browser's location or time zone. */
export function browserCurrencyHint(): SupportedCurrency {
	try {
		return timeZoneToCurrency(Intl.DateTimeFormat().resolvedOptions().timeZone);
	} catch {
		return 'USD';
	}
}

function supportedCurrency(value: unknown): SupportedCurrency | undefined {
	return SUPPORTED_CURRENCIES.find((currency) => currency === value);
}

/**
 * Explicit selections win to preserve the advertised checkout price.
 * Otherwise use the sanitized edge country, then the browser's untrusted
 * currency hint when the edge provides no location (e.g. localhost).
 * A hint selects only an existing regional product; it is not verified location.
 */
export function requestCurrency(
	headers: Headers,
	browserHint: unknown = '',
	explicitCurrency: unknown = ''
): SupportedCurrency {
	const explicit = supportedCurrency(explicitCurrency);
	if (explicit) return explicit;
	const country = headers.get('x-ace-visitor-country')?.toUpperCase();
	if (country && /^[A-Z]{2}$/.test(country) && country !== 'XX' && country !== 'ZZ')
		return countryToCurrency(country);
	return supportedCurrency(browserHint) ?? 'USD';
}

/** Display currency symbols before numbers while preserving decimal separators. */
export function formatCurrency(
	amountMinor: number,
	currency: SupportedCurrency,
	compactWhole = false
): string {
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
	const digits = (compactWhole || currency === 'INR') && amountMinor % 100 === 0 ? 0 : 2;
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
