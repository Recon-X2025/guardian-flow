import { randomUUID } from 'crypto';
import { insertOne, findMany, aggregate, updateOne, countDocuments } from '../../db/query.js';

export async function logAIDecision(model, input, output, confidence, tenantId) {
  const doc = {
    id: randomUUID(),
    model,
    input_summary: typeof input === 'string' ? input.slice(0, 500) : JSON.stringify(input).slice(0, 500),
    output_summary: typeof output === 'string' ? output.slice(0, 500) : JSON.stringify(output).slice(0, 500),
    confidence,
    tenant_id: tenantId,
    created_at: new Date(),
  };

  try {
    await insertOne('ai_governance_logs', doc);
  } catch (e) { console.warn('Governance log error:', e.message); }

  return doc;
}

export async function getModelHealth() {
  try {
    const stats = await aggregate('ai_usage_logs', [
      { $group: {
        id: { model: '$model', feature: '$feature' },
        total_calls: { $sum: 1 },
        avg_latency_ms: { $avg: '$duration_ms' },
        total_tokens: { $sum: '$total_tokens' },
        error_count: { $sum: { $cond: [{ $eq: ['$provider', 'mock-fallback'] }, 1, 0] } },
        last_used: { $max: '$created_at' },
      }},
      { $sort: { total_calls: -1 } },
    ]);

    return stats.map(s => ({
      model: s.id.model,
      feature: s.id.feature,
      total_calls: s.total_calls,
      avg_latency_ms: Math.round(s.avg_latency_ms),
      total_tokens: s.total_tokens,
      error_rate: s.total_calls > 0 ? Math.round(s.error_count / s.total_calls * 10000) / 100 : 0,
      last_used: s.last_used,
    }));
  } catch (e) {
    return [];
  }
}

export async function getGovernanceLogs(tenantId, limit = 50) {
  return findMany('ai_governance_logs',
    tenantId ? { tenant_id: tenantId } : {},
    { sort: { created_at: -1 }, limit }
  );
}

export async function seedModelRegistry() {
  const models = [
    { model_name: 'RAG Engine', provider: 'mock/openai', capabilities: ['question_answering', 'citation', 'knowledge_retrieval'], feature: 'rag', active: true, avg_cost_per_1k_tokens: 0.01 },
    { model_name: 'NLP Query Engine', provider: 'mock/openai', capabilities: ['nl_to_query', 'schema_aware', 'safety_guardrails'], feature: 'nlp_query', active: true, avg_cost_per_1k_tokens: 0.01 },
    { model_name: 'SLA Breach Predictor', provider: 'hybrid', capabilities: ['risk_scoring', 'factor_analysis', 'time_series'], feature: 'sla_prediction', active: true, avg_cost_per_1k_tokens: 0.005 },
    { model_name: 'Maintenance Predictor', provider: 'statistical', capabilities: ['failure_probability', 'mtbf_calculation', 'logistic_regression'], feature: 'maintenance_prediction', active: true, avg_cost_per_1k_tokens: 0 },
    { model_name: 'Anomaly Detector', provider: 'statistical', capabilities: ['z_score', 'benford_law', 'duplicate_detection'], feature: 'anomaly_detection', active: true, avg_cost_per_1k_tokens: 0 },
    { model_name: 'Fraud Detector', provider: 'statistical/ai', capabilities: ['financial_anomalies', 'pattern_detection', 'risk_scoring'], feature: 'fraud_detection', active: true, avg_cost_per_1k_tokens: 0.005 },
    { model_name: 'Route Optimizer', provider: 'algorithmic', capabilities: ['tsp_solver', 'haversine_distance', 'nearest_neighbor'], feature: 'route_optimization', active: true, avg_cost_per_1k_tokens: 0 },
    { model_name: 'Schedule Optimizer', provider: 'algorithmic', capabilities: ['constraint_solver', 'priority_scoring', 'workload_balancing'], feature: 'schedule_optimization', active: true, avg_cost_per_1k_tokens: 0 },
    { model_name: 'Forecast Analyzer', provider: 'mock/openai', capabilities: ['trend_analysis', 'seasonality_detection', 'narrative_generation'], feature: 'forecast_analysis', active: true, avg_cost_per_1k_tokens: 0.01 },
    { model_name: 'Photo Validator', provider: 'mock/openai-vision', capabilities: ['quality_check', 'stock_photo_detection', 'equipment_verification'], feature: 'photo_validation', active: true, avg_cost_per_1k_tokens: 0.02 },
    { model_name: 'Offer Generator', provider: 'mock/openai', capabilities: ['personalization', 'upsell_recommendations', 'value_proposition'], feature: 'offer_generation', active: true, avg_cost_per_1k_tokens: 0.01 },
  ];

  let created = 0;
  for (const model of models) {
    try {
      await updateOne('model_registry',
        { model_name: model.model_name },
        { $setOnInsert: { id: randomUUID(), ...model, usage_count: 0, created_at: new Date() }, $set: { active: true } },
        { upsert: true }
      );
      created++;
    } catch (e) { console.warn('Model registry seed error:', e.message); }
  }

  return { created, total: models.length };
}
