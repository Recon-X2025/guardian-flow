/**
 * @file server/services/currency.js
 * @description Currency exchange rate service with static seed rates.
 * Base currency is GBP. Rates are updated periodically by operations.
 */

// Static seed rates — base: GBP
const RATES = {
  GBP: 1,
  USD: 1.27,
  EUR: 1.17,
  JPY: 190.5,
  CAD: 1.73,
  AUD: 1.93,
};

/**
 * Convert an amount from one currency to another.
 * @param {number} amount
 * @param {string} from - source currency code
 * @param {string} to - target currency code
 * @returns {number}
 */
export function convertAmount(amount, from, to) {
  const fromRate = RATES[from?.toUpperCase()];
  const toRate = RATES[to?.toUpperCase()];
  if (fromRate === undefined) throw new Error(`Unsupported currency: ${from}`);
  if (toRate === undefined) throw new Error(`Unsupported currency: ${to}`);
  const inGBP = amount / fromRate;
  return inGBP * toRate;
}

/**
 * Return exchange rates relative to a given base currency.
 * @param {string} base - base currency code (default: GBP)
 * @returns {Record<string, number>}
 */
export function getExchangeRates(base = 'GBP') {
  const baseRate = RATES[base?.toUpperCase()];
  if (baseRate === undefined) throw new Error(`Unsupported base currency: ${base}`);
  const result = {};
  for (const [ccy, rate] of Object.entries(RATES)) {
    result[ccy] = rate / baseRate;
  }
  return result;
}

/**
 * Return all supported currency codes.
 * @returns {string[]}
 */
export function getSupportedCurrencies() {
  return Object.keys(RATES);
}
