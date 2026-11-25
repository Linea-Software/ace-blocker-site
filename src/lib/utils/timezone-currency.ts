import type { SupportedCurrency } from './locale-currency';

/**
 * Supported subset of DePay's local-currency timezone table, updated for
 * current euro members and browser aliases. See THIRD_PARTY_NOTICES.md.
 * A time zone is a hint, not evidence of residence or billing address.
 */
const regionalCurrencies: ReadonlyMap<string, SupportedCurrency> = new Map([
	['Africa/Ceuta', 'EUR'],
	['America/Cayenne', 'EUR'],
	['America/Guadeloupe', 'EUR'],
	['America/Marigot', 'EUR'],
	['America/Martinique', 'EUR'],
	['America/Miquelon', 'EUR'],
	['America/St_Barthelemy', 'EUR'],
	['Asia/Nicosia', 'EUR'],
	['Atlantic/Azores', 'EUR'],
	['Atlantic/Canary', 'EUR'],
	['Atlantic/Madeira', 'EUR'],
	['Europe/Amsterdam', 'EUR'],
	['Europe/Andorra', 'EUR'],
	['Europe/Athens', 'EUR'],
	['Europe/Berlin', 'EUR'],
	['Europe/Bratislava', 'EUR'],
	['Europe/Brussels', 'EUR'],
	['Europe/Busingen', 'EUR'],
	['Europe/Dublin', 'EUR'],
	['Europe/Helsinki', 'EUR'],
	['Europe/Lisbon', 'EUR'],
	['Europe/Ljubljana', 'EUR'],
	['Europe/Luxembourg', 'EUR'],
	['Europe/Madrid', 'EUR'],
	['Europe/Malta', 'EUR'],
	['Europe/Mariehamn', 'EUR'],
	['Europe/Monaco', 'EUR'],
	['Europe/Nicosia', 'EUR'],
	['Europe/Paris', 'EUR'],
	['Europe/Podgorica', 'EUR'],
	['Europe/Riga', 'EUR'],
	['Europe/Rome', 'EUR'],
	['Europe/San_Marino', 'EUR'],
	['Europe/Sofia', 'EUR'],
	['Europe/Tallinn', 'EUR'],
	['Europe/Vatican', 'EUR'],
	['Europe/Vienna', 'EUR'],
	['Europe/Vilnius', 'EUR'],
	['Europe/Zagreb', 'EUR'],
	['Indian/Kerguelen', 'EUR'],
	['Indian/Mayotte', 'EUR'],
	['Indian/Reunion', 'EUR'],
	['Atlantic/South_Georgia', 'GBP'],
	['Europe/Belfast', 'GBP'],
	['Europe/Guernsey', 'GBP'],
	['Europe/Isle_of_Man', 'GBP'],
	['Europe/Jersey', 'GBP'],
	['Europe/London', 'GBP'],
	['GB', 'GBP'],
	['GB-Eire', 'GBP'],
	['Asia/Calcutta', 'INR'],
	['Asia/Kolkata', 'INR']
]);

/** Unsupported or unknown currencies fall back to the existing USD product. */
export function timeZoneToCurrency(timeZone: string): SupportedCurrency {
	return regionalCurrencies.get(timeZone) ?? 'USD';
}
