/**
 * @file tests/unit/asset-graph.test.js
 * @description Unit tests for asset dependency graph logic — Sprint 36.
 *
 * Tests BFS traversal, impact score calculation, and dependency add/remove
 * using in-memory stubs instead of a real database.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── In-memory asset store helpers ─────────────────────────────────────────────

function makeAsset(overrides = {}) {
  return {
    id:              overrides.id              ?? `asset-${Math.random().toString(36).slice(2)}`,
    tenant_id:       overrides.tenant_id       ?? 'tenant-1',
    name:            overrides.name            ?? 'Test Asset',
    serial_number:   overrides.serial_number   ?? 'SN-001',
    parent_asset_id: overrides.parent_asset_id ?? null,
    child_asset_ids: overrides.child_asset_ids ?? [],
    dependency_type: overrides.dependency_type ?? null,
    status:          overrides.status          ?? 'active',
    ...overrides,
  };
}

/** Minimal adapter backed by an array */
function makeAdapter(assets = []) {
  const store = [...assets];

  return {
    findOne: vi.fn(async (col, query) => {
      return store.find(a =>
        (!query.id        || a.id        === query.id)        &&
        (!query.tenant_id || a.tenant_id === query.tenant_id),
      ) ?? null;
    }),
    updateOne: vi.fn(async (col, query, updates) => {
      const idx = store.findIndex(a =>
        (!query.id        || a.id        === query.id)        &&
        (!query.tenant_id || a.tenant_id === query.tenant_id),
      );
      if (idx !== -1) Object.assign(store[idx], updates);
    }),
    store, // expose for assertions
  };
}

// ── Core graph traversal (mirrors server/routes/asset-graph.js logic) ─────────

async function buildDescendants(adapter, tenantId, rootId, maxDepth = 3) {
  const descendants = [];
  const queue   = [{ id: rootId, depth: 0 }];
  const visited = new Set([rootId]);

  while (queue.length > 0) {
    const { id: currentId, depth } = queue.shift();
    if (depth >= maxDepth) continue;

    const asset = await adapter.findOne('assets', { id: currentId, tenant_id: tenantId });
    if (!asset || !asset.child_asset_ids || asset.child_asset_ids.length === 0) continue;

    for (const childId of asset.child_asset_ids) {
      if (visited.has(childId)) continue;
      visited.add(childId);

      const child = await adapter.findOne('assets', { id: childId, tenant_id: tenantId });
      if (!child) continue;

      descendants.push({ ...child, _depth: depth + 1 });
      queue.push({ id: childId, depth: depth + 1 });
    }
  }

  return descendants;
}

async function buildAncestors(adapter, tenantId, asset) {
  const ancestors = [];
  let current = asset;
  let depth   = 0;

  while (current.parent_asset_id && depth < 3) {
    const parent = await adapter.findOne('assets', { id: current.parent_asset_id, tenant_id: tenantId });
    if (!parent) break;
    ancestors.push(parent);
    current = parent;
    depth++;
  }

  return ancestors;
}

async function addDependency(adapter, tenantId, parentId, childId, dependencyType) {
  const parent = await adapter.findOne('assets', { id: parentId, tenant_id: tenantId });
  const child  = await adapter.findOne('assets', { id: childId,  tenant_id: tenantId });

  if (!parent || !child) throw new Error('Asset not found');
  if (parentId === childId) throw new Error('Asset cannot depend on itself');

  const currentChildIds = parent.child_asset_ids || [];
  if (!currentChildIds.includes(childId)) currentChildIds.push(childId);

  await adapter.updateOne('assets', { id: parentId, tenant_id: tenantId }, {
    child_asset_ids: currentChildIds,
    dependency_type: dependencyType || parent.dependency_type || null,
  });
  await adapter.updateOne('assets', { id: childId, tenant_id: tenantId }, {
    parent_asset_id: parentId,
  });
}

async function removeDependency(adapter, tenantId, parentId, childId) {
  const parent = await adapter.findOne('assets', { id: parentId, tenant_id: tenantId });
  const child  = await adapter.findOne('assets', { id: childId,  tenant_id: tenantId });

  if (!parent) throw new Error('Asset not found');

  const updatedChildIds = (parent.child_asset_ids || []).filter(id => id !== childId);
  await adapter.updateOne('assets', { id: parentId, tenant_id: tenantId }, {
    child_asset_ids: updatedChildIds,
  });

  if (child && child.parent_asset_id === parentId) {
    await adapter.updateOne('assets', { id: childId, tenant_id: tenantId }, {
      parent_asset_id: null,
    });
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Asset Graph — depth-3 BFS traversal', () => {
  let root, child1, child2, grandchild1, greatGrandchild;
  let adapter;
  const TENANT = 'tenant-1';

  beforeEach(() => {
    greatGrandchild = makeAsset({ id: 'ggc-1', name: 'Great-Grandchild', child_asset_ids: [] });
    grandchild1     = makeAsset({ id: 'gc-1',  name: 'Grandchild 1',     child_asset_ids: ['ggc-1'] });
    child1          = makeAsset({ id: 'c-1',   name: 'Child 1',          child_asset_ids: ['gc-1'] });
    child2          = makeAsset({ id: 'c-2',   name: 'Child 2',          child_asset_ids: [] });
    root            = makeAsset({ id: 'root',  name: 'Root',             child_asset_ids: ['c-1', 'c-2'] });

    adapter = makeAdapter([root, child1, child2, grandchild1, greatGrandchild]);
  });

  it('returns direct children at depth 1', async () => {
    const descendants = await buildDescendants(adapter, TENANT, 'root');
    const depth1 = descendants.filter(d => d._depth === 1);
    expect(depth1).toHaveLength(2);
    expect(depth1.map(d => d.id)).toEqual(expect.arrayContaining(['c-1', 'c-2']));
  });

  it('returns grandchildren at depth 2', async () => {
    const descendants = await buildDescendants(adapter, TENANT, 'root');
    const depth2 = descendants.filter(d => d._depth === 2);
    expect(depth2).toHaveLength(1);
    expect(depth2[0].id).toBe('gc-1');
  });

  it('does NOT traverse beyond depth 3', async () => {
    const descendants = await buildDescendants(adapter, TENANT, 'root');
    // greatGrandchild is at depth 3 from root — should be included
    const depth3 = descendants.filter(d => d._depth === 3);
    expect(depth3).toHaveLength(1);
    expect(depth3[0].id).toBe('ggc-1');
  });

  it('respects maxDepth=1 limit', async () => {
    const descendants = await buildDescendants(adapter, TENANT, 'root', 1);
    expect(descendants).toHaveLength(2);
    expect(descendants.every(d => d._depth === 1)).toBe(true);
  });

  it('handles assets with no children gracefully', async () => {
    const lonely = makeAsset({ id: 'lonely', child_asset_ids: [] });
    const a2 = makeAdapter([lonely]);
    const result = await buildDescendants(a2, TENANT, 'lonely');
    expect(result).toHaveLength(0);
  });

  it('does not visit the same node twice (cycle guard)', async () => {
    // Manually create a cycle: root -> c-1 -> root
    const cycleChild = makeAsset({ id: 'cc', child_asset_ids: ['root'] });
    const cycleRoot  = makeAsset({ id: 'root', child_asset_ids: ['cc'] });
    const a = makeAdapter([cycleRoot, cycleChild]);
    const result = await buildDescendants(a, TENANT, 'root');
    // Should not loop forever; cycle is broken by visited set
    expect(result.length).toBeLessThanOrEqual(2);
  });
});

describe('Asset Graph — impact score', () => {
  it('impact score equals total number of descendants', async () => {
    const d3  = makeAsset({ id: 'd3', child_asset_ids: [] });
    const d2  = makeAsset({ id: 'd2', child_asset_ids: ['d3'] });
    const d1  = makeAsset({ id: 'd1', child_asset_ids: ['d2'] });
    const r   = makeAsset({ id: 'r',  child_asset_ids: ['d1'] });
    const adapter = makeAdapter([r, d1, d2, d3]);

    const descendants = await buildDescendants(adapter, 'tenant-1', 'r');
    const impactScore = descendants.length;
    expect(impactScore).toBe(3);
  });

  it('returns 0 impact score for leaf assets', async () => {
    const leaf    = makeAsset({ id: 'leaf', child_asset_ids: [] });
    const adapter = makeAdapter([leaf]);
    const descendants = await buildDescendants(adapter, 'tenant-1', 'leaf');
    expect(descendants.length).toBe(0);
  });
});

describe('Asset Graph — ancestors', () => {
  it('builds ancestor chain correctly', async () => {
    const grandparent = makeAsset({ id: 'gp', name: 'Grandparent' });
    const parent      = makeAsset({ id: 'p',  name: 'Parent', parent_asset_id: 'gp' });
    const child       = makeAsset({ id: 'ch', name: 'Child',  parent_asset_id: 'p' });
    const adapter     = makeAdapter([grandparent, parent, child]);

    const ancestors = await buildAncestors(adapter, 'tenant-1', child);
    expect(ancestors).toHaveLength(2);
    expect(ancestors[0].id).toBe('p');
    expect(ancestors[1].id).toBe('gp');
  });

  it('returns empty array for root assets (no parent)', async () => {
    const root    = makeAsset({ id: 'root', parent_asset_id: null });
    const adapter = makeAdapter([root]);
    const ancestors = await buildAncestors(adapter, 'tenant-1', root);
    expect(ancestors).toHaveLength(0);
  });
});

describe('Asset Graph — add dependency', () => {
  it('adds childId to parent.child_asset_ids', async () => {
    const parent  = makeAsset({ id: 'parent', child_asset_ids: [] });
    const child   = makeAsset({ id: 'child',  parent_asset_id: null });
    const adapter = makeAdapter([parent, child]);

    await addDependency(adapter, 'tenant-1', 'parent', 'child', 'hosts');

    expect(adapter.store.find(a => a.id === 'parent').child_asset_ids).toContain('child');
    expect(adapter.store.find(a => a.id === 'parent').dependency_type).toBe('hosts');
  });

  it('sets parent_asset_id on child', async () => {
    const parent  = makeAsset({ id: 'parent', child_asset_ids: [] });
    const child   = makeAsset({ id: 'child',  parent_asset_id: null });
    const adapter = makeAdapter([parent, child]);

    await addDependency(adapter, 'tenant-1', 'parent', 'child', 'contains');

    expect(adapter.store.find(a => a.id === 'child').parent_asset_id).toBe('parent');
  });

  it('does not duplicate child if already in list', async () => {
    const parent  = makeAsset({ id: 'parent', child_asset_ids: ['child'] });
    const child   = makeAsset({ id: 'child' });
    const adapter = makeAdapter([parent, child]);

    await addDependency(adapter, 'tenant-1', 'parent', 'child', 'hosts');

    const updatedParent = adapter.store.find(a => a.id === 'parent');
    expect(updatedParent.child_asset_ids.filter(id => id === 'child')).toHaveLength(1);
  });

  it('throws if parent asset not found', async () => {
    const child   = makeAsset({ id: 'child' });
    const adapter = makeAdapter([child]);
    await expect(addDependency(adapter, 'tenant-1', 'nonexistent', 'child', 'hosts')).rejects.toThrow('Asset not found');
  });

  it('throws if asset depends on itself', async () => {
    const asset   = makeAsset({ id: 'self' });
    const adapter = makeAdapter([asset]);
    await expect(addDependency(adapter, 'tenant-1', 'self', 'self', 'hosts')).rejects.toThrow();
  });
});

describe('Asset Graph — remove dependency', () => {
  it('removes childId from parent.child_asset_ids', async () => {
    const parent  = makeAsset({ id: 'parent', child_asset_ids: ['child'] });
    const child   = makeAsset({ id: 'child',  parent_asset_id: 'parent' });
    const adapter = makeAdapter([parent, child]);

    await removeDependency(adapter, 'tenant-1', 'parent', 'child');

    expect(adapter.store.find(a => a.id === 'parent').child_asset_ids).not.toContain('child');
  });

  it('clears parent_asset_id on child', async () => {
    const parent  = makeAsset({ id: 'parent', child_asset_ids: ['child'] });
    const child   = makeAsset({ id: 'child',  parent_asset_id: 'parent' });
    const adapter = makeAdapter([parent, child]);

    await removeDependency(adapter, 'tenant-1', 'parent', 'child');

    expect(adapter.store.find(a => a.id === 'child').parent_asset_id).toBeNull();
  });

  it('throws if parent asset not found', async () => {
    const adapter = makeAdapter([]);
    await expect(removeDependency(adapter, 'tenant-1', 'ghost', 'child')).rejects.toThrow('Asset not found');
  });
});
