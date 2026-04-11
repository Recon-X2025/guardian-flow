import express from 'express';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import { estimateRUL } from '../services/ai/rul-model.js';
import logger from '../utils/logger.js';

const router = express.Router({ mergeParams: true });

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

// GET /api/assets/:id/rul
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const assetId = req.params.id;
    const adapter = await getAdapter();

    const asset = await adapter.findOne('assets', { id: assetId, tenant_id: tenantId });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    // Fetch last 90 days of IoT readings for this asset
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const allReadings = await adapter.findMany('iot_readings', { tenant_id: tenantId, device_id: assetId }, { limit: 1000 });
    const readings = allReadings
      .filter(r => r.timestamp >= cutoff)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (readings.length < 2) {
      return res.json({ rul: null, message: 'Insufficient data for RUL estimation' });
    }

    const mean = readings.reduce((s, r) => s + r.value, 0) / readings.length;
    const failureThreshold = mean * 0.2;

    const rul = estimateRUL(readings, failureThreshold);

    // Store result on asset
    await adapter.updateOne('assets', { id: assetId }, {
      rul_estimate: rul,
      rul_days_remaining: rul.estimatedRULDays,
      rul_computed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    res.json({ assetId, rul, failureThreshold, readingsCount: readings.length });
  } catch (err) {
    logger.error('RUL estimation error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
