/**
 * @file tests/unit/territories.test.js
 * @description Unit tests for Territory CRUD and work-order lookup logic (Sprint 34).
 *
 * Tests the pure helper functions used by server/routes/territories.js without
 * touching the database or HTTP server.
 */

import { describe, it, expect } from 'vitest';

// ── Helpers inlined from server/routes/territories.js ───────────────────────

function pointInRing(point, ring) {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function extractCoords(siteAddress) {
  if (!siteAddress) return null;
  const match = String(siteAddress).match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
  if (match) return [parseFloat(match[2]), parseFloat(match[1])]; // [lng, lat]
  return null;
}

function woInTerritory(wo, territory) {
  try {
    const polygon = territory.polygon;
    if (!polygon?.geometry?.coordinates?.[0]) return true;
    const ring   = polygon.geometry.coordinates[0];
    const coords = extractCoords(wo.site_address);
    if (!coords) return true;
    return pointInRing(coords, ring);
  } catch {
    return true;
  }
}

// ── Simple in-memory territory CRUD helper (simulates the route logic) ────────

function makeTerritoryStore() {
  const store = new Map();
  return {
    create(territory) {
      if (!territory.name) throw new Error('name is required');
      store.set(territory.id, { ...territory });
      return territory;
    },
    get(id, tenantId) {
      const t = store.get(id);
      return t && t.tenantId === tenantId ? t : null;
    },
    list(tenantId) {
      return Array.from(store.values()).filter(t => t.tenantId === tenantId);
    },
    update(id, tenantId, updates) {
      const t = store.get(id);
      if (!t || t.tenantId !== tenantId) return null;
      const updated = { ...t, ...updates, updatedAt: new Date().toISOString() };
      store.set(id, updated);
      return updated;
    },
    delete(id, tenantId) {
      const t = store.get(id);
      if (!t || t.tenantId !== tenantId) return false;
      store.delete(id);
      return true;
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('pointInRing', () => {
  // A simple 10×10 square from (0,0) to (10,10)
  const square = [[0,0],[10,0],[10,10],[0,10],[0,0]];

  it('returns true for a point inside the polygon', () => {
    expect(pointInRing([5, 5], square)).toBe(true);
  });

  it('returns false for a point outside the polygon', () => {
    expect(pointInRing([15, 15], square)).toBe(false);
  });

  it('returns false for a point just outside edge', () => {
    expect(pointInRing([-1, 5], square)).toBe(false);
  });
});

describe('extractCoords', () => {
  it('parses "lat,lng" format', () => {
    expect(extractCoords('37.7749,-122.4194')).toEqual([-122.4194, 37.7749]);
  });

  it('parses "lat lng" format with space', () => {
    expect(extractCoords('40.7128 -74.006')).toEqual([-74.006, 40.7128]);
  });

  it('returns null for plain text address', () => {
    expect(extractCoords('123 Main Street, Anytown')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractCoords('')).toBeNull();
  });

  it('returns null for null', () => {
    expect(extractCoords(null)).toBeNull();
  });
});

describe('woInTerritory', () => {
  const squareTerritory = {
    polygon: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[0,0],[10,0],[10,10],[0,10],[0,0]]],
      },
    },
  };

  it('returns true when WO coords are inside territory polygon', () => {
    const wo = { site_address: '5,5' };
    expect(woInTerritory(wo, squareTerritory)).toBe(true);
  });

  it('returns false when WO coords are outside territory polygon', () => {
    const wo = { site_address: '20,20' };
    expect(woInTerritory(wo, squareTerritory)).toBe(false);
  });

  it('falls back to true when WO has no parseable coordinates', () => {
    const wo = { site_address: '123 Main Street' };
    expect(woInTerritory(wo, squareTerritory)).toBe(true);
  });

  it('falls back to true when territory has no polygon', () => {
    const wo = { site_address: '20,20' };
    expect(woInTerritory(wo, { polygon: null })).toBe(true);
  });

  it('falls back to true when territory polygon is malformed', () => {
    const wo = { site_address: '5,5' };
    expect(woInTerritory(wo, { polygon: { geometry: {} } })).toBe(true);
  });
});

describe('Territory CRUD (in-memory store)', () => {
  it('creates a territory and retrieves it', () => {
    const store = makeTerritoryStore();
    const t = store.create({ id: 'T1', tenantId: 'tenant1', name: 'North Zone' });
    expect(t.name).toBe('North Zone');
    expect(store.get('T1', 'tenant1')).toMatchObject({ name: 'North Zone' });
  });

  it('lists territories for the correct tenant only', () => {
    const store = makeTerritoryStore();
    store.create({ id: 'T1', tenantId: 'tenant1', name: 'Zone A' });
    store.create({ id: 'T2', tenantId: 'tenant1', name: 'Zone B' });
    store.create({ id: 'T3', tenantId: 'tenant2', name: 'Zone C' });
    const results = store.list('tenant1');
    expect(results).toHaveLength(2);
    expect(results.map(t => t.name)).toContain('Zone A');
    expect(results.map(t => t.name)).toContain('Zone B');
  });

  it('returns null when getting a territory from another tenant', () => {
    const store = makeTerritoryStore();
    store.create({ id: 'T1', tenantId: 'tenant1', name: 'Zone A' });
    expect(store.get('T1', 'tenant2')).toBeNull();
  });

  it('updates a territory', () => {
    const store = makeTerritoryStore();
    store.create({ id: 'T1', tenantId: 'tenant1', name: 'Old Name' });
    const updated = store.update('T1', 'tenant1', { name: 'New Name' });
    expect(updated.name).toBe('New Name');
    expect(store.get('T1', 'tenant1').name).toBe('New Name');
  });

  it('returns null when updating a territory from another tenant', () => {
    const store = makeTerritoryStore();
    store.create({ id: 'T1', tenantId: 'tenant1', name: 'Zone A' });
    expect(store.update('T1', 'tenant2', { name: 'Hack' })).toBeNull();
  });

  it('deletes a territory', () => {
    const store = makeTerritoryStore();
    store.create({ id: 'T1', tenantId: 'tenant1', name: 'Zone A' });
    expect(store.delete('T1', 'tenant1')).toBe(true);
    expect(store.get('T1', 'tenant1')).toBeNull();
  });

  it('returns false when deleting a non-existent territory', () => {
    const store = makeTerritoryStore();
    expect(store.delete('NONE', 'tenant1')).toBe(false);
  });

  it('throws on create without name', () => {
    const store = makeTerritoryStore();
    expect(() => store.create({ id: 'T1', tenantId: 'tenant1' })).toThrow('name is required');
  });
});

describe('Work-order lookup by territory', () => {
  const territory = {
    id: 'T1',
    tenantId: 'tenant1',
    polygon: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[0,0],[10,0],[10,10],[0,10],[0,0]]],
      },
    },
  };

  const workOrders = [
    { id: 'WO1', tenant_id: 'tenant1', status: 'open', site_address: '5,5'   },
    { id: 'WO2', tenant_id: 'tenant1', status: 'open', site_address: '20,20' },
    { id: 'WO3', tenant_id: 'tenant1', status: 'open', site_address: '2,8'   },
    { id: 'WO4', tenant_id: 'tenant1', status: 'open', site_address: 'No GPS address' },
  ];

  it('returns valid structure (array)', () => {
    const filtered = workOrders.filter(wo => woInTerritory(wo, territory));
    expect(Array.isArray(filtered)).toBe(true);
  });

  it('includes WOs inside the polygon', () => {
    const filtered = workOrders.filter(wo => woInTerritory(wo, territory));
    const ids = filtered.map(w => w.id);
    expect(ids).toContain('WO1');
    expect(ids).toContain('WO3');
  });

  it('excludes WOs outside the polygon (when coords are parseable)', () => {
    const filtered = workOrders.filter(wo => woInTerritory(wo, territory));
    const ids = filtered.map(w => w.id);
    expect(ids).not.toContain('WO2');
  });

  it('falls back to include WOs with unparseable addresses', () => {
    const filtered = workOrders.filter(wo => woInTerritory(wo, territory));
    const ids = filtered.map(w => w.id);
    expect(ids).toContain('WO4');
  });
});
