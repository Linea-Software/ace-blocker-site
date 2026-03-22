/**
 * We have an hardcoded price for each DodoPayments currency.
 * When a user buys a subscription, we check if the currency is supported by DodoPayments.
 * If it is, we search for that subscrition and use that one.
 * If it is not, we use the USD price.
 * 
 * On startup we ensure that there's a price for each currency.
 * Prices are part of individual products.
 */

import { dodoPayments } from "$lib/server/auth";
import type { Currency } from "dodopayments/resources";


export const MONTHLY_PRICE_MAP: Record<Currency, number> = {
    AED: 15,
    ALL: 399.00,
    AMD: 1599.00,
    ARS: 1499.00, // Reserving minimum of 1000
    AUD: 5.99,
    AWG: 7.49,
    AZN: 6.99,
    BAM: 7.49,
    BDT: 449.00,
    BMD: 3.99,
    BND: 5.49,
    BOB: 29.99,
    BRL: 9.99,
    BSD: 3.99,
    BWP: 59.00,
    BZD: 7.99,
    CAD: 5.49,
    CHF: 3.99,
    CLP: 1499.00, // Reserving minimum of 1000
    CNY: 29.99,
    CRC: 1999.00,
    CZK: 59.00,
    DKK: 27.99,
    DOP: 249.00,
    EGP: 69.99,
    ETB: 249.00,
    EUR: 3.99,
    FJD: 8.99,
    GBP: 3.99, // Adjusted for UK purchasing power parity
    GEL: 10.99,
    GMD: 299.00,
    GTQ: 34.99,
    GYD: 899.00,
    HKD: 31.99,
    HNL: 99.99,
    HUF: 899.00,
    IDR: 19900.00,
    ILS: 14.99,
    INR: 99.00,
    KZT: 1899.00,
    LKR: 1299.00,
    LRD: 800.00,
    LSL: 79.00,
    MAD: 39.99,
    MKD: 249.00,
    MOP: 34.99,
    MUR: 199.00,
    MVR: 64.99,
    MWK: 6900.00,
    MXN: 34.99,
    MYR: 7.99,
    NGN: 2099.00, // Reserving minimum of 2000
    NOK: 39.99,
    NPR: 549.00,
    NZD: 6.49,
    PEN: 5.99,
    PGK: 15.99,
    PHP: 69.00,
    PLN: 9.99,
    QAR: 14.99,
    RON: 11.49,
    RSD: 449.00,
    SAR: 14.99,
    SBD: 34.99,
    SCR: 59.00,
    SEK: 39.99,
    SGD: 5.49,
    SZL: 79.00,
    THB: 49.00,
    TOP: 9.99,
    TRY: 39.99,
    TWD: 129.00,
    TZS: 10900.00,
    USD: 3.99,
    UYU: 159.00,
    WST: 11.99,
    ZAR: 34.99,
    ZMW: 109.00,
    // Unsupported currencies
    ANG: 0,
    AOA: 0,
    BBD: 0,
    BGN: 0,
    BHD: 0,
    BIF: 0,
    BYN: 0,
    COP: 0,
    CUP: 0,
    CVE: 0,
    DJF: 0,
    DZD: 0,
    FKP: 0,
    GHS: 0,
    GIP: 0,
    GNF: 0,
    HRK: 0,
    HTG: 0,
    IQD: 0,
    JMD: 0,
    JOD: 0,
    JPY: 0,
    KES: 0,
    KGS: 0,
    KHR: 0,
    KMF: 0,
    KRW: 0,
    KWD: 0,
    KYD: 0,
    LAK: 0,
    LBP: 0,
    LYD: 0,
    MDL: 0,
    MGA: 0,
    MMK: 0,
    MNT: 0,
    MRU: 0,
    MZN: 0,
    NAD: 0,
    NIO: 0,
    OMR: 0,
    PAB: 0,
    PKR: 0,
    PYG: 0,
    RUB: 0,
    RWF: 0,
    SHP: 0,
    SLE: 0,
    SLL: 0,
    SOS: 0,
    SRD: 0,
    SSP: 0,
    STN: 0,
    SVC: 0,
    TND: 0,
    TTD: 0,
    UAH: 0,
    UGX: 0,
    UZS: 0,
    VES: 0,
    VND: 0,
    VUV: 0,
    XAF: 0,
    XCD: 0,
    XOF: 0,
    XPF: 0,
    YER: 0
}

export const YEARLY_PRICE_MAP: Record<Currency, number> = {
    AED: 99.99,
    ALL: 2499.00,
    AMD: 9999.00,
    ARS: 8999.00,
    AUD: 39.99,
    AWG: 49.99,
    AZN: 44.99,
    BAM: 49.99,
    BDT: 2999.00,
    BMD: 24.99,
    BND: 34.99,
    BOB: 199.00,
    BRL: 59.00,
    BSD: 24.99,
    BWP: 399.00,
    BZD: 49.99,
    CAD: 34.99,
    CHF: 24.99,
    CLP: 8999.00,
    CNY: 199.00,
    CRC: 12900.00,
    CZK: 349.00,
    DKK: 179.99,
    DOP: 1499.00,
    EGP: 399.00,
    ETB: 1499.00,
    EUR: 24.99,
    FJD: 59.99,
    GBP: 24.99,
    GEL: 69.99,
    GMD: 1999.00,
    GTQ: 199.00,
    GYD: 5999.00,
    HKD: 199.99,
    HNL: 649.00,
    HUF: 5499.00,
    IDR: 129000.00,
    ILS: 99.99,
    INR: 599.00,
    KZT: 11900.00,
    LKR: 7999.00,
    LRD: 5000.00,
    LSL: 499.00,
    MAD: 249.00,
    MKD: 1499.00,
    MOP: 199.00,
    MUR: 1299.00,
    MVR: 399.00,
    MWK: 44900.00,
    MXN: 199.00,
    MYR: 49.99,
    NGN: 12900.00,
    NOK: 249.00,
    NPR: 3499.00,
    NZD: 44.99,
    PEN: 34.99,
    PGK: 99.99,
    PHP: 399.00,
    PLN: 59.00,
    QAR: 99.99,
    RON: 69.99,
    RSD: 2999.00,
    SAR: 99.99,
    SBD: 199.00,
    SCR: 399.00,
    SEK: 249.00,
    SGD: 34.99,
    SZL: 499.00,
    THB: 299.00,
    TOP: 59.99,
    TRY: 249.00,
    TWD: 799.00,
    TZS: 39900.00,
    USD: 24.99,
    UYU: 999.00,
    WST: 74.99,
    ZAR: 199.00,
    ZMW: 699.00,
    // Unsupported currencies, we're keeping them at 0 so they don't get created
    ANG: 0,
    AOA: 0,
    BBD: 0,
    BGN: 0,
    BHD: 0,
    BIF: 0,
    BYN: 0,
    COP: 0,
    CUP: 0,
    CVE: 0,
    DJF: 0,
    DZD: 0,
    FKP: 0,
    GHS: 0,
    GIP: 0,
    GNF: 0,
    HRK: 0,
    HTG: 0,
    IQD: 0,
    JMD: 0,
    JOD: 0,
    JPY: 0,
    KES: 0,
    KGS: 0,
    KHR: 0,
    KMF: 0,
    KRW: 0,
    KWD: 0,
    KYD: 0,
    LAK: 0,
    LBP: 0,
    LYD: 0,
    MDL: 0,
    MGA: 0,
    MMK: 0,
    MNT: 0,
    MRU: 0,
    MZN: 0,
    NAD: 0,
    NIO: 0,
    OMR: 0,
    PAB: 0,
    PKR: 0,
    PYG: 0,
    RUB: 0,
    RWF: 0,
    SHP: 0,
    SLE: 0,
    SLL: 0,
    SOS: 0,
    SRD: 0,
    SSP: 0,
    STN: 0,
    SVC: 0,
    TND: 0,
    TTD: 0,
    UAH: 0,
    UGX: 0,
    UZS: 0,
    VES: 0,
    VND: 0,
    VUV: 0,
    XAF: 0,
    XCD: 0,
    XOF: 0,
    XPF: 0,
    YER: 0
}

// TODO: use metadata to set localized language for the producs, with metadata[lang] = "<lang>"
// TODO: create a map of localized names and descriptions for the producs
export async function seedPrices() {

    const existingProducs = await dodoPayments.products.list();

    const monthlyMissing = (Object.keys(MONTHLY_PRICE_MAP) as Currency[]).filter((currency) => {
        return !existingProducs.items.some((product) => product.currency === currency);
    });

    const yearlyMissing = (Object.keys(YEARLY_PRICE_MAP) as Currency[]).filter((currency) => {
        return !existingProducs.items.some((product) => product.currency === currency);
    });

    console.log("Monthly missing:", monthlyMissing);
    console.log("Yearly missing:", yearlyMissing);

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (const currency of monthlyMissing) {
        const price = MONTHLY_PRICE_MAP[currency];

        if (price === 0) {
            console.log("Skipping currency:", currency);
            continue;
        }

        // TODO: Name localization
        try {
            const result = await dodoPayments.products.create({
                name: `Ace Blocker Monthly ${currency}`,
                price: {
                    currency: currency,
                    discount: 0,
                    price: price,
                    purchasing_power_parity: false,
                    tax_inclusive: true,
                    type: "recurring_price",

                    // How much the subscription lasts
                    subscription_period_interval: "Year",
                    subscription_period_count: 20,

                    // How often the user is charged
                    payment_frequency_count: 1,
                    payment_frequency_interval: "Month",

                    trial_period_days: 14,

                },
                tax_category: "digital_products"
            });

            console.log("Created product:", result);
            await delay(500);
        } catch (error) {
            console.log(`Error creating product for ${currency}:`, error);
            return;
        }
    }

    for (const currency of yearlyMissing) {
        const price = YEARLY_PRICE_MAP[currency];

        if (price === 0) {
            console.log("Skipping currency:", currency);
            continue;
        }

        // TODO: Name localization
        try {
            const result = await dodoPayments.products.create({
                name: `Ace Blocker Yearly ${currency}`,
                price: {
                    currency: currency,
                    discount: 0,
                    price: price,
                    purchasing_power_parity: false,
                    tax_inclusive: true,
                    type: "recurring_price",

                    // How much the subscription lasts
                    subscription_period_interval: "Year",
                    subscription_period_count: 20,

                    // How often the user is charged
                    payment_frequency_count: 1,
                    payment_frequency_interval: "Year",

                    trial_period_days: 14,

                },
                tax_category: "digital_products"
            });
            console.log("Created product:", result);
            await delay(500);
        } catch (error) {
            console.log(`Error creating product for ${currency}:`, error);
            return;
        }

    }
}

