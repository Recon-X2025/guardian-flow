/**
 * SLA Breach Prediction — Logistic Regression
 * Replaces fixed point scoring (+30 for age>5d, +20 for urgent)
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

const PRIORITY_MAP = { urgent: 4, high: 3, medium: 2, low: 1 };

/**
 * Extract features from historical work orders
 */
function engineerFeatures(workOrders, slaThresholdDays = 7) {
  const X = [];
  const y = [];

  for (const wo of workOrders) {
    const createdAt = new Date(wo.created_at);
    const resolvedAt = wo.completed_at ? new Date(wo.completed_at) : null;

    // Only use resolved orders for training (we know the outcome)
    if (!resolvedAt) continue;

    const ageHours = (Date.now() - createdAt.getTime()) / 3600000;
    const priorityNumeric = PRIORITY_MAP[wo.priority] || 2;
    const hasTechnician = wo.technician_id ? 1 : 0;
    const dayOfWeek = createdAt.getDay();
    const hourOfDay = createdAt.getHours();

    // Resolution time in days
    const resolutionDays = (resolvedAt - createdAt) / 86400000;

    X.push([ageHours, priorityNumeric, hasTechnician, dayOfWeek, hourOfDay]);
    y.push(resolutionDays > slaThresholdDays ? 1 : 0); // 1 = breached
  }

  return {
    X, y,
    featureNames: ['age_hours', 'priority_numeric', 'has_technician', 'day_of_week', 'hour_of_day'],
  };
}

/**
 * Train SLA breach prediction model
 */
function trainSlaModel(workOrders, slaThresholdDays = 7) {
  const { X, y, featureNames } = engineerFeatures(workOrders, slaThresholdDays);

  if (X.length < 10) {
    return { error: 'Insufficient training data', minRequired: 10, actual: X.length };
  }

  const { normalized, means, stds } = normalizeMatrix(X);
  const { Xtrain, Xtest, ytrain, ytest } = trainTestSplit(normalized, y, 0.2);

  const model = logisticRegressionTrain(Xtrain, ytrain, { lr: 0.1, epochs: 500, lambda: 0.01 });

  const testPreds = logisticRegressionPredict(model, Xtest);
  const testLabels = testPreds.map(p => p >= 0.5 ? 1 : 0);
  const testMetrics = computeClassificationMetrics(ytest, testLabels);

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
    slaThresholdDays,
    testMetrics,
    cvMetrics,
    trainingSamples: X.length,
    breachRate: y.filter(v => v === 1).length / y.length,
    trainedAt: new Date().toISOString(),
  };
}

/**
 * Predict SLA breach probability for an open work order
 */
function predictSlaBreach(modelWeights, workOrder) {
  const createdAt = new Date(workOrder.created_at);
  const ageHours = (Date.now() - createdAt.getTime()) / 3600000;
  const priorityNumeric = PRIORITY_MAP[workOrder.priority] || 2;
  const hasTechnician = workOrder.technician_id ? 1 : 0;
  const dayOfWeek = createdAt.getDay();
  const hourOfDay = createdAt.getHours();

  const features = [ageHours, priorityNumeric, hasTechnician, dayOfWeek, hourOfDay];
  const normalized = features.map((v, i) =>
    (v - modelWeights.featureMeans[i]) / (modelWeights.featureStds[i] || 1)
  );

  const z = dotProduct(modelWeights.weights, normalized) + modelWeights.bias;
  const probability = sigmoid(z);

  const timeToBreachDays = Math.max(0, modelWeights.slaThresholdDays - ageHours / 24);

  return {
    breachProbability: probability,
    atRisk: probability > 0.5,
    timeToBreachDays: timeToBreachDays.toFixed(1),
    confidence: Math.abs(probability - 0.5) * 2,
    recommendedAction: probability > 0.7
      ? 'Urgent: Assign technician immediately'
      : probability > 0.5
        ? 'Prioritize assignment'
        : 'Monitor',
  };
}

export {
  engineerFeatures,
  trainSlaModel,
  predictSlaBreach,
};
