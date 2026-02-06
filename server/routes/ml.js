import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { trainModel } from '../ml/orchestrator.js';
import { predictFailure } from '../ml/failure.js';
import { predictSlaBreach } from '../ml/sla.js';
import { holtWintersPredict } from '../ml/forecasting.js';
import { detectAnomalies } from '../ml/anomaly.js';
import { db } from '../db/client.js';

export default function mlRoutes() {
  const router = express.Router();

  // --- Training endpoints (require auth + admin) ---

  router.post('/train/failure', authenticateToken, async (req, res) => {
    try {
      const result = await trainModel('equipment_failure', req.body || {});
      res.json(result);
    } catch (err) {
      console.error('Train failure model error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/train/sla', authenticateToken, async (req, res) => {
    try {
      const result = await trainModel('sla_breach', req.body || {});
      res.json(result);
    } catch (err) {
      console.error('Train SLA model error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/train/forecast', authenticateToken, async (req, res) => {
    try {
      const result = await trainModel('forecast', req.body || {});
      res.json(result);
    } catch (err) {
      console.error('Train forecast model error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // --- Prediction endpoints ---

  router.post('/predict/failure', authenticateToken, async (req, res) => {
    try {
      const { equipmentId } = req.body;

      // Load trained model
      const model = await db.collection('ml_models').findOne(
        { model_type: 'equipment_failure', status: 'deployed' },
        { sort: { updated_at: -1 } }
      );

      if (!model) {
        return res.status(404).json({ error: 'No trained model found. Run POST /api/ml/train/failure first.' });
      }

      const modelWeights = model.hyperparameters;

      // Get equipment events
      const events = await db.collection('asset_lifecycle_events')
        .find({ asset_id: equipmentId })
        .sort({ event_time: -1 })
        .toArray();

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
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/predict/sla', authenticateToken, async (req, res) => {
    try {
      const { workOrderId } = req.body;

      const model = await db.collection('ml_models').findOne(
        { model_type: 'sla_breach', status: 'deployed' },
        { sort: { updated_at: -1 } }
      );

      if (!model) {
        return res.status(404).json({ error: 'No trained model found. Run POST /api/ml/train/sla first.' });
      }

      const modelWeights = model.hyperparameters;

      if (workOrderId) {
        const wo = await db.collection('work_orders').findOne({ id: workOrderId });
        if (!wo) return res.status(404).json({ error: 'Work order not found' });
        const woData = {
          id: wo.id,
          created_at: wo.created_at,
          priority: wo.repair_type || 'medium',
          technician_id: null,
        };
        const prediction = predictSlaBreach(modelWeights, woData);
        return res.json({ workOrderId, ...prediction });
      }

      // Predict for all open work orders
      const openOrders = await db.collection('work_orders')
        .find({ status: { $nin: ['completed', 'cancelled'] } })
        .limit(100)
        .toArray();

      const predictions = openOrders.map(wo => ({
        workOrderId: wo.id,
        ...predictSlaBreach(modelWeights, {
          id: wo.id,
          created_at: wo.created_at,
          priority: wo.repair_type || 'medium',
          technician_id: null,
        }),
      }));

      const atRiskCount = predictions.filter(p => p.atRisk).length;
      res.json({
        totalOrders: predictions.length,
        atRiskOrders: atRiskCount,
        predictions,
      });
    } catch (err) {
      console.error('Predict SLA error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/predict/forecast', authenticateToken, async (req, res) => {
    try {
      const { forecastType = 'repair_volume', horizon = 30 } = req.body;

      const model = await db.collection('forecast_models').findOne(
        { model_type: forecastType, algorithm: 'holt_winters' },
        { sort: { created_at: -1 } }
      );

      if (!model) {
        return res.status(404).json({ error: 'No trained model found. Run POST /api/ml/train/forecast first.' });
      }

      const weights = model.config;
      const predictions = holtWintersPredict(weights, horizon);
      res.json({ forecastType, horizon, predictions, model: { alpha: weights.alpha, beta: weights.beta, gamma: weights.gamma } });
    } catch (err) {
      console.error('Predict forecast error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // --- Anomaly detection ---

  router.post('/detect/anomalies', authenticateToken, async (req, res) => {
    try {
      const { values, config } = req.body;

      if (!values || !Array.isArray(values)) {
        return res.status(400).json({ error: 'Request body must include a "values" array of numbers' });
      }

      const result = detectAnomalies(values, config || {});
      res.json(result);
    } catch (err) {
      console.error('Anomaly detection error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // --- Model management ---

  router.get('/models', authenticateToken, async (req, res) => {
    try {
      const models = await db.collection('ml_models')
        .find({}, {
          projection: {
            id: 1, model_name: 1, model_type: 1, framework: 1, status: 1,
            accuracy_score: 1, precision_score: 1, recall_score: 1, f1_score: 1,
            training_data_size: 1, created_at: 1, updated_at: 1,
          },
        })
        .sort({ updated_at: -1 })
        .limit(50)
        .toArray();
      res.json(models);
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/models/:id', authenticateToken, async (req, res) => {
    try {
      const model = await db.collection('ml_models').findOne({ id: req.params.id });
      if (!model) return res.status(404).json({ error: 'Model not found' });
      res.json(model);
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
