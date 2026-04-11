import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getAdapter } from '../db/factory.js';
import anomalyStream from '../services/streaming/anomaly-stream.js';
import logger from '../utils/logger.js';

const router = express.Router();

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

router.get('/stream', authenticateToken, async (req, res) => {
  if (req.headers.upgrade === 'websocket') {
    return res.status(426).json({
      message: 'WebSocket upgrade required — connect directly to ws://host/api/anomaly/stream',
    });
  }

  try {
    const tenantId = await resolveTenantId(req.user.id);
    res.json({
      message: 'Use WebSocket to subscribe to anomaly stream',
      endpoint: '/ws',
      channel: `tenant:${tenantId}`,
      note: `Subscribe to channel tenant:${tenantId} after connecting to /ws`,
    });
  } catch (err) {
    logger.error('Anomaly stream info error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/test', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { assetId, metric, value } = req.body;

    if (!assetId || !metric || value === undefined) {
      return res.status(400).json({ error: 'assetId, metric, and value are required' });
    }

    const result = anomalyStream.processReading(
      tenantId,
      assetId,
      metric,
      parseFloat(value),
      new Date().toISOString()
    );

    res.json({ processed: true, result });
  } catch (err) {
    logger.error('Anomaly test error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
