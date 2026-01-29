import express from 'express';
import { trainModel } from '../ml/orchestrator.js';
import { predictFailure } from '../ml/failure.js';
import { predictSlaBreach } from '../ml/sla.js';
import { holtWintersPredict } from '../ml/forecasting.js';
import { detectAnomalies } from '../ml/anomaly.js';

export default function mlRoutes(pool) {
  const router = express.Router();

  // --- Training endpoints ---

  router.post('/train/failure', async (req, res) => {
    try {
      const result = await trainModel(pool, 'equipment_failure', req.body || {});
      res.json(result);
    } catch (err) {
      console.error('Train failure model error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/train/sla', async (req, res) => {
    try {
      const result = await trainModel(pool, 'sla_breach', req.body || {});
      res.json(result);
    } catch (err) {
      console.error('Train SLA model error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/train/forecast', async (req, res) => {
    try {
      const result = await trainModel(pool, 'forecast', req.body || {});
      res.json(result);
    } catch (err) {
      console.error('Train forecast model error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- Prediction endpoints ---

  router.post('/predict/failure', async (req, res) => {
    try {
      const { equipmentId } = req.body;

      // Load trained model
      const { rows } = await pool.query(
        `SELECT hyperparameters FROM ml_models
         WHERE model_type = 'equipment_failure' AND status = 'deployed'
         ORDER BY updated_at DESC LIMIT 1`
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'No trained model found. Run POST /api/ml/train/failure first.' });
      }

      const modelWeights = rows[0].hyperparameters;

      // Get equipment events
      const { rows: events } = await pool.query(
        `SELECT event_type, event_time FROM asset_lifecycle_events
         WHERE asset_id = $1 ORDER BY event_time DESC`,
        [equipmentId]
      );

      const maintenanceEvents = events.filter(e => e.event_type === 'maintenance');
      const failureEvents = events.filter(e => e.event_type === 'failure');
      const now = Date.now();

      const features = [
        maintenanceEvents.length > 0
          ? (now - new Date(maintenanceEvents[0].event_time).getTime()) / 86400000 : 365,
        events.length > 0 ? failureEvents.length / events.length : 0,
        maintenanceEvents.length,
        events.length > 0 ? (now - new Date(events[events.length - 1].event_time).getTime()) / 86400000 : 365,
        events.length / Math.max((events.length > 0 ? (now - new Date(events[events.length - 1].event_time).getTime()) / 86400000 / 30 : 1), 1),
        failureEvents.length > 0
          ? (now - new Date(failureEvents[0].event_time).getTime()) / 86400000 : 999,
      ];

      const prediction = predictFailure(modelWeights, features);
      res.json({ equipmentId, ...prediction });
    } catch (err) {
      console.error('Predict failure error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/predict/sla', async (req, res) => {
    try {
      const { workOrderId } = req.body;

      const { rows: models } = await pool.query(
        `SELECT hyperparameters FROM ml_models
         WHERE model_type = 'sla_breach' AND status = 'deployed'
         ORDER BY updated_at DESC LIMIT 1`
      );

      if (models.length === 0) {
        return res.status(404).json({ error: 'No trained model found. Run POST /api/ml/train/sla first.' });
      }

      const modelWeights = models[0].hyperparameters;

      if (workOrderId) {
        const { rows: wos } = await pool.query(
          `SELECT id, created_at, COALESCE(repair_type, 'medium') as priority, NULL as technician_id FROM work_orders WHERE id = $1`,
          [workOrderId]
        );
        if (wos.length === 0) return res.status(404).json({ error: 'Work order not found' });
        const prediction = predictSlaBreach(modelWeights, wos[0]);
        return res.json({ workOrderId, ...prediction });
      }

      // Predict for all open work orders
      const { rows: openOrders } = await pool.query(
        `SELECT id, created_at, COALESCE(repair_type, 'medium') as priority, NULL as technician_id FROM work_orders
         WHERE status NOT IN ('completed', 'cancelled') LIMIT 100`
      );

      const predictions = openOrders.map(wo => ({
        workOrderId: wo.id,
        ...predictSlaBreach(modelWeights, wo),
      }));

      const atRiskCount = predictions.filter(p => p.atRisk).length;
      res.json({
        totalOrders: predictions.length,
        atRiskOrders: atRiskCount,
        predictions,
      });
    } catch (err) {
      console.error('Predict SLA error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/predict/forecast', async (req, res) => {
    try {
      const { forecastType = 'repair_volume', horizon = 30 } = req.body;

      const { rows } = await pool.query(
        `SELECT config FROM forecast_models
         WHERE model_type = $1 AND algorithm = 'holt_winters'
         ORDER BY created_at DESC LIMIT 1`,
        [forecastType]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'No trained model found. Run POST /api/ml/train/forecast first.' });
      }

      const weights = rows[0].config;
      const predictions = holtWintersPredict(weights, horizon);
      res.json({ forecastType, horizon, predictions, model: { alpha: weights.alpha, beta: weights.beta, gamma: weights.gamma } });
    } catch (err) {
      console.error('Predict forecast error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- Anomaly detection ---

  router.post('/detect/anomalies', async (req, res) => {
    try {
      const { values, config } = req.body;

      if (!values || !Array.isArray(values)) {
        return res.status(400).json({ error: 'Request body must include a "values" array of numbers' });
      }

      const result = detectAnomalies(values, config || {});
      res.json(result);
    } catch (err) {
      console.error('Anomaly detection error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- Model management ---

  router.get('/models', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, model_name, model_type, framework, status,
         accuracy_score, precision_score, recall_score, f1_score,
         training_data_size, created_at, updated_at
         FROM ml_models ORDER BY updated_at DESC LIMIT 50`
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/models/:id', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM ml_models WHERE id = $1`,
        [req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Model not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
