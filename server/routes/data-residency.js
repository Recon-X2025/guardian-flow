/**
 * @file server/routes/data-residency.js
 * @description Data Residency & Sovereignty Controls — Sprint 49.
 */
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

// GET /api/data-residency/policies
router.get('/policies', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const policy = await adapter.findOne('residency_policies', { tenant_id: tenantId });
    res.json({ policy: policy || null });
  } catch (err) {
    logger.error('data-residency: get policies error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/data-residency/policies
router.put('/policies', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { primary_region, allowed_regions, restricted_data_types } = req.body;
    if (!primary_region) return res.status(400).json({ error: 'primary_region is required' });

    const adapter = await getAdapter();
    const existing = await adapter.findOne('residency_policies', { tenant_id: tenantId });
    if (existing) {
      await adapter.updateOne('residency_policies', { tenant_id: tenantId }, {
        primary_region,
        allowed_regions: allowed_regions || [primary_region],
        restricted_data_types: restricted_data_types || [],
        updated_at: new Date(),
      });
    } else {
      await adapter.insertOne('residency_policies', {
        id: randomUUID(),
        tenant_id: tenantId,
        primary_region,
        allowed_regions: allowed_regions || [primary_region],
        restricted_data_types: restricted_data_types || [],
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
    const policy = await adapter.findOne('residency_policies', { tenant_id: tenantId });
    res.json({ policy });
  } catch (err) {
    logger.error('data-residency: update policy error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/data-residency/violations
router.get('/violations', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const violations = await adapter.findMany('residency_violations', { tenant_id: tenantId }, { limit: 100, sort: { detected_at: -1 } });
    res.json({ violations });
  } catch (err) {
    logger.error('data-residency: get violations error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/data-residency/classify
router.post('/classify', authenticateToken, async (req, res) => {
  try {
    const { payload_description, fields } = req.body;
    if (!payload_description) return res.status(400).json({ error: 'payload_description is required' });

    const SENSITIVE_KEYWORDS = ['pii', 'health', 'financial', 'biometric', 'ssn', 'passport', 'credit'];
    const desc = payload_description.toLowerCase();
    const detected = SENSITIVE_KEYWORDS.filter(k => desc.includes(k));
    const classification = detected.length > 0 ? 'restricted' : 'standard';

    res.json({
      classification,
      detected_types: detected,
      fields: fields || [],
      requires_residency_enforcement: classification === 'restricted',
    });
  } catch (err) {
    logger.error('data-residency: classify error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
