/**
 * Model Performance Monitor
 * Tracks ML model metrics, drift, and triggers retraining alerts.
 *
 * Routes:
 *   GET    /api/model-performance                        — list monitored models
 *   POST   /api/model-performance                        — register model for monitoring
 *   GET    /api/model-performance/:id                    — get model details + latest metrics
 *   POST   /api/model-performance/:id/metrics            — record performance snapshot
 *   GET    /api/model-performance/:id/metrics            — get metric history
 *   GET    /api/model-performance/:id/drift              — get drift analysis
 *   POST   /api/model-performance/:id/retrain            — trigger retraining
 *   GET    /api/model-performance/alerts                 — list active alerts
 */
import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticateToken);

const MODELS_COL = 'model_monitors';
const METRICS_COL = 'model_performance_metrics';
const ALERTS_COL = 'model_performance_alerts';

// ── GET /api/model-performance/alerts ─────────────────────────────────────────
router.get('/alerts', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const alerts = await db.find(ALERTS_COL, { tenant_id: tenantId, resolved: false }, { sort: { created_at: -1 } });
    res.json({ alerts });
  } catch (err) {
    logger.error('model-performance: alerts', { error: err.message });
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

// ── GET /api/model-performance ────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const models = await db.find(MODELS_COL, { tenant_id: tenantId }, { sort: { created_at: -1 } });
    res.json({ models });
  } catch (err) {
    logger.error('model-performance: list', { error: err.message });
    res.status(500).json({ error: 'Failed to list models' });
  }
});

// ── POST /api/model-performance ───────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const { model_name, model_type, version, drift_threshold, accuracy_threshold } = req.body;
    if (!model_name) return res.status(400).json({ error: 'model_name is required' });

    const monitor = {
      id: randomUUID(),
      tenant_id: tenantId,
      model_name,
      model_type: model_type || 'classification',
      version: version || '1.0.0',
      drift_threshold: drift_threshold ?? 0.1,
      accuracy_threshold: accuracy_threshold ?? 0.8,
      status: 'active',
      latest_accuracy: null,
      latest_drift_score: null,
      retraining_triggered: false,
      created_by: req.user?.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await db.insert(MODELS_COL, monitor);
    res.status(201).json({ monitor });
  } catch (err) {
    logger.error('model-performance: register', { error: err.message });
    res.status(500).json({ error: 'Failed to register model' });
  }
});

// ── GET /api/model-performance/:id ───────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const items = await db.find(MODELS_COL, { id: req.params.id, tenant_id: tenantId });
    if (!items.length) return res.status(404).json({ error: 'Model not found' });
    const latest_metrics = await db.find(METRICS_COL, { model_id: req.params.id }, { sort: { recorded_at: -1 }, limit: 1 });
    res.json({ monitor: items[0], latest_metrics: latest_metrics[0] || null });
  } catch (err) {
    logger.error('model-performance: get', { error: err.message });
    res.status(500).json({ error: 'Failed to get model' });
  }
});

// ── POST /api/model-performance/:id/metrics ──────────────────────────────────
router.post('/:id/metrics', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const models = await db.find(MODELS_COL, { id: req.params.id, tenant_id: tenantId });
    if (!models.length) return res.status(404).json({ error: 'Model not found' });
    const monitor = models[0];

    const { accuracy, precision, recall, f1_score, drift_score, sample_count } = req.body;

    const snapshot = {
      id: randomUUID(),
      model_id: monitor.id,
      tenant_id: tenantId,
      accuracy: accuracy ?? null,
      precision: precision ?? null,
      recall: recall ?? null,
      f1_score: f1_score ?? null,
      drift_score: drift_score ?? null,
      sample_count: sample_count ?? null,
      recorded_at: new Date().toISOString(),
    };
    await db.insert(METRICS_COL, snapshot);

    // Update latest values on monitor
    const monitorUpdates = { updated_at: new Date().toISOString() };
    if (accuracy !== undefined) monitorUpdates.latest_accuracy = accuracy;
    if (drift_score !== undefined) monitorUpdates.latest_drift_score = drift_score;

    // Auto-alert if thresholds breached
    const alerts = [];
    if (accuracy !== undefined && accuracy < monitor.accuracy_threshold) {
      const alert = {
        id: randomUUID(),
        tenant_id: tenantId,
        model_id: monitor.id,
        model_name: monitor.model_name,
        alert_type: 'accuracy_degradation',
        message: `Accuracy dropped to ${accuracy.toFixed(3)} (threshold: ${monitor.accuracy_threshold})`,
        severity: 'high',
        resolved: false,
        created_at: new Date().toISOString(),
      };
      await db.insert(ALERTS_COL, alert);
      alerts.push(alert);
      monitorUpdates.retraining_triggered = false;
    }
    if (drift_score !== undefined && drift_score > monitor.drift_threshold) {
      const alert = {
        id: randomUUID(),
        tenant_id: tenantId,
        model_id: monitor.id,
        model_name: monitor.model_name,
        alert_type: 'data_drift',
        message: `Drift score ${drift_score.toFixed(3)} exceeds threshold ${monitor.drift_threshold}`,
        severity: 'medium',
        resolved: false,
        created_at: new Date().toISOString(),
      };
      await db.insert(ALERTS_COL, alert);
      alerts.push(alert);
    }

    await db.update(MODELS_COL, { id: monitor.id }, { $set: monitorUpdates });

    res.status(201).json({ metric: snapshot, alerts_triggered: alerts.length });
  } catch (err) {
    logger.error('model-performance: record metrics', { error: err.message });
    res.status(500).json({ error: 'Failed to record metrics' });
  }
});

// ── GET /api/model-performance/:id/metrics ───────────────────────────────────
router.get('/:id/metrics', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const models = await db.find(MODELS_COL, { id: req.params.id, tenant_id: tenantId });
    if (!models.length) return res.status(404).json({ error: 'Model not found' });
    const limit = Math.min(parseInt(req.query.limit || '50'), 500);
    const metrics = await db.find(METRICS_COL, { model_id: req.params.id }, { sort: { recorded_at: -1 }, limit });
    res.json({ metrics });
  } catch (err) {
    logger.error('model-performance: get metrics', { error: err.message });
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// ── GET /api/model-performance/:id/drift ─────────────────────────────────────
router.get('/:id/drift', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const models = await db.find(MODELS_COL, { id: req.params.id, tenant_id: tenantId });
    if (!models.length) return res.status(404).json({ error: 'Model not found' });
    const monitor = models[0];

    const metrics = await db.find(METRICS_COL, { model_id: req.params.id }, { sort: { recorded_at: -1 }, limit: 30 });
    const drift_points = metrics.filter(m => m.drift_score !== null).map(m => ({
      timestamp: m.recorded_at,
      drift_score: m.drift_score,
    }));

    const avg_drift = drift_points.length
      ? drift_points.reduce((s, p) => s + p.drift_score, 0) / drift_points.length
      : null;

    res.json({
      model_id: monitor.id,
      model_name: monitor.model_name,
      drift_threshold: monitor.drift_threshold,
      current_drift: monitor.latest_drift_score,
      average_drift_30d: avg_drift,
      drift_exceeded: monitor.latest_drift_score !== null && monitor.latest_drift_score > monitor.drift_threshold,
      history: drift_points,
    });
  } catch (err) {
    logger.error('model-performance: drift', { error: err.message });
    res.status(500).json({ error: 'Failed to get drift analysis' });
  }
});

// ── POST /api/model-performance/:id/retrain ───────────────────────────────────
router.post('/:id/retrain', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const models = await db.find(MODELS_COL, { id: req.params.id, tenant_id: tenantId });
    if (!models.length) return res.status(404).json({ error: 'Model not found' });

    await db.update(MODELS_COL, { id: req.params.id, tenant_id: tenantId }, {
      $set: { retraining_triggered: true, retraining_triggered_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    });

    // Resolve any open accuracy alerts for this model
    await db.update(ALERTS_COL,
      { model_id: req.params.id, alert_type: 'accuracy_degradation', resolved: false },
      { $set: { resolved: true, resolved_at: new Date().toISOString() } }
    );

    res.json({ triggered: true, message: 'Retraining job queued' });
  } catch (err) {
    logger.error('model-performance: retrain', { error: err.message });
    res.status(500).json({ error: 'Failed to trigger retraining' });
  }
});

export default router;
