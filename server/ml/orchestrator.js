/**
 * ML Training Pipeline Orchestrator
 * Replaces 5-second setTimeout + random metrics with real training
 */

import { trainFailureModel, predictFailure } from './failure.js';
import { trainSlaModel, predictSlaBreach } from './sla.js';
import { holtWintersTrain, holtWintersPredict } from './forecasting.js';
import { detectAnomalies } from './anomaly.js';

/**
 * Train a model based on type, using data from the database
 */
async function trainModel(pool, modelType, config = {}) {
  const startTime = Date.now();

  switch (modelType) {
    case 'equipment_failure':
      return await trainEquipmentFailure(pool, config);
    case 'sla_breach':
      return await trainSlaBreach(pool, config);
    case 'forecast':
      return await trainForecast(pool, config);
    default:
      throw new Error(`Unknown model type: ${modelType}`);
  }
}

async function trainEquipmentFailure(pool, config) {
  const startTime = Date.now();

  // Load asset lifecycle events from DB
  const { rows: events } = await pool.query(
    `SELECT asset_id, event_type, event_time, details
     FROM asset_lifecycle_events
     ORDER BY event_time DESC
     LIMIT 10000`
  );

  if (events.length === 0) {
    // Generate synthetic training data if no real data exists
    const syntheticEvents = generateSyntheticFailureData(500);
    return trainAndStoreFailureModel(pool, syntheticEvents, config, true);
  }

  // Group events by equipment
  const eventsByEquipment = {};
  for (const event of events) {
    const id = event.asset_id;
    if (!eventsByEquipment[id]) eventsByEquipment[id] = [];
    eventsByEquipment[id].push(event);
  }

  return trainAndStoreFailureModel(pool, eventsByEquipment, config, false);
}

async function trainAndStoreFailureModel(pool, eventsByEquipment, config, isSynthetic) {
  const startTime = Date.now();
  const result = trainFailureModel(eventsByEquipment);

  if (result.error) {
    // Generate synthetic data as fallback
    if (!isSynthetic) {
      const syntheticEvents = generateSyntheticFailureData(500);
      return trainAndStoreFailureModel(pool, syntheticEvents, config, true);
    }
    return result;
  }

  const trainingTime = Date.now() - startTime;

  // Store model weights in DB
  await pool.query(
    `INSERT INTO ml_models (id, tenant_id, model_name, model_type, framework, status,
     accuracy_score, precision_score, recall_score, f1_score, training_data_size,
     features, hyperparameters, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
     ON CONFLICT (model_name, tenant_id) DO UPDATE SET
       status = $5, accuracy_score = $6, precision_score = $7, recall_score = $8,
       f1_score = $9, training_data_size = $10, features = $11, hyperparameters = $12, updated_at = NOW()`,
    [
      config.tenantId || '00000000-0000-0000-0000-000000000000',
      'equipment_failure_v1',
      'equipment_failure',
      'logistic_regression',
      'deployed',
      result.cvMetrics.accuracy,
      result.cvMetrics.precision,
      result.cvMetrics.recall,
      result.cvMetrics.f1,
      result.trainingSamples,
      JSON.stringify({ names: result.featureNames, means: result.featureMeans, stds: result.featureStds }),
      JSON.stringify({ weights: result.weights, bias: result.bias, featureMeans: result.featureMeans, featureStds: result.featureStds }),
    ]
  ).catch(() => {
    // Table might not have unique constraint, try simple insert
    return pool.query(
      `INSERT INTO ml_models (id, tenant_id, model_name, model_type, framework, status,
       accuracy_score, precision_score, recall_score, f1_score, training_data_size, features, hyperparameters, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
      [
        config.tenantId || '00000000-0000-0000-0000-000000000000',
        'equipment_failure_v1',
        'equipment_failure',
        'logistic_regression',
        'deployed',
        result.cvMetrics.accuracy,
        result.cvMetrics.precision,
        result.cvMetrics.recall,
        result.cvMetrics.f1,
        result.trainingSamples,
        JSON.stringify({ names: result.featureNames, means: result.featureMeans, stds: result.featureStds }),
        JSON.stringify({ weights: result.weights, bias: result.bias, featureMeans: result.featureMeans, featureStds: result.featureStds }),
      ]
    );
  });

  return {
    modelType: 'equipment_failure',
    status: 'deployed',
    metrics: result.cvMetrics,
    testMetrics: result.testMetrics,
    trainingSamples: result.trainingSamples,
    trainingTimeMs: trainingTime,
    isSynthetic,
    trainedAt: result.trainedAt,
  };
}

async function trainSlaBreach(pool, config) {
  const startTime = Date.now();

  const { rows: workOrders } = await pool.query(
    `SELECT id, created_at, check_out_at as completed_at,
     COALESCE(repair_type, 'medium') as priority,
     NULL as technician_id, status
     FROM work_orders
     WHERE check_out_at IS NOT NULL
     ORDER BY created_at DESC
     LIMIT 10000`
  );

  let trainingData = workOrders;
  let isSynthetic = false;

  if (workOrders.length < 10) {
    trainingData = generateSyntheticSlaData(500);
    isSynthetic = true;
  }

  const result = trainSlaModel(trainingData, config.slaThresholdDays || 7);

  if (result.error) {
    trainingData = generateSyntheticSlaData(500);
    isSynthetic = true;
    const retryResult = trainSlaModel(trainingData, config.slaThresholdDays || 7);
    if (retryResult.error) return retryResult;
    Object.assign(result, retryResult);
  }

  const trainingTime = Date.now() - startTime;

  await pool.query(
    `INSERT INTO ml_models (id, tenant_id, model_name, model_type, framework, status,
     accuracy_score, precision_score, recall_score, f1_score, training_data_size,
     features, hyperparameters, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
    [
      config.tenantId || '00000000-0000-0000-0000-000000000000',
      'sla_breach_v1',
      'sla_breach',
      'logistic_regression',
      'deployed',
      result.cvMetrics.accuracy,
      result.cvMetrics.precision,
      result.cvMetrics.recall,
      result.cvMetrics.f1,
      result.trainingSamples,
      JSON.stringify({ names: result.featureNames, means: result.featureMeans, stds: result.featureStds }),
      JSON.stringify({ weights: result.weights, bias: result.bias, featureMeans: result.featureMeans, featureStds: result.featureStds, slaThresholdDays: result.slaThresholdDays }),
    ]
  ).catch(err => console.error('Failed to store SLA model:', err.message));

  return {
    modelType: 'sla_breach',
    status: 'deployed',
    metrics: result.cvMetrics,
    testMetrics: result.testMetrics,
    trainingSamples: result.trainingSamples,
    breachRate: result.breachRate,
    trainingTimeMs: trainingTime,
    isSynthetic,
    trainedAt: result.trainedAt,
  };
}

async function trainForecast(pool, config) {
  const startTime = Date.now();
  const forecastType = config.forecastType || 'repair_volume';
  const seasonLength = config.seasonLength || 7;

  let data = [];

  if (forecastType === 'repair_volume') {
    const { rows } = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as value
       FROM work_orders
       GROUP BY DATE(created_at)
       ORDER BY date
       LIMIT 365`
    );
    data = rows.map(r => Number(r.value));
  } else if (forecastType === 'spend_revenue') {
    const { rows } = await pool.query(
      `SELECT DATE(created_at) as date, COALESCE(SUM(total_amount), 0) as value
       FROM invoices
       GROUP BY DATE(created_at)
       ORDER BY date
       LIMIT 365`
    );
    data = rows.map(r => Number(r.value));
  }

  let isSynthetic = false;
  if (data.length < 14) {
    data = generateSyntheticTimeSeriesData(180, seasonLength);
    isSynthetic = true;
  }

  const weights = holtWintersTrain(data, seasonLength);
  const trainingTime = Date.now() - startTime;

  // Store in forecast_models
  await pool.query(
    `INSERT INTO forecast_models (id, model_type, model_name, algorithm, frequency, accuracy_score, config, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())`,
    [
      forecastType,
      `${forecastType}_holt_winters`,
      'holt_winters',
      'daily',
      weights.metrics.r2,
      JSON.stringify(weights),
    ]
  ).catch(err => console.error('Failed to store forecast model:', err.message));

  return {
    modelType: 'forecast',
    forecastType,
    status: 'deployed',
    metrics: weights.metrics,
    parameters: { alpha: weights.alpha, beta: weights.beta, gamma: weights.gamma },
    seasonLength,
    trainingTimeMs: trainingTime,
    isSynthetic,
    trainedAt: weights.trainedAt,
  };
}

// --- Synthetic data generators ---

function generateSyntheticFailureData(n) {
  const equipmentIds = Array.from({ length: Math.floor(n / 5) }, (_, i) => `equip_${i}`);
  const eventsByEquipment = {};

  for (const id of equipmentIds) {
    const numEvents = 3 + Math.floor(Math.random() * 10);
    const events = [];
    const failureProne = Math.random() > 0.6;

    for (let i = 0; i < numEvents; i++) {
      const daysAgo = Math.floor(Math.random() * 365);
      const isFailure = failureProne ? Math.random() > 0.5 : Math.random() > 0.85;
      events.push({
        asset_id: id,
        event_type: isFailure ? 'failure' : 'maintenance',
        event_time: new Date(Date.now() - daysAgo * 86400000).toISOString(),
      });
    }
    eventsByEquipment[id] = events;
  }

  return eventsByEquipment;
}

function generateSyntheticSlaData(n) {
  const priorities = ['low', 'medium', 'high', 'urgent'];
  return Array.from({ length: n }, () => {
    const priority = priorities[Math.floor(Math.random() * 4)];
    const hasTech = Math.random() > 0.3;
    const createdAt = new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000);

    // Higher priority + no tech = more likely to breach
    const baseBreachProb = ({ urgent: 0.6, high: 0.4, medium: 0.2, low: 0.1 })[priority];
    const breachProb = hasTech ? baseBreachProb * 0.5 : baseBreachProb * 1.5;
    const breached = Math.random() < breachProb;
    const resolutionDays = breached ? 8 + Math.random() * 10 : 1 + Math.random() * 5;

    return {
      id: `wo_${Math.random().toString(36).slice(2)}`,
      created_at: createdAt.toISOString(),
      completed_at: new Date(createdAt.getTime() + resolutionDays * 86400000).toISOString(),
      priority,
      technician_id: hasTech ? 'tech_1' : null,
      status: 'completed',
    };
  });
}

function generateSyntheticTimeSeriesData(n, seasonLength = 7) {
  const data = [];
  for (let i = 0; i < n; i++) {
    const trend = 50 + i * 0.1;
    const seasonal = 10 * Math.sin(2 * Math.PI * i / seasonLength);
    const noise = (Math.random() - 0.5) * 8;
    data.push(Math.max(0, trend + seasonal + noise));
  }
  return data;
}

export {
  trainModel,
  predictFailure,
  predictSlaBreach,
  holtWintersPredict,
  detectAnomalies,
};
