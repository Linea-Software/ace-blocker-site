export type CurrencyCode =
    | 'USD' | 'EUR' | 'GBP' | 'CHF' | 'CAD' | 'AUD'
    | 'BRL' | 'INR' | 'JPY' | 'MXN' | 'TRY' | 'ZAR';

export interface RegionalPrice {
    currency: CurrencyCode;
    symbol: string;
    monthly: number;
    yearly: number;
    isPppDiscounted: boolean;
}

// A Map containing our localized pricing strategies
export const regionalPricing = new Map<CurrencyCode, RegionalPrice>([
    // --- Tier 1: Base & High Strength Currencies (Matched to $24.99 / $2.99) ---
    ['USD', { currency: 'USD', symbol: '$', monthly: 2.99, yearly: 24.99, isPppDiscounted: false }],
    ['EUR', { currency: 'EUR', symbol: '€', monthly: 2.99, yearly: 24.99, isPppDiscounted: false }],
    ['GBP', { currency: 'GBP', symbol: '£', monthly: 2.99, yearly: 24.99, isPppDiscounted: false }],
    ['CHF', { currency: 'CHF', symbol: 'CHF', monthly: 2.99, yearly: 24.99, isPppDiscounted: false }],

    // --- Tier 2: Medium Strength (Slight numerical bumps to account for exchange rate) ---
    ['CAD', { currency: 'CAD', symbol: 'C$', monthly: 3.99, yearly: 34.99, isPppDiscounted: false }],
    ['AUD', { currency: 'AUD', symbol: 'A$', monthly: 3.99, yearly: 34.99, isPppDiscounted: false }],

    // --- Tier 3: Emerging Markets (Aggressive PPP Discounts with localized appealing numbers) ---
    // Brazil (~50% PPP). Brazilians typically prefer prices ending in .90 over .99
    ['BRL', { currency: 'BRL', symbol: 'R$', monthly: 9.90, yearly: 79.90, isPppDiscounted: true }],

    // India (~30-40% PPP). Flat 99s are standard for Indian SaaS.
    ['INR', { currency: 'INR', symbol: '₹', monthly: 99.00, yearly: 899.00, isPppDiscounted: true }],

    // Japan. Yen does not use decimals. Numbers ending in 80 are common for subscriptions.
    ['JPY', { currency: 'JPY', symbol: '¥', monthly: 380, yearly: 3480, isPppDiscounted: true }],

    // Mexico (~50% PPP). 
    ['MXN', { currency: 'MXN', symbol: '$', monthly: 49.00, yearly: 399.00, isPppDiscounted: true }],

    // Turkey (Aggressive PPP due to historical inflation). 
    ['TRY', { currency: 'TRY', symbol: '₺', monthly: 49.99, yearly: 499.99, isPppDiscounted: true }],

    // South Africa.
    ['ZAR', { currency: 'ZAR', symbol: 'R', monthly: 29.99, yearly: 249.99, isPppDiscounted: true }],
]);

/**
 * Utility to safely get pricing, falling back to USD if the user's currency is not mapped.
 */
export function getPriceForCurrency(currencyCode: string): RegionalPrice {
    return regionalPricing.get(currencyCode as CurrencyCode) || regionalPricing.get('USD')!;
}