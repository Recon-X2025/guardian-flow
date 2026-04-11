/**
 * @file tests/unit/vehicle-stock.test.js
 * @description Unit tests for technician vehicle stock logic — Sprint 36.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── In-memory store helpers ───────────────────────────────────────────────────

function makeVehicle(overrides = {}) {
  return {
    technicianId: overrides.technicianId ?? 'tech-1',
    tenantId:     overrides.tenantId     ?? 'tenant-1',
    vehicleRef:   overrides.vehicleRef   ?? 'VAN-001',
    stockItems:   overrides.stockItems   ?? [],
    updatedAt:    overrides.updatedAt    ?? new Date().toISOString(),
  };
}

function makeStockItem(overrides = {}) {
  return {
    partId:   overrides.partId   ?? 'part-1',
    partName: overrides.partName ?? 'Filter',
    qty:      overrides.qty      ?? 10,
    minQty:   overrides.minQty   ?? 2,
  };
}

function makeAdapter(vehicles = [], notifications = []) {
  const vStore = [...vehicles];
  const nStore = [...notifications];

  return {
    findOne: vi.fn(async (col, query) => {
      if (col === 'technician_vehicles') {
        return vStore.find(v =>
          (!query.technicianId || v.technicianId === query.technicianId) &&
          (!query.tenantId     || v.tenantId     === query.tenantId),
        ) ?? null;
      }
      return null;
    }),
    updateOne: vi.fn(async (col, query, updates) => {
      if (col === 'technician_vehicles') {
        const idx = vStore.findIndex(v =>
          (!query.technicianId || v.technicianId === query.technicianId) &&
          (!query.tenantId     || v.tenantId     === query.tenantId),
        );
        if (idx !== -1) Object.assign(vStore[idx], updates);
      }
    }),
    insertOne: vi.fn(async (col, doc) => {
      if (col === 'technician_vehicles') vStore.push(doc);
      if (col === 'notifications')       nStore.push(doc);
    }),
    vStore,
    nStore,
  };
}

// ── Core vehicle-stock logic (mirrors server/routes/vehicle-stock.js) ─────────

async function consumeParts(adapter, tenantId, technicianId, { partId, qty, workOrderId }) {
  if (!partId) throw new Error('partId is required');
  if (!qty || qty <= 0) throw new Error('qty must be positive');

  const vehicle = await adapter.findOne('technician_vehicles', { technicianId, tenantId });
  if (!vehicle) throw new Error('Vehicle stock not found');

  const stockItems = vehicle.stockItems || [];
  const itemIdx    = stockItems.findIndex(item => item.partId === partId);
  if (itemIdx === -1) throw new Error(`Part ${partId} not found`);

  const item = stockItems[itemIdx];
  if (item.qty < qty) throw new Error(`Insufficient stock. Available: ${item.qty}, requested: ${qty}`);

  stockItems[itemIdx] = { ...item, qty: item.qty - qty };

  await adapter.updateOne(
    'technician_vehicles',
    { technicianId, tenantId },
    { stockItems, updatedAt: new Date().toISOString() },
  );

  const remaining  = stockItems[itemIdx].qty;
  const isLowStock = remaining < item.minQty;

  if (isLowStock) {
    try {
      await adapter.insertOne('notifications', {
        tenantId,
        type:     'low_stock',
        technicianId,
        partId,
        partName: item.partName,
        remaining,
        minQty:   item.minQty,
        workOrderId: workOrderId ?? null,
      });
    } catch (_) {
      // swallow — notifications store may not exist
    }
  }

  return { consumed: qty, remaining, lowStock: isLowStock };
}

async function restockParts(adapter, tenantId, technicianId, { partId, qty }) {
  if (!partId) throw new Error('partId is required');
  if (!qty || qty <= 0) throw new Error('qty must be positive');

  const vehicle = await adapter.findOne('technician_vehicles', { technicianId, tenantId });
  if (!vehicle) throw new Error('Vehicle stock not found');

  const stockItems = vehicle.stockItems || [];
  const itemIdx    = stockItems.findIndex(item => item.partId === partId);
  if (itemIdx === -1) throw new Error(`Part ${partId} not found`);

  stockItems[itemIdx] = { ...stockItems[itemIdx], qty: stockItems[itemIdx].qty + qty };

  await adapter.updateOne(
    'technician_vehicles',
    { technicianId, tenantId },
    { stockItems, updatedAt: new Date().toISOString() },
  );

  return { added: qty, newTotal: stockItems[itemIdx].qty };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Vehicle Stock — consume', () => {
  let adapter;
  const TENANT = 'tenant-1';
  const TECH   = 'tech-1';

  beforeEach(() => {
    const vehicle = makeVehicle({
      stockItems: [
        makeStockItem({ partId: 'part-a', partName: 'Oil Filter', qty: 10, minQty: 3 }),
        makeStockItem({ partId: 'part-b', partName: 'Air Filter', qty: 5,  minQty: 2 }),
      ],
    });
    adapter = makeAdapter([vehicle]);
  });

  it('deducts qty from the correct part', async () => {
    const result = await consumeParts(adapter, TENANT, TECH, { partId: 'part-a', qty: 3 });
    expect(result.consumed).toBe(3);
    expect(result.remaining).toBe(7);

    const updated = adapter.vStore[0].stockItems.find(i => i.partId === 'part-a');
    expect(updated.qty).toBe(7);
  });

  it('does not affect other parts', async () => {
    await consumeParts(adapter, TENANT, TECH, { partId: 'part-a', qty: 2 });
    const partB = adapter.vStore[0].stockItems.find(i => i.partId === 'part-b');
    expect(partB.qty).toBe(5);
  });

  it('returns lowStock=false when remaining >= minQty', async () => {
    const result = await consumeParts(adapter, TENANT, TECH, { partId: 'part-a', qty: 1 });
    expect(result.lowStock).toBe(false);
    expect(result.remaining).toBeGreaterThanOrEqual(3);
  });

  it('returns lowStock=true when remaining < minQty', async () => {
    // part-a: qty=10, minQty=3, consume 8 → remaining=2 < 3
    const result = await consumeParts(adapter, TENANT, TECH, { partId: 'part-a', qty: 8 });
    expect(result.lowStock).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('inserts a low-stock notification when qty < minQty', async () => {
    await consumeParts(adapter, TENANT, TECH, { partId: 'part-a', qty: 8, workOrderId: 'WO-99' });
    expect(adapter.nStore).toHaveLength(1);
    const notif = adapter.nStore[0];
    expect(notif.type).toBe('low_stock');
    expect(notif.partId).toBe('part-a');
    expect(notif.workOrderId).toBe('WO-99');
    expect(notif.remaining).toBe(2);
  });

  it('does NOT insert notification when stock is still above minimum', async () => {
    await consumeParts(adapter, TENANT, TECH, { partId: 'part-a', qty: 1 });
    expect(adapter.nStore).toHaveLength(0);
  });

  it('throws when requested qty exceeds available', async () => {
    await expect(consumeParts(adapter, TENANT, TECH, { partId: 'part-a', qty: 999 }))
      .rejects.toThrow('Insufficient stock');
  });

  it('throws when part is not found', async () => {
    await expect(consumeParts(adapter, TENANT, TECH, { partId: 'nonexistent', qty: 1 }))
      .rejects.toThrow('not found');
  });

  it('throws when vehicle stock does not exist', async () => {
    const emptyAdapter = makeAdapter([]);
    await expect(consumeParts(emptyAdapter, TENANT, TECH, { partId: 'part-a', qty: 1 }))
      .rejects.toThrow('Vehicle stock not found');
  });

  it('throws when qty is zero or negative', async () => {
    await expect(consumeParts(adapter, TENANT, TECH, { partId: 'part-a', qty: 0 }))
      .rejects.toThrow('qty must be positive');
    await expect(consumeParts(adapter, TENANT, TECH, { partId: 'part-a', qty: -5 }))
      .rejects.toThrow('qty must be positive');
  });
});

describe('Vehicle Stock — restock', () => {
  let adapter;
  const TENANT = 'tenant-1';
  const TECH   = 'tech-1';

  beforeEach(() => {
    const vehicle = makeVehicle({
      stockItems: [
        makeStockItem({ partId: 'part-a', qty: 2, minQty: 3 }),
      ],
    });
    adapter = makeAdapter([vehicle]);
  });

  it('adds qty to the correct part', async () => {
    const result = await restockParts(adapter, TENANT, TECH, { partId: 'part-a', qty: 5 });
    expect(result.added).toBe(5);
    expect(result.newTotal).toBe(7);

    const updated = adapter.vStore[0].stockItems.find(i => i.partId === 'part-a');
    expect(updated.qty).toBe(7);
  });

  it('accumulates correctly across multiple restocks', async () => {
    await restockParts(adapter, TENANT, TECH, { partId: 'part-a', qty: 3 });
    const result = await restockParts(adapter, TENANT, TECH, { partId: 'part-a', qty: 4 });
    expect(result.newTotal).toBe(9); // 2 + 3 + 4
  });

  it('throws when part is not found', async () => {
    await expect(restockParts(adapter, TENANT, TECH, { partId: 'unknown', qty: 5 }))
      .rejects.toThrow('not found');
  });

  it('throws when vehicle stock does not exist', async () => {
    const emptyAdapter = makeAdapter([]);
    await expect(restockParts(emptyAdapter, TENANT, TECH, { partId: 'part-a', qty: 5 }))
      .rejects.toThrow('Vehicle stock not found');
  });

  it('throws when qty is zero or negative', async () => {
    await expect(restockParts(adapter, TENANT, TECH, { partId: 'part-a', qty: 0 }))
      .rejects.toThrow('qty must be positive');
  });
});
