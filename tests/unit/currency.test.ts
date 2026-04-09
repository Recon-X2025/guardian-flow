/**
 * @file tests/unit/currency.test.ts
 * @description Unit tests for the currency service — convertAmount() and getExchangeRates().
 */

import { describe, it, expect } from 'vitest';
import { convertAmount, getExchangeRates, getSupportedCurrencies } from '../../server/services/currency.js';

describe('convertAmount()', () => {
  it('returns the same amount when from === to', () => {
    expect(convertAmount(100, 'GBP', 'GBP')).toBeCloseTo(100, 4);
  });

  it('converts GBP → USD using seeded rate', () => {
    // 100 GBP → 100 * 1.27 USD
    expect(convertAmount(100, 'GBP', 'USD')).toBeCloseTo(127, 2);
  });

  it('converts USD → GBP correctly', () => {
    // 127 USD → 127 / 1.27 = 100 GBP
    expect(convertAmount(127, 'USD', 'GBP')).toBeCloseTo(100, 2);
  });

  it('converts USD → EUR via GBP base', () => {
    // 127 USD → 100 GBP → 117 EUR
    expect(convertAmount(127, 'USD', 'EUR')).toBeCloseTo(117, 1);
  });

  it('handles zero amount', () => {
    expect(convertAmount(0, 'USD', 'EUR')).toBe(0);
  });

  it('handles negative amounts', () => {
    const result = convertAmount(-100, 'GBP', 'USD');
    expect(result).toBeCloseTo(-127, 2);
  });

  it('is case-insensitive for currency codes', () => {
    expect(convertAmount(100, 'gbp', 'usd')).toBeCloseTo(convertAmount(100, 'GBP', 'USD'), 4);
  });

  it('throws for unsupported from currency', () => {
    expect(() => convertAmount(100, 'XYZ', 'GBP')).toThrow('Unsupported currency: XYZ');
  });

  it('throws for unsupported to currency', () => {
    expect(() => convertAmount(100, 'GBP', 'XYZ')).toThrow('Unsupported currency: XYZ');
  });
});

describe('getExchangeRates()', () => {
  it('returns GBP rate of 1 when base is GBP', () => {
    const rates = getExchangeRates('GBP');
    expect(rates.GBP).toBe(1);
  });

  it('returns all supported currencies', () => {
    const rates = getExchangeRates('GBP');
    const supported = getSupportedCurrencies();
    for (const ccy of supported) {
      expect(rates).toHaveProperty(ccy);
    }
  });

  it('returns USD rate > 1 relative to GBP', () => {
    const rates = getExchangeRates('GBP');
    expect(rates.USD).toBeGreaterThan(1);
  });

  it('returns base rate of 1 for any base currency', () => {
    const rates = getExchangeRates('USD');
    expect(rates.USD).toBeCloseTo(1, 4);
  });

  it('recalculates rates relative to a non-GBP base', () => {
    const gbpRates = getExchangeRates('GBP');
    const usdRates = getExchangeRates('USD');
    // GBP rate in USD terms should be the inverse of USD rate in GBP terms
    expect(usdRates.GBP).toBeCloseTo(1 / gbpRates.USD, 4);
  });

  it('is case-insensitive', () => {
    const upper = getExchangeRates('USD');
    const lower = getExchangeRates('usd');
    expect(upper).toEqual(lower);
  });

  it('throws for unsupported base currency', () => {
    expect(() => getExchangeRates('XYZ')).toThrow('Unsupported base currency: XYZ');
  });
});
