/**
 * @file tests/unit/esg.test.js
 * @description Unit tests for ESG calculation logic — scope totals, co2e computation, and vsLastYear.
 *
 * Tests pure logic functions replicated from server/routes/esg.js without
 * requiring a running server or database connection.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Scope report computation ──────────────────────────────────────────────────
// Mirrors the inline logic from the GET /scope-report route in server/routes/esg.js

function groupByScope(items) {
  const scopes = { 1: [], 2: [], 3: [] };
  for (const item of items) {
    const s = Number(item.scope);
    if (scopes[s]) scopes[s].push(item);
  }
  return scopes;
}

function sumCo2e(items) {
  return items.reduce((sum, a) => sum + (a.co2eKg || 0), 0);
}

function computeScopeReport(activities, year) {
  const current = activities.filter(a => a.period && a.period.includes(year));
  const curScopes = groupByScope(current);
  const total = sumCo2e(current);

  return {
    year,
    scope1: { total_co2e: sumCo2e(curScopes[1]), activities: curScopes[1] },
    scope2: { total_co2e: sumCo2e(curScopes[2]), activities: curScopes[2] },
    scope3: { total_co2e: sumCo2e(curScopes[3]), activities: curScopes[3] },
    total,
  };
}

describe('ESG — scope totals', () => {
  it('sums correctly across scopes', () => {
    const activities = [
      { id: '1', period: '2024', scope: 1, co2eKg: 100 },
      { id: '2', period: '2024', scope: 2, co2eKg: 200 },
      { id: '3', period: '2024', scope: 3, co2eKg: 50 },
    ];
    const report = computeScopeReport(activities, '2024');
    expect(report.scope1.total_co2e).toBe(100);
    expect(report.scope2.total_co2e).toBe(200);
    expect(report.scope3.total_co2e).toBe(50);
    expect(report.total).toBe(350);
  });

  it('returns 0 not null for empty period', () => {
    const report = computeScopeReport([], '2024');
    expect(report.scope1.total_co2e).toBe(0);
    expect(report.scope2.total_co2e).toBe(0);
    expect(report.scope3.total_co2e).toBe(0);
    expect(report.total).toBe(0);
  });

  it('filters by year correctly', () => {
    const activities = [
      { id: '1', period: '2024', scope: 1, co2eKg: 100 },
      { id: '2', period: '2023', scope: 1, co2eKg: 999 },
    ];
    const report = computeScopeReport(activities, '2024');
    expect(report.total).toBe(100);
  });

  it('scope1 activities array contains correct items', () => {
    const activities = [
      { id: '1', period: '2024', scope: 1, co2eKg: 100 },
      { id: '2', period: '2024', scope: 2, co2eKg: 200 },
    ];
    const report = computeScopeReport(activities, '2024');
    expect(report.scope1.activities).toHaveLength(1);
    expect(report.scope1.activities[0].id).toBe('1');
  });

  it('multiple activities in same scope accumulate correctly', () => {
    const activities = [
      { id: '1', period: '2024', scope: 1, co2eKg: 100 },
      { id: '2', period: '2024', scope: 1, co2eKg: 150 },
    ];
    const report = computeScopeReport(activities, '2024');
    expect(report.scope1.total_co2e).toBe(250);
    expect(report.scope1.activities).toHaveLength(2);
  });

  it('missing co2eKg is treated as 0', () => {
    const activities = [
      { id: '1', period: '2024', scope: 1 },
    ];
    const report = computeScopeReport(activities, '2024');
    expect(report.scope1.total_co2e).toBe(0);
    expect(report.total).toBe(0);
  });

  it('report includes the year field', () => {
    const report = computeScopeReport([], '2024');
    expect(report.year).toBe('2024');
  });
});

// ── co2e calculation ──────────────────────────────────────────────────────────
// Mirrors: const co2eKg = quantity * factor.factor; in server/routes/esg.js

describe('ESG — co2e calculation', () => {
  it('computes 100 kwh electricity = 23.3 kg', () => {
    const quantity = 100;
    const factor = 0.233;
    const co2eKg = quantity * factor;
    expect(co2eKg).toBeCloseTo(23.3, 1);
  });

  it('computes natural gas emissions correctly', () => {
    const quantity = 50; // cubic meters
    const factor = 2.03;
    expect(quantity * factor).toBeCloseTo(101.5, 1);
  });

  it('zero quantity produces zero emissions', () => {
    expect(0 * 0.233).toBe(0);
  });

  it('large quantity scales linearly', () => {
    const factor = 0.233;
    expect(1000 * factor).toBeCloseTo(233, 1);
  });

  it('fractional quantity produces fractional result', () => {
    const quantity = 0.5;
    const factor = 0.233;
    expect(quantity * factor).toBeCloseTo(0.1165, 4);
  });
});

// ── vsLastYear calculation ────────────────────────────────────────────────────
// Mirrors: const vsLastYear = lastTotal === 0 ? null : ((total - lastTotal) / lastTotal * 100).toFixed(1);

function computeVsLastYear(current, last) {
  return last === 0 ? null : ((current - last) / last * 100).toFixed(1);
}

describe('ESG — vsLastYear calculation', () => {
  it('computes percentage change correctly', () => {
    const pct = computeVsLastYear(350, 300);
    expect(parseFloat(pct)).toBeCloseTo(16.7, 0);
  });

  it('returns null when last year has no data', () => {
    expect(computeVsLastYear(350, 0)).toBeNull();
  });

  it('shows negative when emissions decreased', () => {
    const pct = computeVsLastYear(200, 400);
    expect(parseFloat(pct)).toBe(-50);
  });

  it('returns "0.0" when values are equal', () => {
    expect(computeVsLastYear(300, 300)).toBe('0.0');
  });

  it('result is a string with one decimal place', () => {
    const pct = computeVsLastYear(350, 300);
    expect(typeof pct).toBe('string');
    expect(pct).toMatch(/^-?\d+\.\d$/);
  });

  it('100% increase from last year', () => {
    const pct = computeVsLastYear(600, 300);
    expect(parseFloat(pct)).toBe(100);
  });
});
