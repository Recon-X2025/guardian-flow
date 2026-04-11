/**
 * @file tests/unit/nlp-query.test.js
 * @description Unit tests for NLP query route logic — SQL safety, rate limiting, and keyword fallback.
 *
 * Tests pure logic functions replicated from server/routes/nlp-query.js without
 * requiring a running server, database, or OpenAI API key.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── SQL safety ────────────────────────────────────────────────────────────────
// Mirrors the validateSql logic from server/routes/nlp-query.js
const SAFE_SQL_RE = /^select\b/i;
const UNSAFE_SQL_RE = /\b(insert|update|delete|drop|create|exec|alter)\b/i;

function validateSql(sql) {
  if (!SAFE_SQL_RE.test(sql.trim())) return 'SQL must start with SELECT';
  if (UNSAFE_SQL_RE.test(sql)) return 'SQL contains forbidden statement';
  return null;
}

function isSafeSql(sql) {
  return validateSql(sql) === null;
}

describe('NLP Query — SQL safety', () => {
  it('rejects UPDATE', () => {
    expect(isSafeSql('UPDATE users SET x=1')).toBe(false);
  });

  it('rejects DELETE', () => {
    expect(isSafeSql('DELETE FROM users')).toBe(false);
  });

  it('rejects INSERT', () => {
    expect(isSafeSql('INSERT INTO users VALUES (1)')).toBe(false);
  });

  it('accepts SELECT', () => {
    expect(isSafeSql('SELECT * FROM work_orders')).toBe(true);
  });

  it('rejects DROP', () => {
    expect(isSafeSql('DROP TABLE users')).toBe(false);
  });

  it('rejects CREATE', () => {
    expect(isSafeSql('CREATE TABLE hack (x int)')).toBe(false);
  });

  it('rejects EXEC', () => {
    expect(isSafeSql('EXEC xp_cmdshell')).toBe(false);
  });

  it('rejects ALTER', () => {
    expect(isSafeSql('ALTER TABLE users ADD COLUMN foo int')).toBe(false);
  });

  it('rejects SELECT with embedded DELETE', () => {
    expect(isSafeSql('SELECT * FROM users; DELETE FROM users')).toBe(false);
  });

  it('returns error message for non-SELECT', () => {
    expect(validateSql('DROP TABLE x')).toBe('SQL must start with SELECT');
  });

  it('returns error message for forbidden statement in SELECT', () => {
    expect(validateSql('SELECT * FROM users; DROP TABLE users')).toBe('SQL contains forbidden statement');
  });

  it('accepts SELECT with WHERE clause', () => {
    expect(isSafeSql("SELECT * FROM assets WHERE tenant_id = 'abc' LIMIT 20")).toBe(true);
  });
});

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Mirrors the checkRateLimit logic from server/routes/nlp-query.js
const RATE_LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000;

function makeRateLimiter() {
  const rateLimitMap = new Map();

  function checkRateLimit(tenantId) {
    const now = Date.now();
    const entry = rateLimitMap.get(tenantId);
    if (!entry || now - entry.windowStart > WINDOW_MS) {
      rateLimitMap.set(tenantId, { count: 1, windowStart: now });
      return true;
    }
    if (entry.count >= RATE_LIMIT) return false;
    entry.count++;
    return true;
  }

  function clear() { rateLimitMap.clear(); }

  return { checkRateLimit, clear };
}

describe('NLP Query — rate limiting', () => {
  let limiter;

  beforeEach(() => {
    limiter = makeRateLimiter();
  });

  it('allows 20 calls', () => {
    for (let i = 0; i < 20; i++) {
      expect(limiter.checkRateLimit('t1')).toBe(true);
    }
  });

  it('blocks 21st call', () => {
    for (let i = 0; i < 20; i++) limiter.checkRateLimit('t1');
    expect(limiter.checkRateLimit('t1')).toBe(false);
  });

  it('different tenants are isolated', () => {
    for (let i = 0; i < 20; i++) limiter.checkRateLimit('t1');
    expect(limiter.checkRateLimit('t2')).toBe(true);
  });

  it('first call always succeeds', () => {
    expect(limiter.checkRateLimit('brand-new-tenant')).toBe(true);
  });

  it('continues blocking after the 21st call', () => {
    for (let i = 0; i < 20; i++) limiter.checkRateLimit('t1');
    expect(limiter.checkRateLimit('t1')).toBe(false);
    expect(limiter.checkRateLimit('t1')).toBe(false);
  });
});

// ── Keyword fallback ──────────────────────────────────────────────────────────
// Mirrors the pure routing logic from keywordFallback() in server/routes/nlp-query.js
// (without the DB/adapter calls, which are integration concerns)
function keywordFallbackPure(question, tenantId = 'test-tenant') {
  const lower = question.toLowerCase();
  const isCount = lower.includes('how many');

  let collection = null;
  let sql = '';

  if (lower.includes('work order')) {
    collection = 'work_orders';
    sql = `SELECT * FROM work_orders WHERE tenant_id = '${tenantId}' LIMIT 20`;
  } else if (lower.includes('asset')) {
    collection = 'assets';
    sql = `SELECT * FROM assets WHERE tenant_id = '${tenantId}' LIMIT 20`;
  } else if (lower.includes('invoice')) {
    collection = 'ap_invoices';
    sql = `SELECT * FROM ap_invoices WHERE tenant_id = '${tenantId}' LIMIT 20`;
  } else if (lower.includes('esg') || lower.includes('emission')) {
    collection = 'esg_activities';
    sql = `SELECT * FROM esg_activities WHERE tenant_id = '${tenantId}' LIMIT 20`;
  }

  if (!collection) {
    return { sql: "SELECT 'No matching data source' AS message", results: [], chartType: 'table', collection: null };
  }

  if (isCount) {
    return {
      sql: `SELECT COUNT(*) FROM ${collection} WHERE tenant_id = '${tenantId}'`,
      chartType: 'number',
      collection,
    };
  }

  return { sql, chartType: 'table', collection };
}

describe('NLP Query — keyword fallback', () => {
  it('work orders question produces valid structure', () => {
    const result = keywordFallbackPure('How many work orders were completed last month?');
    expect(result).toHaveProperty('sql');
    expect(result).toHaveProperty('chartType');
    expect(result.sql).toMatch(/SELECT/i);
    expect(result.chartType).toBe('number');
    expect(result.collection).toBe('work_orders');
  });

  it('invoice question targets ap_invoices', () => {
    const result = keywordFallbackPure('Show overdue invoices by vendor');
    expect(result.collection).toBe('ap_invoices');
  });

  it('asset question targets assets', () => {
    const result = keywordFallbackPure('List all assets in Building A');
    expect(result.collection).toBe('assets');
  });

  it('esg question targets esg_activities', () => {
    const result = keywordFallbackPure('Show ESG activity summary');
    expect(result.collection).toBe('esg_activities');
  });

  it('emission keyword also targets esg_activities', () => {
    const result = keywordFallbackPure('What are total emissions this year?');
    expect(result.collection).toBe('esg_activities');
  });

  it('default falls back to null collection with table chartType', () => {
    const result = keywordFallbackPure('Show everything');
    expect(result.collection).toBeNull();
    expect(result.chartType).toBe('table');
    expect(result.results).toEqual([]);
  });

  it('"how many" produces number chartType', () => {
    const result = keywordFallbackPure('How many assets are there?');
    expect(result.chartType).toBe('number');
  });

  it('generated SQL starts with SELECT', () => {
    const result = keywordFallbackPure('Show all invoices');
    expect(result.sql).toMatch(/^SELECT/i);
  });
});
