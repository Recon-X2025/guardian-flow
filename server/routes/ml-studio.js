/**
 * ML Studio Routes
 * GET/POST /api/ml-studio/datasets
 * GET/POST /api/ml-studio/experiments
 * POST     /api/ml-studio/experiments/:id/train
 * POST     /api/ml-studio/experiments/:id/deploy
 * GET      /api/ml-studio/models
 * POST     /api/ml-studio/predict/:model_id
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';
import { trainModel, predictFailure, predictSlaBreach, holtWintersPredict } from '../ml/orchestrator.js';

// Map user-facing algorithm names to orchestrator model types
const ALGORITHM_TO_TYPE = {
  equipment_failure: 'equipment_failure',
  failure_prediction: 'equipment_failure',
  failure: 'equipment_failure',
  sla_breach: 'sla_breach',
  sla_prediction: 'sla_breach',
  sla: 'sla_breach',
  forecast: 'forecast',
  holt_winters: 'forecast',
  time_series: 'forecast',
  forecasting: 'forecast',
};

const router = express.Router();

router.get('/datasets', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const datasets = await adapter.findMany('ml_datasets', { tenant_id: req.user.tenantId });
    res.json({ datasets, total: datasets.length });
  } catch (err) {
    logger.error('MLStudio: list datasets error', { error: err.message });
    res.status(500).json({ error: 'Failed to list datasets' });
  }
});

router.post('/datasets', async (req, res) => {
  try {
    const { name, description, source_collection, feature_columns, target_column, row_count } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const adapter = await getAdapter();
    const dataset = {
      id: randomUUID(), tenant_id: req.user.tenantId, name, description: description || null,
      row_count: row_count || 0, source_collection: source_collection || null,
      feature_columns: feature_columns || [], target_column: target_column || null,
      status: 'active', created_by: req.user.userId, created_at: new Date(),
    };
    await adapter.insertOne('ml_datasets', dataset);
    res.status(201).json({ dataset });
  } catch (err) {
    logger.error('MLStudio: create dataset error', { error: err.message });
    res.status(500).json({ error: 'Failed to create dataset' });
  }
});

router.get('/experiments', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const experiments = await adapter.findMany('ml_experiments', { tenant_id: req.user.tenantId });
    res.json({ experiments, total: experiments.length });
  } catch (err) {
    logger.error('MLStudio: list experiments error', { error: err.message });
    res.status(500).json({ error: 'Failed to list experiments' });
  }
});

router.post('/experiments', async (req, res) => {
  try {
    const { dataset_id, algorithm, hyperparameters } = req.body;
    if (!dataset_id || !algorithm) return res.status(400).json({ error: 'dataset_id and algorithm are required' });
    const adapter = await getAdapter();
    const experiment = {
      id: randomUUID(), tenant_id: req.user.tenantId, dataset_id, algorithm,
      hyperparameters: hyperparameters || {}, status: 'queued', metrics: null,
      trained_at: null, created_by: req.user.userId, created_at: new Date(),
    };
    await adapter.insertOne('ml_experiments', experiment);
    res.status(201).json({ experiment });
  } catch (err) {
    logger.error('MLStudio: create experiment error', { error: err.message });
    res.status(500).json({ error: 'Failed to create experiment' });
  }
});

router.post('/experiments/:id/train', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const experiment = await adapter.findOne('ml_experiments', { id: req.params.id, tenant_id: req.user.tenantId });
    if (!experiment) return res.status(404).json({ error: 'Experiment not found' });

    const modelType = ALGORITHM_TO_TYPE[experiment.algorithm?.toLowerCase()] || experiment.algorithm;
    if (!modelType) return res.status(400).json({ error: 'Unknown algorithm; cannot train' });

    await adapter.updateOne('ml_experiments', { id: req.params.id, tenant_id: req.user.tenantId }, { status: 'training' });

    const result = await trainModel(modelType, {
      tenantId: req.user.tenantId,
      ...(experiment.hyperparameters || {}),
    });

    if (result.error) {
      await adapter.updateOne('ml_experiments', { id: req.params.id, tenant_id: req.user.tenantId }, { status: 'failed' });
      return res.status(500).json({ error: result.error });
    }

    const metrics = result.metrics || result.parameters || {};
    const trained_at = new Date(result.trainedAt || Date.now());
    await adapter.updateOne('ml_experiments', { id: req.params.id, tenant_id: req.user.tenantId }, {
      status: 'completed', metrics, trained_at,
    });
    res.json({ experiment: { ...experiment, status: 'completed', metrics, trained_at }, model_type: modelType, is_synthetic: result.isSynthetic });
  } catch (err) {
    logger.error('MLStudio: train error', { error: err.message });
    res.status(500).json({ error: 'Failed to train experiment' });
  }
});

router.post('/experiments/:id/deploy', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const experiment = await adapter.findOne('ml_experiments', { id: req.params.id, tenant_id: req.user.tenantId });
    if (!experiment) return res.status(404).json({ error: 'Experiment not found' });
    const modelId = randomUUID();
    const deployed_at = new Date();
    const model = {
      id: modelId, experiment_id: req.params.id, tenant_id: req.user.tenantId,
      version: 'v1', endpoint_path: '/api/ml-studio/predict/' + modelId,
      deployed_at, status: 'active', created_at: deployed_at,
    };
    await adapter.insertOne('ml_deployed_models', model);
    res.status(201).json({ model });
  } catch (err) {
    logger.error('MLStudio: deploy error', { error: err.message });
    res.status(500).json({ error: 'Failed to deploy model' });
  }
});

router.get('/models', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const models = await adapter.findMany('ml_deployed_models', { tenant_id: req.user.tenantId });
    res.json({ models, total: models.length });
  } catch (err) {
    logger.error('MLStudio: list models error', { error: err.message });
    res.status(500).json({ error: 'Failed to list models' });
  }
});

router.post('/predict/:model_id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const model = await adapter.findOne('ml_deployed_models', { id: req.params.model_id, tenant_id: req.user.tenantId });
    if (!model) return res.status(404).json({ error: 'Model not found' });

    // Resolve the experiment to get algorithm / model type
    const experiment = model.experiment_id
      ? await adapter.findOne('ml_experiments', { id: model.experiment_id, tenant_id: req.user.tenantId })
      : null;
    const modelType = ALGORITHM_TO_TYPE[(experiment?.algorithm || '').toLowerCase()] || 'equipment_failure';

    const startTime = Date.now();

    if (modelType === 'equipment_failure') {
      const weights = await adapter.findOne('ml_models', { model_type: 'equipment_failure', tenant_id: req.user.tenantId });
      if (!weights) return res.status(422).json({ error: 'Model not trained yet; call /train first' });
      const hp = typeof weights.hyperparameters === 'string' ? JSON.parse(weights.hyperparameters) : weights.hyperparameters;
      const input = req.body;
      const features = [
        input.last_maintenance_days ?? 30,
        input.failure_rate ?? 0.1,
        input.maintenance_count ?? 3,
        input.equipment_age_days ?? 365,
        input.events_per_month ?? 2,
        input.days_since_last_failure ?? 90,
      ];
      const prediction = predictFailure(hp, features);
      return res.json({ ...prediction, model_id: req.params.model_id, model_type: modelType, latency_ms: Date.now() - startTime });
    }

    if (modelType === 'sla_breach') {
      const weights = await adapter.findOne('ml_models', { model_type: 'sla_breach', tenant_id: req.user.tenantId });
      if (!weights) return res.status(422).json({ error: 'Model not trained yet; call /train first' });
      const hp = typeof weights.hyperparameters === 'string' ? JSON.parse(weights.hyperparameters) : weights.hyperparameters;
      const workOrder = {
        created_at: req.body.created_at || new Date().toISOString(),
        priority: req.body.priority || 'medium',
        technician_id: req.body.technician_id || null,
      };
      const prediction = predictSlaBreach(hp, workOrder);
      return res.json({ ...prediction, model_id: req.params.model_id, model_type: modelType, latency_ms: Date.now() - startTime });
    }

    if (modelType === 'forecast') {
      const weights = await adapter.findOne('forecast_models', { tenant_id: req.user.tenantId });
      if (!weights) return res.status(422).json({ error: 'Model not trained yet; call /train first' });
      const config = typeof weights.config === 'string' ? JSON.parse(weights.config) : weights.config;
      const horizon = req.body.horizon ?? 7;
      const predictions = holtWintersPredict(config, horizon);
      return res.json({ predictions, horizon, model_id: req.params.model_id, model_type: modelType, latency_ms: Date.now() - startTime });
    }

    res.status(400).json({ error: `Prediction not supported for model type: ${modelType}` });
  } catch (err) {
    logger.error('MLStudio: predict error', { error: err.message });
    res.status(500).json({ error: 'Failed to run prediction' });
  }
});

export default router;
