/**
 * ML Training Pipeline Orchestrator
 * Replaces 5-second setTimeout + random metrics with real training
 */

import { randomUUID } from 'crypto';
import { db } from '../db/client.js';
import { trainFailureModel, predictFailure } from './failure.js';
import { trainSlaModel, predictSlaBreach } from './sla.js';
import { holtWintersTrain, holtWintersPredict } from './forecasting.js';
import { detectAnomalies } from './anomaly.js';

/**
 * Train a model based on type, using data from the database
 */
async function trainModel(modelType, config = {}) {
  switch (modelType) {
    case 'equipment_failure':
      return await trainEquipmentFailure(config);
    case 'sla_breach':
      return await trainSlaBreach(config);
    case 'forecast':
      return await trainForecast(config);
    default:
      throw new Error(`Unknown model type: ${modelType}`);
  }
}

async function trainEquipmentFailure(config) {
  const startTime = Date.now();

  // Load asset lifecycle events from DB
  const events = await db.collection('asset_lifecycle_events')
    .find({})
    .sort({ event_time: -1 })
    .limit(10000)
    .toArray();

  if (events.length === 0) {
    // Generate synthetic training data if no real data exists
    const syntheticEvents = generateSyntheticFailureData(500);
    return trainAndStoreFailureModel(syntheticEvents, config, true);
  }

  // Group events by equipment
  const eventsByEquipment = {};
  for (const event of events) {
    const id = event.asset_id;
    if (!eventsByEquipment[id]) eventsByEquipment[id] = [];
    eventsByEquipment[id].push(event);
  }

  return trainAndStoreFailureModel(eventsByEquipment, config, false);
}

async function trainAndStoreFailureModel(eventsByEquipment, config, isSynthetic) {
  const startTime = Date.now();
  const result = trainFailureModel(eventsByEquipment);

  if (result.error) {
    // Generate synthetic data as fallback
    if (!isSynthetic) {
      const syntheticEvents = generateSyntheticFailureData(500);
      return trainAndStoreFailureModel(syntheticEvents, config, true);
    }
    return result;
  }

  const trainingTime = Date.now() - startTime;

  // Store model weights in DB (upsert by model_name + tenant_id)
  const modelDoc = {
    id: randomUUID(),
    tenant_id: config.tenantId || '00000000-0000-0000-0000-000000000000',
    model_name: 'equipment_failure_v1',
    model_type: 'equipment_failure',
    framework: 'logistic_regression',
    status: 'deployed',
    accuracy_score: result.cvMetrics.accuracy,
    precision_score: result.cvMetrics.precision,
    recall_score: result.cvMetrics.recall,
    f1_score: result.cvMetrics.f1,
    training_data_size: result.trainingSamples,
    features: JSON.stringify({ names: result.featureNames, means: result.featureMeans, stds: result.featureStds }),
    hyperparameters: JSON.stringify({ weights: result.weights, bias: result.bias, featureMeans: result.featureMeans, featureStds: result.featureStds }),
    created_at: new Date(),
    updated_at: new Date(),
  };

  try {
    await db.collection('ml_models').updateOne(
      { model_name: 'equipment_failure_v1', tenant_id: modelDoc.tenant_id },
      { $set: { ...modelDoc, updated_at: new Date() } },
      { upsert: true }
    );
  } catch (err) {
    // Fallback: simple insert
    try {
      await db.collection('ml_models').insertOne(modelDoc);
    } catch { /* ignore */ }
  }

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

async function trainSlaBreach(config) {
  const startTime = Date.now();

  const workOrders = await db.collection('work_orders')
    .find({ check_out_at: { $ne: null } })
    .sort({ created_at: -1 })
    .limit(10000)
    .toArray();

  // Map fields for compatibility
  const mappedOrders = workOrders.map(wo => ({
    id: wo.id,
    created_at: wo.created_at,
    completed_at: wo.check_out_at,
    priority: wo.repair_type || 'medium',
    technician_id: null,
    status: wo.status,
  }));

  let trainingData = mappedOrders;
  let isSynthetic = false;

  if (mappedOrders.length < 10) {
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

  const modelDoc = {
    id: randomUUID(),
    tenant_id: config.tenantId || '00000000-0000-0000-0000-000000000000',
    model_name: 'sla_breach_v1',
    model_type: 'sla_breach',
    framework: 'logistic_regression',
    status: 'deployed',
    accuracy_score: result.cvMetrics.accuracy,
    precision_score: result.cvMetrics.precision,
    recall_score: result.cvMetrics.recall,
    f1_score: result.cvMetrics.f1,
    training_data_size: result.trainingSamples,
    features: JSON.stringify({ names: result.featureNames, means: result.featureMeans, stds: result.featureStds }),
    hyperparameters: JSON.stringify({ weights: result.weights, bias: result.bias, featureMeans: result.featureMeans, featureStds: result.featureStds, slaThresholdDays: result.slaThresholdDays }),
    created_at: new Date(),
    updated_at: new Date(),
  };

  try {
    await db.collection('ml_models').updateOne(
      { model_name: 'sla_breach_v1', tenant_id: modelDoc.tenant_id },
      { $set: { ...modelDoc, updated_at: new Date() } },
      { upsert: true }
    );
  } catch (err) {
    console.error('Failed to store SLA model:', err.message);
  }

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

async function trainForecast(config) {
  const startTime = Date.now();
  const forecastType = config.forecastType || 'repair_volume';
  const seasonLength = config.seasonLength || 7;

  let data = [];

  if (forecastType === 'repair_volume') {
    const pipeline = [
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } }, value: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 365 },
    ];
    const rows = await db.collection('work_orders').aggregate(pipeline).toArray();
    data = rows.map(r => Number(r.value));
  } else if (forecastType === 'spend_revenue') {
    const pipeline = [
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } }, value: { $sum: { $ifNull: ['$total_amount', 0] } } } },
      { $sort: { _id: 1 } },
      { $limit: 365 },
    ];
    const rows = await db.collection('invoices').aggregate(pipeline).toArray();
    data = rows.map(r => Number(r.value));
  }

  let isSynthetic = false;
  if (data.length < 14) {
    data = generateSyntheticTimeSeriesData(180, seasonLength);
    isSynthetic = true;
  }

  const weights = holtWintersTrain(data, seasonLength);
  const trainingTime = Date.now() - startTime;

  // Store in forecast_models — delete old then insert
  const modelName = `${forecastType}_holt_winters`;
  await db.collection('forecast_models').deleteMany({ model_name: modelName }).catch(() => {});
  try {
    await db.collection('forecast_models').insertOne({
      id: randomUUID(),
      model_type: forecastType,
      model_name: modelName,
      algorithm: 'holt_winters',
      frequency: 'daily',
      accuracy_score: weights.metrics.r2,
      config: weights,
      created_at: new Date(),
      updated_at: new Date(),
    });
  } catch (err) {
    console.error('Failed to store forecast model:', err.message);
  }

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
