import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

function randomHex(n) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function requireSysAdmin(req, res, next) {
  if (req.user?.role !== 'sys_admin') return res.status(403).json({ error: 'sys_admin role required' });
  next();
}

async function seedSandbox(adapter, tenantId) {
  const now = new Date().toISOString();
  // 5 assets
  for (let i = 1; i <= 5; i++) {
    await adapter.insertOne('assets', { id: randomUUID(), tenant_id: tenantId, name: `Sandbox Asset ${i}`, serial_number: `SBX-${i}`, category: 'equipment', status: 'active', created_at: now, updated_at: now });
  }
  // 3 technicians (profiles)
  for (let i = 1; i <= 3; i++) {
    await adapter.insertOne('profiles', { id: randomUUID(), tenant_id: tenantId, full_name: `Sandbox Tech ${i}`, role: 'technician', created_at: now });
  }
  // 5 work orders
  for (let i = 1; i <= 5; i++) {
    await adapter.insertOne('work_orders', { id: randomUUID(), tenant_id: tenantId, title: `Sandbox WO ${i}`, status: 'open', priority: 'medium', created_at: now, updated_at: now });
  }
  // 2 invoices
  for (let i = 1; i <= 2; i++) {
    await adapter.insertOne('invoices', { id: randomUUID(), tenant_id: tenantId, invoice_number: `SBX-INV-${i}`, amount: 1000 * i, status: 'draft', created_at: now, updated_at: now });
  }
}

async function wipeSandbox(adapter, tenantId) {
  const collections = ['work_orders', 'assets', 'profiles', 'invoices', 'iot_devices', 'iot_readings', 'iot_rules', 'digital_twins'];
  for (const col of collections) {
    try {
      const items = await adapter.findMany(col, { tenant_id: tenantId }, { limit: 1000 });
      for (const item of items) {
        await adapter.deleteOne(col, { id: item.id });
      }
    } catch (err) {
      logger.warn(`wipeSandbox: error wiping ${col}`, { error: err.message });
    }
  }
}

// POST /api/admin/sandbox/provision
router.post('/provision', authenticateToken, requireSysAdmin, async (req, res) => {
  try {
    const tenantId = `sandbox-${randomHex(6)}`;
    const apiKey = `sbx_${randomUUID().replace(/-/g, '')}`;
    const now = new Date().toISOString();
    const adapter = await getAdapter();

    await adapter.insertOne('sandbox_tenants', { id: randomUUID(), tenant_id: tenantId, api_key_hash: apiKey, provisioned_at: now, reset_at: null, api_call_count: 0 });
    await seedSandbox(adapter, tenantId);

    logger.info('Sandbox provisioned', { tenantId });
    res.status(201).json({ tenantId, apiKey });
  } catch (err) {
    logger.error('Sandbox provision error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/sandbox/:tenantId/reset
router.post('/:tenantId/reset', authenticateToken, requireSysAdmin, async (req, res) => {
  try {
    const { tenantId } = req.params;
    if (!tenantId.startsWith('sandbox-')) return res.status(400).json({ error: 'Only sandbox tenants can be reset' });

    const adapter = await getAdapter();
    const sandbox = await adapter.findOne('sandbox_tenants', { tenant_id: tenantId });
    if (!sandbox) return res.status(404).json({ error: 'Sandbox not found' });

    await wipeSandbox(adapter, tenantId);
    await seedSandbox(adapter, tenantId);

    const now = new Date().toISOString();
    await adapter.updateOne('sandbox_tenants', { id: sandbox.id }, { reset_at: now, api_call_count: 0 });

    logger.info('Sandbox reset', { tenantId });
    res.json({ tenantId, reset: true, resetAt: now });
  } catch (err) {
    logger.error('Sandbox reset error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/sandbox/:tenantId
router.delete('/:tenantId', authenticateToken, requireSysAdmin, async (req, res) => {
  try {
    const { tenantId } = req.params;
    if (!tenantId.startsWith('sandbox-')) return res.status(400).json({ error: 'Only sandbox tenants can be deleted' });

    const adapter = await getAdapter();
    const sandbox = await adapter.findOne('sandbox_tenants', { tenant_id: tenantId });
    if (!sandbox) return res.status(404).json({ error: 'Sandbox not found' });

    await wipeSandbox(adapter, tenantId);
    await adapter.deleteOne('sandbox_tenants', { id: sandbox.id });

    logger.info('Sandbox deprovisioned', { tenantId });
    res.json({ tenantId, deleted: true });
  } catch (err) {
    logger.error('Sandbox delete error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
