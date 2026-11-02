/**
 * Hardcoded prices per currency for Dodo Payments subscription products.
 * Prices are in the smallest currency denomination:
 *   USD/EUR/GBP → cents   INR → paise
 */

import type { Currency } from 'dodopayments/resources';

export const MONTHLY_PRICE_MAP: Record<string, number> = {
	USD: 399, // $3.99
	EUR: 399, // €3.99
	GBP: 399, // £3.99
	INR: 9900 // ₹99.00
};

export const YEARLY_PRICE_MAP: Record<string, number> = {
	USD: 2499, // $24.99
	EUR: 2499, // €24.99
	GBP: 2499, // £24.99
	INR: 59900 // ₹599.00
};
