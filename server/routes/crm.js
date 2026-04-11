/**
 * @file server/routes/crm.js
 * @description CRM Pipeline — Sprint 39.
 *
 * Routes (all tenant-scoped, require authenticateToken)
 * -------------------------------------------------------
 * POST /api/crm/deals                  — create deal
 * GET  /api/crm/deals                  — list deals (filter: stage, owner)
 * GET  /api/crm/deals/:id              — get deal with activities
 * PUT  /api/crm/deals/:id              — update deal
 * PUT  /api/crm/deals/:id/stage        — update stage + log activity
 * DELETE /api/crm/deals/:id            — soft-delete
 * POST /api/crm/activities             — log activity
 * GET  /api/crm/pipeline/summary       — pipeline summary + forecast
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();
const DEALS_COL      = 'deals';
const ACTIVITIES_COL = 'crm_activities';

const VALID_STAGES = ['Prospect', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

// ── POST /deals ───────────────────────────────────────────────────────────────

router.post('/deals', async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const {
      title, accountId, contactId, stage = 'Prospect',
      amount = 0, probability = 10, expectedCloseDate, owner, notes,
    } = req.body;

    if (!title) return res.status(400).json({ error: 'title is required' });

    const now  = new Date().toISOString();
    const deal = {
      id: randomUUID(),
      tenantId,
      title,
      accountId:         accountId   || null,
      contactId:         contactId   || null,
      stage:             VALID_STAGES.includes(stage) ? stage : 'Prospect',
      amount:            Number(amount),
      probability:       Math.min(100, Math.max(0, Number(probability))),
      expectedCloseDate: expectedCloseDate || null,
      owner:             owner || req.user.id,
      notes:             notes || null,
      status:            'open',
      createdAt:         now,
      updatedAt:         now,
    };

    const adapter = await getAdapter();
    await adapter.insertOne(DEALS_COL, deal);
    res.status(201).json({ deal });
  } catch (err) {
    logger.error('CRM: create deal error', { error: err.message });
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

// ── GET /deals ────────────────────────────────────────────────────────────────

router.get('/deals', async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const filter   = { tenantId };

    if (req.query.stage) filter.stage  = req.query.stage;
    if (req.query.owner) filter.owner  = req.query.owner;
    // Exclude soft-deleted
    filter.status = { $ne: 'deleted' };

    const adapter = await getAdapter();
    const deals   = await adapter.findMany(DEALS_COL, filter, { limit: 500 });
    res.json({ deals, total: deals.length });
  } catch (err) {
    logger.error('CRM: list deals error', { error: err.message });
    res.status(500).json({ error: 'Failed to list deals' });
  }
});

// ── GET /deals/:id ────────────────────────────────────────────────────────────

router.get('/deals/:id', async (req, res) => {
  try {
    const tenantId  = await resolveTenantId(req.user.id);
    const adapter   = await getAdapter();
    const deal      = await adapter.findOne(DEALS_COL, { id: req.params.id, tenantId });
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    const activities = await adapter.findMany(
      ACTIVITIES_COL,
      { dealId: req.params.id, tenantId },
      { limit: 100 },
    );
    res.json({ deal, activities });
  } catch (err) {
    logger.error('CRM: get deal error', { error: err.message });
    res.status(500).json({ error: 'Failed to get deal' });
  }
});

// ── PUT /deals/:id ────────────────────────────────────────────────────────────

router.put('/deals/:id', async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const deal     = await adapter.findOne(DEALS_COL, { id: req.params.id, tenantId });
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    const allowed = ['title','accountId','contactId','stage','amount','probability','expectedCloseDate','owner','notes','status'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.stage && !VALID_STAGES.includes(updates.stage)) {
      return res.status(400).json({ error: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}` });
    }
    updates.updatedAt = new Date().toISOString();

    await adapter.updateOne(DEALS_COL, { id: req.params.id, tenantId }, { $set: updates });
    res.json({ message: 'Deal updated', id: req.params.id });
  } catch (err) {
    logger.error('CRM: update deal error', { error: err.message });
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

// ── PUT /deals/:id/stage ──────────────────────────────────────────────────────

router.put('/deals/:id/stage', async (req, res) => {
  try {
    const { stage } = req.body;
    if (!stage) return res.status(400).json({ error: 'stage is required' });
    if (!VALID_STAGES.includes(stage)) {
      return res.status(400).json({ error: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}` });
    }

    const tenantId  = await resolveTenantId(req.user.id);
    const adapter   = await getAdapter();
    const deal      = await adapter.findOne(DEALS_COL, { id: req.params.id, tenantId });
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    const prevStage = deal.stage;
    const now       = new Date().toISOString();

    await adapter.updateOne(DEALS_COL, { id: req.params.id, tenantId }, {
      $set: { stage, updatedAt: now },
    });

    // Log activity
    const activity = {
      id:        randomUUID(),
      tenantId,
      type:      'note',
      dealId:    req.params.id,
      contactId: deal.contactId || null,
      summary:   `Stage changed from "${prevStage}" to "${stage}"`,
      timestamp: now,
    };
    await adapter.insertOne(ACTIVITIES_COL, activity);

    res.json({ message: 'Stage updated', id: req.params.id, stage, activity });
  } catch (err) {
    logger.error('CRM: update stage error', { error: err.message });
    res.status(500).json({ error: 'Failed to update stage' });
  }
});

// ── DELETE /deals/:id ─────────────────────────────────────────────────────────

router.delete('/deals/:id', async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const deal     = await adapter.findOne(DEALS_COL, { id: req.params.id, tenantId });
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    await adapter.updateOne(DEALS_COL, { id: req.params.id, tenantId }, {
      $set: { status: 'deleted', updatedAt: new Date().toISOString() },
    });
    res.json({ message: 'Deal deleted', id: req.params.id });
  } catch (err) {
    logger.error('CRM: delete deal error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete deal' });
  }
});

// ── POST /activities ──────────────────────────────────────────────────────────

router.post('/activities', async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { type, dealId, contactId, summary } = req.body;

    const VALID_TYPES = ['email', 'call', 'meeting', 'note'];
    if (!type || !VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
    }
    if (!summary) return res.status(400).json({ error: 'summary is required' });

    const now      = new Date().toISOString();
    const activity = {
      id:        randomUUID(),
      tenantId,
      type,
      dealId:    dealId    || null,
      contactId: contactId || null,
      summary,
      timestamp: now,
    };

    const adapter = await getAdapter();
    await adapter.insertOne(ACTIVITIES_COL, activity);
    res.status(201).json({ activity });
  } catch (err) {
    logger.error('CRM: create activity error', { error: err.message });
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

// ── GET /pipeline/summary ─────────────────────────────────────────────────────

router.get('/pipeline/summary', async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const deals    = await adapter.findMany(
      DEALS_COL,
      { tenantId, status: { $ne: 'deleted' } },
      { limit: 2000 },
    );

    // Group by stage
    const stageMap = {};
    for (const d of deals) {
      if (!stageMap[d.stage]) stageMap[d.stage] = { stage: d.stage, count: 0, totalAmount: 0, weightedARR: 0 };
      stageMap[d.stage].count       += 1;
      stageMap[d.stage].totalAmount += Number(d.amount) || 0;
      stageMap[d.stage].weightedARR += ((Number(d.amount) || 0) * (Number(d.probability) || 0)) / 100;
    }
    const stages = VALID_STAGES.map(s => stageMap[s] ?? { stage: s, count: 0, totalAmount: 0, weightedARR: 0 });

    // Forecast this month: open deals expected to close this month * probability
    const now        = new Date();
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const forecastThisMonth = deals
      .filter(d => d.status === 'open' && d.expectedCloseDate >= monthStart && d.expectedCloseDate <= monthEnd)
      .reduce((sum, d) => sum + ((Number(d.amount) || 0) * (Number(d.probability) || 0)) / 100, 0);

    res.json({ stages, forecastThisMonth: Math.round(forecastThisMonth * 100) / 100 });
  } catch (err) {
    logger.error('CRM: pipeline summary error', { error: err.message });
    res.status(500).json({ error: 'Failed to get pipeline summary' });
  }
});

export default router;
