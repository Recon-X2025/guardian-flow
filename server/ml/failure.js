/**
 * Equipment Failure Prediction — Logistic Regression
 * Replaces hardcoded threshold rules (>180 days → HIGH)
 */

import {
  logisticRegressionTrain,
  logisticRegressionPredict,
  normalizeMatrix,
  trainTestSplit,
  crossValidate,
  computeClassificationMetrics,
  sigmoid,
  dotProduct,
} from './utils.js';

/**
 * Extract features from asset lifecycle events grouped by equipment
 */
function engineerFeatures(eventsByEquipment) {
  const X = [];
  const y = [];

  for (const [equipmentId, events] of Object.entries(eventsByEquipment)) {
    if (events.length < 2) continue;

    // Sort by timestamp
    events.sort((a, b) => new Date(a.event_time) - new Date(b.event_time));

    const maintenanceEvents = events.filter(e => e.event_type === 'maintenance');
    const failureEvents = events.filter(e => e.event_type === 'failure');
    const now = Date.now();

    // Feature: days since last maintenance
    const lastMaintenance = maintenanceEvents.length > 0
      ? (now - new Date(maintenanceEvents[maintenanceEvents.length - 1].event_time).getTime()) / (86400000)
      : 365;

    // Feature: failure rate
    const failureRate = events.length > 0 ? failureEvents.length / events.length : 0;

    // Feature: total maintenance count
    const maintenanceCount = maintenanceEvents.length;

    // Feature: equipment age (days since first event)
    const equipmentAge = (now - new Date(events[0].event_time).getTime()) / 86400000;

    // Feature: events per month
    const monthsActive = Math.max(equipmentAge / 30, 1);
    const eventsPerMonth = events.length / monthsActive;

    // Feature: days since last failure
    const lastFailure = failureEvents.length > 0
      ? (now - new Date(failureEvents[failureEvents.length - 1].event_time).getTime()) / 86400000
      : 999;

    X.push([lastMaintenance, failureRate, maintenanceCount, equipmentAge, eventsPerMonth, lastFailure]);

    // Label: 1 if equipment had a failure in the last 30 days
    const recentFailure = failureEvents.some(e =>
      (now - new Date(e.event_time).getTime()) / 86400000 < 30
    );
    y.push(recentFailure ? 1 : 0);
  }

  return {
    X, y,
    featureNames: ['days_since_maintenance', 'failure_rate', 'maintenance_count', 'equipment_age', 'events_per_month', 'days_since_last_failure'],
  };
}

/**
 * Train equipment failure model
 */
function trainFailureModel(eventsByEquipment) {
  const { X, y, featureNames } = engineerFeatures(eventsByEquipment);

  if (X.length < 10) {
    return { error: 'Insufficient training data', minRequired: 10, actual: X.length };
  }

  // Normalize features
  const { normalized, means, stds } = normalizeMatrix(X);

  // Train/test split
  const { Xtrain, Xtest, ytrain, ytest } = trainTestSplit(normalized, y, 0.2);

  // Train logistic regression
  const model = logisticRegressionTrain(Xtrain, ytrain, { lr: 0.1, epochs: 500, lambda: 0.01 });

  // Evaluate on test set
  const testPreds = logisticRegressionPredict(model, Xtest);
  const testLabels = testPreds.map(p => p >= 0.5 ? 1 : 0);
  const testMetrics = computeClassificationMetrics(ytest, testLabels);

  // Cross-validate
  const cvMetrics = crossValidate(
    (Xt, yt) => logisticRegressionTrain(Xt, yt, { lr: 0.1, epochs: 500, lambda: 0.01 }),
    normalized, y, 5
  );

  return {
    weights: model.weights,
    bias: model.bias,
    featureMeans: means,
    featureStds: stds,
    featureNames,
    testMetrics,
    cvMetrics,
    trainingSamples: X.length,
    positiveRate: y.filter(v => v === 1).length / y.length,
    trainedAt: new Date().toISOString(),
  };
}

/**
 * Predict failure probability for a single equipment
 */
function predictFailure(modelWeights, features) {
  // Normalize using stored params
  const normalized = features.map((v, i) =>
    (v - modelWeights.featureMeans[i]) / (modelWeights.featureStds[i] || 1)
  );


  const z = dotProduct(modelWeights.weights, normalized) + modelWeights.bias;
  const probability = sigmoid(z);

  return {
    probability,
    riskLevel: probability > 0.7 ? 'high_risk' : probability > 0.4 ? 'medium_risk' : 'low_risk',
    confidence: Math.abs(probability - 0.5) * 2, // 0-1 scale, higher = more confident
  };
}

export {
  engineerFeatures,
  trainFailureModel,
  predictFailure,
};
