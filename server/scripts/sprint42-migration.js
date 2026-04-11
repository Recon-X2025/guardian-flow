import { getAdapter } from '../db/factory.js';
import { randomUUID } from 'crypto';

export async function runSprint42Migration() {
  const adapter = await getAdapter();

  // Ensure model_registry has new fields (seed if empty)
  try {
    const existing = await adapter.findMany('model_registry', {}, { limit: 1 });
    if (existing.length === 0) {
      const sampleModels = [
        'guardianflow-maintenance-predictor',
        'guardianflow-demand-forecast',
        'guardianflow-anomaly-detector',
        'guardianflow-nlp-query',
        'guardianflow-rul-model',
      ].map(name => ({
        id: randomUUID(),
        model_name: name,
        provider: 'internal',
        risk_tier: 'minimal',
        eu_ai_act_category: 'General Purpose',
        intended_purpose: 'Operational analytics',
        high_risk_justification: null,
        last_review_date: new Date(),
        pending_approval_from: null,
        active: true,
        created_at: new Date(),
      }));
      for (const m of sampleModels) await adapter.insertOne('model_registry', m);
    }
  } catch (e) { console.warn('model_registry migration note:', e.message); }

  // Ensure collections exist by inserting+deleting a sentinel doc
  for (const col of ['llm_usage_logs', 'tenant_token_budgets', 'siem_configs']) {
    try {
      const sentinel = { id: '__migration_sentinel__', _migrate: true };
      await adapter.insertOne(col, sentinel);
      // collections now exist; remove sentinel if adapter supports delete
      if (typeof adapter.deleteOne === 'function') {
        await adapter.deleteOne(col, { id: '__migration_sentinel__' });
      }
    } catch (e) { /* collection may already exist */ }
  }

  console.log('Sprint 42 migration complete.');
}

// Run directly
if (process.argv[1]?.endsWith('sprint42-migration.js')) {
  runSprint42Migration().catch(console.error).finally(() => process.exit(0));
}
