/**
 * @file tests/unit/ledger.test.ts
 * @description Unit tests for journal entry balance validation logic.
 */

import { describe, it, expect } from 'vitest';

// ── Pure balance validation extracted from server/routes/ledger.js ────────────

interface JournalLine {
  account_id: string;
  debit?: number;
  credit?: number;
}

function validateJournalBalance(lines: JournalLine[]): { valid: boolean; error?: string; totalDebits: number; totalCredits: number } {
  if (!Array.isArray(lines) || lines.length < 2) {
    return { valid: false, error: 'Journal entry must have at least 2 line items', totalDebits: 0, totalCredits: 0 };
  }

  const totalDebits  = lines.reduce((sum, l) => sum + (Number(l.debit)  || 0), 0);
  const totalCredits = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);

  if (totalDebits === 0) {
    return { valid: false, error: 'Journal entry must have at least one debit line', totalDebits, totalCredits };
  }

  if (Math.abs(totalDebits - totalCredits) > 0.001) {
    return {
      valid: false,
      error: `Journal entry is not balanced: debits (${totalDebits}) ≠ credits (${totalCredits})`,
      totalDebits,
      totalCredits,
    };
  }

  return { valid: true, totalDebits, totalCredits };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('validateJournalBalance()', () => {
  it('accepts a perfectly balanced 2-line entry', () => {
    const lines: JournalLine[] = [
      { account_id: 'acc-1', debit: 500 },
      { account_id: 'acc-2', credit: 500 },
    ];
    const result = validateJournalBalance(lines);
    expect(result.valid).toBe(true);
    expect(result.totalDebits).toBe(500);
    expect(result.totalCredits).toBe(500);
  });

  it('accepts multi-line balanced entry', () => {
    const lines: JournalLine[] = [
      { account_id: 'acc-1', debit: 300 },
      { account_id: 'acc-2', debit: 200 },
      { account_id: 'acc-3', credit: 500 },
    ];
    const result = validateJournalBalance(lines);
    expect(result.valid).toBe(true);
  });

  it('rejects unbalanced entry', () => {
    const lines: JournalLine[] = [
      { account_id: 'acc-1', debit: 500 },
      { account_id: 'acc-2', credit: 400 },
    ];
    const result = validateJournalBalance(lines);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/not balanced/);
  });

  it('rejects entry with fewer than 2 lines', () => {
    const lines: JournalLine[] = [
      { account_id: 'acc-1', debit: 100 },
    ];
    const result = validateJournalBalance(lines);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/at least 2/);
  });

  it('rejects entry with no debit lines', () => {
    const lines: JournalLine[] = [
      { account_id: 'acc-1', credit: 100 },
      { account_id: 'acc-2', credit: 100 },
    ];
    const result = validateJournalBalance(lines);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/at least one debit/);
  });

  it('accepts floating-point amounts within tolerance', () => {
    // 0.1 + 0.2 === 0.30000000000000004 in JS
    const lines: JournalLine[] = [
      { account_id: 'acc-1', debit: 0.1 + 0.2 },
      { account_id: 'acc-2', credit: 0.3 },
    ];
    const result = validateJournalBalance(lines);
    expect(result.valid).toBe(true);
  });

  it('rejects empty array', () => {
    const result = validateJournalBalance([]);
    expect(result.valid).toBe(false);
  });

  it('treats missing debit/credit fields as zero', () => {
    // All credits, no debits — should fail
    const lines: JournalLine[] = [
      { account_id: 'acc-1' },
      { account_id: 'acc-2', credit: 100 },
    ];
    const result = validateJournalBalance(lines);
    expect(result.valid).toBe(false);
  });

  it('calculates totals correctly', () => {
    const lines: JournalLine[] = [
      { account_id: 'acc-1', debit: 1000 },
      { account_id: 'acc-2', credit: 600 },
      { account_id: 'acc-3', credit: 400 },
    ];
    const result = validateJournalBalance(lines);
    expect(result.valid).toBe(true);
    expect(result.totalDebits).toBe(1000);
    expect(result.totalCredits).toBe(1000);
  });
});
