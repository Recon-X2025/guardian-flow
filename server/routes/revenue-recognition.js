import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

router.get('/contracts', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const contracts = await adapter.findMany('rev_rec_contracts', { tenant_id: tenantId }, { limit: 50 });
    res.json({ contracts });
  } catch (err) {
    logger.error('Rev rec contracts list error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/contracts', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { customer_id, total_value, obligations, start_date, end_date } = req.body;
    if (!customer_id || !total_value || !obligations) {
      return res.status(400).json({ error: 'customer_id, total_value, and obligations are required' });
    }
    const adapter = await getAdapter();
    const contract = {
      id: randomUUID(),
      tenant_id: tenantId,
      customer_id,
      total_value,
      obligations,
      start_date,
      end_date,
      recognized_amount: 0,
      status: 'active',
      created_at: new Date().toISOString(),
    };
    await adapter.insertOne('rev_rec_contracts', contract);
    res.status(201).json({ contract });
  } catch (err) {
    logger.error('Rev rec contract create error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/contracts/:id/recognize', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { period_start, period_end } = req.body;
    const adapter = await getAdapter();
    const contract = await adapter.findOne('rev_rec_contracts', { id: req.params.id, tenant_id: tenantId });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    const contractStart = new Date(contract.start_date).getTime();
    const contractEnd = new Date(contract.end_date).getTime();
    const totalDays = (contractEnd - contractStart) / 86400000;
    const periodStartMs = new Date(period_start).getTime();
    const periodEndMs = new Date(period_end).getTime();
    const periodDays = Math.min(periodEndMs, contractEnd) - Math.max(periodStartMs, contractStart);
    const periodDaysClamped = Math.max(0, periodDays / 86400000);
    const recognizedAmount = totalDays > 0 ? (periodDaysClamped / totalDays) * contract.total_value : 0;
    const schedule = {
      id: randomUUID(),
      tenant_id: tenantId,
      contract_id: contract.id,
      period_start,
      period_end,
      recognized_amount: Math.round(recognizedAmount * 100) / 100,
      deferred_amount: Math.round((contract.total_value - recognizedAmount) * 100) / 100,
      created_at: new Date().toISOString(),
    };
    await adapter.insertOne('rev_rec_schedules', schedule);
    res.json({ schedule });
  } catch (err) {
    logger.error('Rev rec recognize error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/contracts/:id/schedule', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const schedules = await adapter.findMany('rev_rec_schedules', { tenant_id: tenantId, contract_id: req.params.id }, { limit: 100 });
    res.json({ schedules });
  } catch (err) {
    logger.error('Rev rec schedule error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const schedules = await adapter.findMany('rev_rec_schedules', { tenant_id: tenantId }, { limit: 500 });
    const recognized = schedules.reduce((s, r) => s + (r.recognized_amount || 0), 0);
    const deferred = schedules.reduce((s, r) => s + (r.deferred_amount || 0), 0);
    res.json({ recognized: Math.round(recognized * 100) / 100, deferred: Math.round(deferred * 100) / 100, entries: schedules.length });
  } catch (err) {
    logger.error('Rev rec summary error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
