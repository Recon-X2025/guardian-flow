#!/usr/bin/env node
/**
 * MongoDB migration runner — Phase 3 collections (Sprints 19-28)
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vivekkumar787067_db_user:Vivek09876@cluster0.xdkbkkd.mongodb.net/';
const DB_NAME = process.env.DB_NAME || 'guardianflow';

async function runMigrations() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log('Connected to MongoDB');

    const migrationsApplied = await db.collection('schema_migrations').find({}).toArray();
    const appliedVersions = new Set(migrationsApplied.map(m => m.version));

    const migrations = [
      {
        version: '020_phase3_automl',
        description: 'Create indexes for AutoML experiments and runs collections',
        run: async () => {
          await db.collection('automl_experiments').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('automl_experiments').createIndex({ status: 1 }).catch(() => {});
          await db.collection('automl_experiments').createIndex({ tenant_id: 1, created_at: -1 }).catch(() => {});

          await db.collection('automl_runs').createIndex({ experiment_id: 1 }).catch(() => {});
          await db.collection('automl_runs').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('automl_runs').createIndex({ status: 1 }).catch(() => {});
          await db.collection('automl_runs').createIndex({ tenant_id: 1, experiment_id: 1, created_at: -1 }).catch(() => {});
        },
      },
      {
        version: '021_phase3_xai',
        description: 'Create indexes for XAI explanations collection',
        run: async () => {
          await db.collection('xai_explanations').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('xai_explanations').createIndex({ model_id: 1 }).catch(() => {});
          await db.collection('xai_explanations').createIndex({ tenant_id: 1, model_id: 1, created_at: -1 }).catch(() => {});
        },
      },
      {
        version: '022_phase3_vision',
        description: 'Create indexes for vision analyses collection',
        run: async () => {
          await db.collection('vision_analyses').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('vision_analyses').createIndex({ asset_id: 1 }).catch(() => {});
          await db.collection('vision_analyses').createIndex({ tenant_id: 1, created_at: -1 }).catch(() => {});
        },
      },
      {
        version: '023_phase3_finetune',
        description: 'Create indexes for LLM fine-tune jobs collection',
        run: async () => {
          await db.collection('llm_finetune_jobs').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('llm_finetune_jobs').createIndex({ status: 1 }).catch(() => {});
          await db.collection('llm_finetune_jobs').createIndex({ tenant_id: 1, created_at: -1 }).catch(() => {});
        },
      },
      {
        version: '024_phase3_anomalies',
        description: 'Create indexes for anomaly events collection',
        run: async () => {
          await db.collection('anomaly_events').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('anomaly_events').createIndex({ metric_name: 1 }).catch(() => {});
          await db.collection('anomaly_events').createIndex({ detected_at: -1 }).catch(() => {});
          await db.collection('anomaly_events').createIndex({ tenant_id: 1, detected_at: -1 }).catch(() => {});
        },
      },
      {
        version: '025_phase3_governance',
        description: 'Create indexes for AI governance policies collection',
        run: async () => {
          await db.collection('ai_governance_policies').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('ai_governance_policies').createIndex({ enabled: 1 }).catch(() => {});
          await db.collection('ai_governance_policies').createIndex({ tenant_id: 1, created_at: -1 }).catch(() => {});
        },
      },
      {
        version: '026_phase3_prompts',
        description: 'Create indexes for AI prompts collection',
        run: async () => {
          await db.collection('ai_prompts').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('ai_prompts').createIndex({ name: 1 }).catch(() => {});
          await db.collection('ai_prompts').createIndex({ tenant_id: 1, name: 1 }).catch(() => {});
          await db.collection('ai_prompts').createIndex({ tenant_id: 1, updated_at: -1 }).catch(() => {});
        },
      },
      {
        version: '027_phase3_predictions',
        description: 'Ensure indexes on maintenance_predictions, model_registry, knowledge_bases, decision_records',
        run: async () => {
          await db.collection('maintenance_predictions').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('maintenance_predictions').createIndex({ risk_level: 1 }).catch(() => {});
          await db.collection('maintenance_predictions').createIndex({ failure_probability: -1 }).catch(() => {});
          await db.collection('maintenance_predictions').createIndex({ tenant_id: 1, risk_level: 1, failure_probability: -1 }).catch(() => {});

          await db.collection('model_registry').createIndex({ usage_count: -1 }).catch(() => {});

          await db.collection('knowledge_bases').createIndex({ tenant_id: 1 }).catch(() => {});

          await db.collection('decision_records').createIndex({ tenant_id: 1 }).catch(() => {});
        },
      },
    ];

    for (const migration of migrations) {
      if (appliedVersions.has(migration.version)) {
        console.log(`Skipping ${migration.version} (already applied)`);
        continue;
      }

      console.log(`Applying ${migration.version}: ${migration.description}...`);
      try {
        await migration.run();
        await db.collection('schema_migrations').insertOne({
          version: migration.version,
          description: migration.description,
          applied_at: new Date(),
        });
        console.log(`Applied ${migration.version}`);
      } catch (err) {
        console.error(`Error applying ${migration.version}:`, err.message);
        throw err;
      }
    }

    console.log('All migrations applied');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

runMigrations();
