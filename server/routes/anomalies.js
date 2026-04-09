import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';
import { getAdapter } from '../db/factory.js';
import { randomUUID } from 'crypto';

const router = express.Router();
const limiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
router.use(limiter);

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

function mean(arr) { return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length; }
function stdDev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

router.post('/anomalies/detect', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { metricName, values, timestamps } = req.body;
    if (!metricName || !Array.isArray(values) || values.length === 0) {
      return res.status(400).json({ error: 'metricName and values[] are required' });
    }

    const m = mean(values);
    const s = stdDev(values);
    const anomalies = [];
    const adapter = await getAdapter();

    for (let i = 0; i < values.length; i++) {
      const z = s === 0 ? 0 : (values[i] - m) / s;
      if (Math.abs(z) > 2.5) {
        const anomaly = {
          id: randomUUID(),
          tenant_id: tenantId,
          metric_name: metricName,
          value: values[i],
          timestamp: timestamps?.[i] || new Date().toISOString(),
          z_score: Math.round(z * 100) / 100,
          severity: Math.abs(z) > 3.5 ? 'high' : 'medium',
          detected_at: new Date(),
        };
        anomalies.push(anomaly);
        try { await adapter.insertOne('anomaly_events', anomaly); } catch (e) { /* skip */ }
      }
    }
    res.json({ anomalies, total: anomalies.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/anomalies', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const anomalies = await adapter.findMany('anomaly_events', { tenant_id: tenantId }, { sort: { detected_at: -1 }, limit: 100 });
    res.json({ anomalies });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
