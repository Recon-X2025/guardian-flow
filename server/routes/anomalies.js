import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';
import { getAdapter } from '../db/factory.js';
import { randomUUID } from 'crypto';
import { detectAnomalies } from '../ml/anomaly.js';

const router = express.Router();
const limiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
router.use(limiter);

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

router.post('/anomalies/detect', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { metricName, values, timestamps, config } = req.body;
    if (!metricName || !Array.isArray(values) || values.length === 0) {
      return res.status(400).json({ error: 'metricName and values[] are required' });
    }

    const numericValues = values.map(Number).filter(v => !isNaN(v));
    if (numericValues.length === 0) {
      return res.status(400).json({ error: 'values must be numeric' });
    }

    // Use consensus multi-method anomaly detection from server/ml/anomaly.js
    const { results, anomalies: detected, stats } = detectAnomalies(numericValues, config ?? {});

    const adapter = await getAdapter();
    const saved = [];
    for (const pt of detected) {
      const anomaly = {
        id: randomUUID(),
        tenant_id: tenantId,
        metric_name: metricName,
        value: pt.value,
        timestamp: timestamps?.[pt.index] ?? new Date().toISOString(),
        z_score: Math.round(pt.deviationScore * 100) / 100,
        severity: pt.severity ?? (pt.deviationScore > 5 ? 'high' : pt.deviationScore > 3 ? 'medium' : 'low'),
        anomaly_type: pt.anomalyType ?? 'outlier',
        confidence: pt.confidence,
        methods_agreed: pt.methodsAgreed,
        detected_at: new Date(),
      };
      saved.push(anomaly);
      try { await adapter.insertOne('anomaly_events', anomaly); } catch (e) { /* skip */ }
    }

    res.json({ anomalies: saved, total: saved.length, stats, all_results: results });
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
