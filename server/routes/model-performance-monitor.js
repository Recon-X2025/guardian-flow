/**
 * @file server/routes/model-performance-monitor.js
 * @description ML Model Performance Monitor
 *
 * Tracks prediction quality, detects concept drift, and triggers retraining
 * alerts when model performance degrades below acceptable thresholds.
 * All significant drift events are recorded in the FlowSpace decision ledger.
 *
 * Routes
 * ------
 * POST   /api/model-performance/metrics          — record a batch of prediction outcomes
 * GET    /api/model-performance/metrics          — list metrics for a model
 * GET    /api/model-performance/drift            — run drift analysis for a model
 * POST   /api/model-performance/baseline         — set/update the baseline metrics for a model
 * GET    /api/model-performance/summary          — dashboard summary across all models
 *
 * Drift detection uses Population Stability Index (PSI) approximation:
 *   PSI > 0.25 → significant drift  → RETRAIN alert
 *   PSI > 0.10 → moderate drift     → WARNING
 *   PSI ≤ 0.10 → stable             → OK
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import { writeDecisionRecord } from '../services/flowspace.js';
import logger from '../utils/logger.js';

const router = express.Router();

const METRICS_COLLECTION  = 'model_performance_metrics';
const BASELINE_COLLECTION = 'model_performance_baselines';

const PSI_WARNING_THRESHOLD  = 0.10;
const PSI_CRITICAL_THRESHOLD = 0.25;

// ── Drift helpers ─────────────────────────────────────────────────────────────

/**
 * Compute a simplified PSI (Population Stability Index) between a baseline
 * distribution and an observed distribution.
 *
 * Both arrays should contain numeric values in the same range.
 * Returns a numeric PSI ≥ 0; higher = more drift.
 */
function computePSI(baseline, observed, bins = 10) {
  if (!baseline.length || !observed.length) return 0;

  const min = Math.min(...baseline, ...observed);
  const max = Math.max(...baseline, ...observed);
  if (min === max) return 0;

  const binWidth = (max - min) / bins;
  const baselineBins = new Array(bins).fill(0);
  const observedBins = new Array(bins).fill(0);

  for (const v of baseline) {
    const idx = Math.min(Math.floor((v - min) / binWidth), bins - 1);
    baselineBins[idx]++;
  }
  for (const v of observed) {
    const idx = Math.min(Math.floor((v - min) / binWidth), bins - 1);
    observedBins[idx]++;
  }

  let psi = 0;
  for (let i = 0; i < bins; i++) {
    const bRate = (baselineBins[i] / baseline.length) || 0.001;
    const oRate = (observedBins[i] / observed.length) || 0.001;
    psi += (oRate - bRate) * Math.log(oRate / bRate);
  }

  return Math.abs(psi);
}

/**
 * Compute accuracy, precision, and mean confidence from an array of outcome records.
 * Each record should have: { predicted, actual, confidence }.
 */
function computeMetrics(outcomes) {
  if (!outcomes.length) return { accuracy: null, precision: null, meanConfidence: null, count: 0 };

  const correct = outcomes.filter(o => o.predicted === o.actual).length;
  const accuracy = correct / outcomes.length;

  const truePositives  = outcomes.filter(o => o.predicted === true  && o.actual === true).length;
  const falsePositives = outcomes.filter(o => o.predicted === true  && o.actual === false).length;
  const precision = (truePositives + falsePositives) > 0
    ? truePositives / (truePositives + falsePositives)
    : null;

  const meanConfidence = outcomes.reduce((s, o) => s + (o.confidence || 0), 0) / outcomes.length;

  return { accuracy, precision, meanConfidence, count: outcomes.length };
}

// ── POST /api/model-performance/metrics ──────────────────────────────────────

router.post('/metrics', authenticateToken, async (req, res) => {
  try {
    const { model_name, model_version, outcomes } = req.body;
    const tenantId = req.user.tenantId;

    if (!model_name || !Array.isArray(outcomes) || outcomes.length === 0) {
      return res.status(400).json({ error: 'model_name and outcomes[] are required' });
    }

    const computed = computeMetrics(outcomes);
    const adapter = await getAdapter();

    const record = {
      id: randomUUID(),
      tenant_id: tenantId,
      model_name,
      model_version: model_version || 'unknown',
      accuracy: computed.accuracy,
      precision: computed.precision,
      mean_confidence: computed.meanConfidence,
      sample_count: computed.count,
      outcomes_snapshot: outcomes.slice(0, 100), // store first 100 for drift analysis
      recorded_at: new Date(),
      recorded_by: req.user.id,
    };

    await adapter.insertOne(METRICS_COLLECTION, record);

    logger.info('[model-performance] metrics recorded', {
      tenantId, model_name, accuracy: computed.accuracy, samples: computed.count,
    });

    res.status(201).json({ data: record });
  } catch (err) {
    logger.error('[model-performance] record metrics error', { err: err.message });
    res.status(500).json({ error: 'Failed to record model metrics' });
  }
});

// ── GET /api/model-performance/metrics ───────────────────────────────────────

router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    const { model_name, limit = '50' } = req.query;
    if (!model_name) return res.status(400).json({ error: 'model_name query param is required' });

    const adapter = await getAdapter();
    const records = await adapter.findMany(METRICS_COLLECTION, {
      tenant_id: req.user.tenantId,
      model_name,
    }, {
      sort: { recorded_at: -1 },
      limit: Math.min(parseInt(limit, 10) || 50, 200),
    });

    res.json({ data: records || [] });
  } catch (err) {
    logger.error('[model-performance] list metrics error', { err: err.message });
    res.status(500).json({ error: 'Failed to list metrics' });
  }
});

// ── POST /api/model-performance/baseline ─────────────────────────────────────

router.post('/baseline', authenticateToken, async (req, res) => {
  try {
    const { model_name, model_version, accuracy, precision, mean_confidence, confidence_distribution } = req.body;
    const tenantId = req.user.tenantId;

    if (!model_name) return res.status(400).json({ error: 'model_name is required' });

    const adapter = await getAdapter();
    const existing = await adapter.findOne(BASELINE_COLLECTION, {
      tenant_id: tenantId, model_name,
    });

    const baseline = {
      id: existing?.id || randomUUID(),
      tenant_id: tenantId,
      model_name,
      model_version: model_version || 'unknown',
      accuracy:               accuracy               ?? null,
      precision:              precision              ?? null,
      mean_confidence:        mean_confidence        ?? null,
      confidence_distribution: confidence_distribution ?? [],
      set_at: new Date(),
      set_by: req.user.id,
    };

    if (existing) {
      await adapter.updateOne(BASELINE_COLLECTION, { id: existing.id }, baseline);
    } else {
      await adapter.insertOne(BASELINE_COLLECTION, baseline);
    }

    await writeDecisionRecord({
      tenantId,
      domain: 'ai',
      actorType: 'human',
      actorId: req.user.id,
      action: 'model_baseline_set',
      rationale: `Baseline set for model "${model_name}" version "${baseline.model_version}"`,
      context: { model_name, accuracy, precision, mean_confidence },
      entityType: 'model_baseline',
      entityId: baseline.id,
    });

    res.json({ data: baseline });
  } catch (err) {
    logger.error('[model-performance] set baseline error', { err: err.message });
    res.status(500).json({ error: 'Failed to set model baseline' });
  }
});

// ── GET /api/model-performance/drift ─────────────────────────────────────────

router.get('/drift', authenticateToken, async (req, res) => {
  try {
    const { model_name, window = '50' } = req.query;
    const tenantId = req.user.tenantId;

    if (!model_name) return res.status(400).json({ error: 'model_name query param is required' });

    const adapter = await getAdapter();

    // Fetch baseline
    const baseline = await adapter.findOne(BASELINE_COLLECTION, { tenant_id: tenantId, model_name });

    // Fetch the last N metric records
    const recentMetrics = await adapter.findMany(METRICS_COLLECTION, {
      tenant_id: tenantId, model_name,
    }, {
      sort: { recorded_at: -1 },
      limit: Math.min(parseInt(window, 10) || 50, 200),
    });

    if (!recentMetrics || recentMetrics.length === 0) {
      return res.json({ model_name, status: 'no_data', psi: null, message: 'No metrics recorded yet' });
    }

    // Aggregate confidence values for drift analysis
    const recentConfidences = recentMetrics.flatMap(m =>
      (m.outcomes_snapshot || []).map(o => o.confidence).filter(c => c != null)
    );
    const baselineConfidences = baseline?.confidence_distribution || [];

    const psi = baselineConfidences.length > 0 && recentConfidences.length > 0
      ? computePSI(baselineConfidences, recentConfidences)
      : null;

    // Compute current period performance
    const latestAccuracies = recentMetrics.map(m => m.accuracy).filter(a => a != null);
    const currentAccuracy  = latestAccuracies.length > 0
      ? latestAccuracies.reduce((s, a) => s + a, 0) / latestAccuracies.length
      : null;

    let driftStatus = 'unknown';
    let recommendation = null;

    if (psi !== null) {
      if (psi > PSI_CRITICAL_THRESHOLD) {
        driftStatus = 'significant_drift';
        recommendation = 'RETRAIN: Model has significant concept drift. Immediate retraining recommended.';
      } else if (psi > PSI_WARNING_THRESHOLD) {
        driftStatus = 'moderate_drift';
        recommendation = 'WARNING: Moderate drift detected. Schedule retraining within next sprint.';
      } else {
        driftStatus = 'stable';
        recommendation = 'Model performance is stable.';
      }
    } else if (baseline && currentAccuracy !== null && baseline.accuracy !== null) {
      // Fallback: accuracy-based drift detection when no distribution available
      const drop = baseline.accuracy - currentAccuracy;
      if (drop > 0.10) {
        driftStatus = 'significant_drift';
        recommendation = `RETRAIN: Accuracy dropped ${(drop * 100).toFixed(1)}% from baseline.`;
      } else if (drop > 0.05) {
        driftStatus = 'moderate_drift';
        recommendation = `WARNING: Accuracy dropped ${(drop * 100).toFixed(1)}% from baseline.`;
      } else {
        driftStatus = 'stable';
        recommendation = 'Model performance is within acceptable bounds.';
      }
    }

    // Write FlowSpace record for significant drift events
    if (driftStatus === 'significant_drift') {
      await writeDecisionRecord({
        tenantId,
        domain: 'ai',
        actorType: 'system',
        actorId: 'model-performance-monitor',
        action: 'drift_detected',
        rationale: recommendation,
        context: { model_name, psi, currentAccuracy, baselineAccuracy: baseline?.accuracy },
        entityType: 'ml_model',
        entityId: model_name,
      });
    }

    res.json({
      model_name,
      status: driftStatus,
      psi,
      current_accuracy: currentAccuracy,
      baseline_accuracy: baseline?.accuracy ?? null,
      recommendation,
      samples_analysed: recentMetrics.length,
      window_size: parseInt(window, 10) || 50,
    });
  } catch (err) {
    logger.error('[model-performance] drift analysis error', { err: err.message });
    res.status(500).json({ error: 'Failed to run drift analysis' });
  }
});

// ── GET /api/model-performance/summary ───────────────────────────────────────

router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const adapter = await getAdapter();
    const tenantId = req.user.tenantId;

    // Get latest metric per model
    const allMetrics = await adapter.findMany(METRICS_COLLECTION, { tenant_id: tenantId }, {
      sort: { recorded_at: -1 },
      limit: 500,
    });

    const byModel = {};
    for (const m of (allMetrics || [])) {
      if (!byModel[m.model_name]) byModel[m.model_name] = m;
    }

    const baselines = await adapter.findMany(BASELINE_COLLECTION, { tenant_id: tenantId });
    const baselineMap = {};
    for (const b of (baselines || [])) baselineMap[b.model_name] = b;

    const summary = Object.values(byModel).map(m => ({
      model_name:       m.model_name,
      model_version:    m.model_version,
      latest_accuracy:  m.accuracy,
      baseline_accuracy: baselineMap[m.model_name]?.accuracy ?? null,
      accuracy_delta:   m.accuracy != null && baselineMap[m.model_name]?.accuracy != null
        ? m.accuracy - baselineMap[m.model_name].accuracy
        : null,
      sample_count:     m.sample_count,
      last_recorded_at: m.recorded_at,
    }));

    res.json({ data: summary });
  } catch (err) {
    logger.error('[model-performance] summary error', { err: err.message });
    res.status(500).json({ error: 'Failed to get model summary' });
  }
});

export default router;
