/**
 * @file tests/unit/rul-model.test.js
 * @description Unit tests for RUL (Remaining Useful Life) model — Sprint 41.
 *
 * Tests fitExponentialDecay and estimateRUL without a server or DB.
 */

import { describe, it, expect } from 'vitest';
import { fitExponentialDecay, estimateRUL } from '../../server/services/ai/rul-model.js';

// Generate synthetic exponential decay data: y = a * exp(-b * t)
function generateDecay(a, b, nDays, noise = 0) {
  const t0 = new Date('2024-01-01T00:00:00Z').getTime();
  return Array.from({ length: nDays }, (_, i) => {
    const t = i;
    const value = a * Math.exp(-b * t) + (noise ? (Math.random() - 0.5) * noise : 0);
    return {
      value: Math.max(0.01, value),
      timestamp: new Date(t0 + i * 86400000).toISOString(),
    };
  });
}

describe('fitExponentialDecay', () => {
  it('fits y = 100 * exp(-0.02 * t) with b within 10% of 0.02', () => {
    const readings = generateDecay(100, 0.02, 60);
    const { a, b, r2 } = fitExponentialDecay(readings);

    expect(b).toBeCloseTo(0.02, 1);
    expect(Math.abs(b - 0.02) / 0.02).toBeLessThan(0.1);
    expect(a).toBeGreaterThan(80);
    expect(r2).toBeGreaterThan(0.99);
  });

  it('returns r2 = 1 for perfect exponential data (no noise)', () => {
    const readings = generateDecay(200, 0.05, 30);
    const { r2 } = fitExponentialDecay(readings);
    expect(r2).toBeGreaterThan(0.999);
  });

  it('returns lower r2 for noisy data', () => {
    const clean = generateDecay(100, 0.02, 60);
    const noisy = generateDecay(100, 0.02, 60, 5);

    const { r2: cleanR2 } = fitExponentialDecay(clean);
    const { r2: noisyR2 } = fitExponentialDecay(noisy);

    expect(cleanR2).toBeGreaterThan(noisyR2);
    expect(cleanR2).toBeGreaterThan(0.99);
  });

  it('handles constant data gracefully', () => {
    const readings = Array.from({ length: 10 }, (_, i) => ({
      value: 50,
      timestamp: new Date(Date.now() + i * 86400000).toISOString(),
    }));
    const { r2 } = fitExponentialDecay(readings);
    expect(r2).toBeGreaterThanOrEqual(0);
  });

  it('returns zero fit for fewer than 2 readings', () => {
    const { a, b, r2 } = fitExponentialDecay([{ value: 100, timestamp: new Date().toISOString() }]);
    expect(r2).toBe(0);
  });
});

describe('estimateRUL', () => {
  it('returns a finite positive RUL for data trending to zero', () => {
    const readings = generateDecay(100, 0.05, 60);
    const failureThreshold = 5;
    const { estimatedRULDays, confidence } = estimateRUL(readings, failureThreshold);

    expect(estimatedRULDays).not.toBeNull();
    expect(estimatedRULDays).toBeGreaterThan(0);
    expect(confidence).toBeGreaterThan(0.9);
  });

  it('returns estimatedRULDays mathematically consistent with decay rate', () => {
    // y = 100 * exp(-0.1 * t), threshold = 1
    // ln(100/1) / 0.1 = 46 days from t=0; current t = 30 → RUL ≈ 16 days
    const a = 100;
    const b = 0.1;
    const readings = generateDecay(a, b, 30);
    const threshold = 1;
    const { estimatedRULDays } = estimateRUL(readings, threshold);

    // Expected: ln(100) / 0.1 - 29 ≈ 17 days
    const expected = Math.log(a / threshold) / b - 29;
    expect(estimatedRULDays).toBeGreaterThan(0);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(Math.abs((estimatedRULDays ?? 0) - expected)).toBeLessThan(5);
  });

  it('returns null RUL when value is already below threshold', () => {
    const readings = generateDecay(5, 0.01, 10);
    const { estimatedRULDays } = estimateRUL(readings, 10); // threshold above current values

    // b > 0 and a <= threshold → no RUL
    expect(estimatedRULDays === null || estimatedRULDays === 0).toBe(true);
  });

  it('returns degradation curve with 31 points (0..30 days)', () => {
    const readings = generateDecay(100, 0.02, 30);
    const { degradationCurve } = estimateRUL(readings, 10);

    expect(degradationCurve).toHaveLength(31);
    expect(degradationCurve[0].day).toBe(0);
    expect(degradationCurve[30].day).toBe(30);
  });

  it('degradation curve values are non-negative and decreasing for decay model', () => {
    const readings = generateDecay(100, 0.05, 30);
    const { degradationCurve } = estimateRUL(readings, 1);

    for (const point of degradationCurve) {
      expect(point.predictedValue).toBeGreaterThanOrEqual(0);
    }
    // Curve should generally decrease
    expect(degradationCurve[0].predictedValue).toBeGreaterThanOrEqual(
      degradationCurve[degradationCurve.length - 1].predictedValue
    );
  });

  it('returns null for insufficient readings', () => {
    const { estimatedRULDays, confidence } = estimateRUL([{ value: 100, timestamp: new Date().toISOString() }], 10);
    expect(estimatedRULDays).toBeNull();
    expect(confidence).toBe(0);
  });
});
