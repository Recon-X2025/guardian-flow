/**
 * @file tests/unit/sandbox.test.js
 * @description Unit tests for sandbox provisioning logic — Sprint 41.
 *
 * Tests pure functions extracted from server/routes/sandbox.js without
 * requiring a running server or database connection.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Pure helper functions mirrored from sandbox route ──────────────────────────

function randomHex(n) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function buildTenantId() {
  return `sandbox-${randomHex(6)}`;
}

function isSandboxTenant(tenantId) {
  return typeof tenantId === 'string' && tenantId.startsWith('sandbox-');
}

// ── Mock database adapter ────────────────────────────────────────────────────

function createMockAdapter() {
  const store = {};

  return {
    store,
    async insertOne(col, doc) {
      if (!store[col]) store[col] = [];
      store[col].push({ ...doc });
      return doc;
    },
    async findOne(col, filter) {
      if (!store[col]) return null;
      return store[col].find(d => Object.entries(filter).every(([k, v]) => d[k] === v)) || null;
    },
    async findMany(col, filter, opts) {
      if (!store[col]) return [];
      const filtered = store[col].filter(d => Object.entries(filter).every(([k, v]) => d[k] === v));
      const limit = opts?.limit || filtered.length;
      return filtered.slice(0, limit);
    },
    async updateOne(col, filter, updates) {
      if (!store[col]) return;
      const idx = store[col].findIndex(d => Object.entries(filter).every(([k, v]) => d[k] === v));
      if (idx !== -1) store[col][idx] = { ...store[col][idx], ...updates };
    },
    async deleteOne(col, filter) {
      if (!store[col]) return;
      store[col] = store[col].filter(d => !Object.entries(filter).every(([k, v]) => d[k] === v));
    },
  };
}

// ── Seed / wipe helpers mirrored from sandbox route ───────────────────────────

async function seedSandbox(adapter, tenantId) {
  const now = new Date().toISOString();
  for (let i = 1; i <= 5; i++) {
    await adapter.insertOne('assets', { id: `asset-${tenantId}-${i}`, tenant_id: tenantId, name: `Sandbox Asset ${i}`, created_at: now });
  }
  for (let i = 1; i <= 3; i++) {
    await adapter.insertOne('profiles', { id: `tech-${tenantId}-${i}`, tenant_id: tenantId, full_name: `Sandbox Tech ${i}`, role: 'technician', created_at: now });
  }
  for (let i = 1; i <= 5; i++) {
    await adapter.insertOne('work_orders', { id: `wo-${tenantId}-${i}`, tenant_id: tenantId, title: `Sandbox WO ${i}`, created_at: now });
  }
  for (let i = 1; i <= 2; i++) {
    await adapter.insertOne('invoices', { id: `inv-${tenantId}-${i}`, tenant_id: tenantId, invoice_number: `INV-${i}`, created_at: now });
  }
}

async function wipeSandbox(adapter, tenantId) {
  const collections = ['work_orders', 'assets', 'profiles', 'invoices'];
  for (const col of collections) {
    const items = await adapter.findMany(col, { tenant_id: tenantId }, { limit: 1000 });
    for (const item of items) {
      await adapter.deleteOne(col, { id: item.id });
    }
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Sandbox tenant ID', () => {
  it('provision creates tenant with "sandbox-" prefix', () => {
    const tenantId = buildTenantId();
    expect(tenantId).toMatch(/^sandbox-[0-9a-f]{6}$/);
  });

  it('every provisioned tenant ID is unique', () => {
    const ids = new Set(Array.from({ length: 100 }, buildTenantId));
    // With 6 hex chars (16^6 = 16M combinations), 100 ids should be unique
    expect(ids.size).toBe(100);
  });
});

describe('isSandboxTenant guard', () => {
  it('returns true for sandbox- prefix', () => {
    expect(isSandboxTenant('sandbox-abc123')).toBe(true);
  });

  it('returns false for non-sandbox tenant', () => {
    expect(isSandboxTenant('prod-tenant-001')).toBe(false);
    expect(isSandboxTenant('tenant-123')).toBe(false);
    expect(isSandboxTenant('')).toBe(false);
  });

  it('rejects arbitrary strings that could bypass prefix check', () => {
    expect(isSandboxTenant('SANDBOX-abc123')).toBe(false); // case-sensitive
    expect(isSandboxTenant(' sandbox-abc')).toBe(false);   // leading space
  });
});

describe('seedSandbox', () => {
  it('seeds exactly 5 assets, 3 technicians, 5 work orders, 2 invoices', async () => {
    const adapter = createMockAdapter();
    const tenantId = 'sandbox-test01';
    await seedSandbox(adapter, tenantId);

    const assets = await adapter.findMany('assets', { tenant_id: tenantId }, {});
    const techs = await adapter.findMany('profiles', { tenant_id: tenantId }, {});
    const wos = await adapter.findMany('work_orders', { tenant_id: tenantId }, {});
    const invs = await adapter.findMany('invoices', { tenant_id: tenantId }, {});

    expect(assets).toHaveLength(5);
    expect(techs).toHaveLength(3);
    expect(wos).toHaveLength(5);
    expect(invs).toHaveLength(2);
  });

  it('only affects the target tenant — other tenants untouched', async () => {
    const adapter = createMockAdapter();
    const sandboxId = 'sandbox-abc001';
    const otherTenant = 'prod-tenant-xyz';

    // Pre-seed the other tenant
    await adapter.insertOne('assets', { id: 'prod-asset-1', tenant_id: otherTenant, name: 'Prod Asset' });

    await seedSandbox(adapter, sandboxId);

    const prodAssets = await adapter.findMany('assets', { tenant_id: otherTenant }, {});
    const sandboxAssets = await adapter.findMany('assets', { tenant_id: sandboxId }, {});

    expect(prodAssets).toHaveLength(1);
    expect(sandboxAssets).toHaveLength(5);
  });
});

describe('wipeSandbox', () => {
  it('removes all seeded data for sandbox tenant', async () => {
    const adapter = createMockAdapter();
    const tenantId = 'sandbox-wipe01';
    await seedSandbox(adapter, tenantId);

    // Verify data exists
    const before = await adapter.findMany('assets', { tenant_id: tenantId }, {});
    expect(before.length).toBeGreaterThan(0);

    await wipeSandbox(adapter, tenantId);

    const after = await adapter.findMany('assets', { tenant_id: tenantId }, {});
    expect(after).toHaveLength(0);
  });

  it('reset only affects sandbox tenant data — not other tenants', async () => {
    const adapter = createMockAdapter();
    const sandboxId = 'sandbox-reset01';
    const otherId = 'prod-other-001';

    await adapter.insertOne('assets', { id: 'other-asset', tenant_id: otherId, name: 'Other' });
    await seedSandbox(adapter, sandboxId);

    await wipeSandbox(adapter, sandboxId);
    await seedSandbox(adapter, sandboxId);

    const otherAssets = await adapter.findMany('assets', { tenant_id: otherId }, {});
    const sandboxAssets = await adapter.findMany('assets', { tenant_id: sandboxId }, {});

    // Other tenant untouched
    expect(otherAssets).toHaveLength(1);
    // Sandbox re-seeded
    expect(sandboxAssets).toHaveLength(5);
  });
});

describe('Non-sandbox prefix rejected', () => {
  it('provision with non-sandbox prefix should be rejected by guard', () => {
    // Simulate the route-level guard: tenantId must start with "sandbox-"
    const tenantId = 'prod-tenant-001';
    expect(isSandboxTenant(tenantId)).toBe(false);

    // Attempting to operate on this should be rejected
    const wouldAllow = isSandboxTenant(tenantId);
    expect(wouldAllow).toBe(false);
  });

  it('user-supplied tenantId that looks like sandbox but has wrong prefix is rejected', () => {
    expect(isSandboxTenant('asandbox-abc123')).toBe(false);
    expect(isSandboxTenant('sandbox')).toBe(false); // no hyphen
  });
});
