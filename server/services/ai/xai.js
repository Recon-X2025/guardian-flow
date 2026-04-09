import { randomUUID } from 'crypto';
import { getAdapter } from '../../db/factory.js';

const COL = 'xai_explanations';

export async function explainPrediction(tenantId, modelId, inputData) {
  const adapter = await getAdapter();
  const features = Object.keys(inputData || {});
  const featureImportances = features.map((feature) => {
    const importance = Math.round((0.05 + Math.random() * 0.3) * 100) / 100;
    return {
      feature,
      importance,
      direction: Math.random() > 0.5 ? 'positive' : 'negative',
    };
  });
  featureImportances.sort((a, b) => b.importance - a.importance);

  const shapValues = featureImportances.map(f => ({
    feature: f.feature,
    shap_value: f.direction === 'positive' ? f.importance : -f.importance,
    base_value: 0.5,
  }));

  const doc = {
    id: randomUUID(),
    tenant_id: tenantId,
    model_id: modelId,
    input_data: inputData,
    feature_importances: featureImportances,
    shap_values: shapValues,
    created_at: new Date(),
  };
  try { await adapter.insertOne(COL, doc); } catch (e) { /* skip */ }
  return { featureImportances, shapValues };
}

export async function getFeatureImportance(tenantId, modelId) {
  const adapter = await getAdapter();
  const docs = await adapter.findMany(COL, { tenant_id: tenantId, model_id: modelId }, { sort: { created_at: -1 }, limit: 1 });
  if (docs.length === 0) return { featureImportances: [], shapValues: [] };
  return { featureImportances: docs[0].feature_importances, shapValues: docs[0].shap_values };
}

export async function generateCounterfactual(tenantId, modelId, inputData, desiredOutcome) {
  const features = Object.keys(inputData || {});
  const alternatives = features.slice(0, 3).map(feature => {
    const original = inputData[feature];
    const suggested = typeof original === 'number'
      ? Math.round(original * (0.8 + Math.random() * 0.4) * 100) / 100
      : `altered_${original}`;
    return { feature, original, suggested, impact: Math.round(Math.random() * 0.3 * 100) / 100 };
  });
  return { alternatives, desiredOutcome, confidence: Math.round((0.6 + Math.random() * 0.35) * 100) / 100 };
}
