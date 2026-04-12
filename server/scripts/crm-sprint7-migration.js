#!/usr/bin/env node
/**
 * CRM Migration — Sprint 7
 * Creates indexes for crm_accounts, crm_contacts, crm_leads, crm_deals, crm_pipeline_stages.
 * Idempotent — tracked in schema_migrations collection.
 *
 * Usage:
 *   node server/scripts/crm-sprint7-migration.js
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME     = process.env.DB_NAME     || 'guardianflow';

async function runMigrations() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`Connected to MongoDB — DB: ${DB_NAME}`);

    const applied = new Set(
      (await db.collection('schema_migrations').find({}).toArray()).map(m => m.version),
    );

    const migrations = [
      {
        version: 'crm_sprint7_001_accounts',
        description: 'Create indexes for crm_accounts collection',
        run: async () => {
          await db.collection('crm_accounts').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('crm_accounts').createIndex({ tenant_id: 1, company_name: 1 }).catch(() => {});
          await db.collection('crm_accounts').createIndex({ tenant_id: 1, assigned_rep_id: 1 }).catch(() => {});
          console.log('  ✓ crm_accounts indexes created');
        },
      },
      {
        version: 'crm_sprint7_002_contacts',
        description: 'Create indexes for crm_contacts collection',
        run: async () => {
          await db.collection('crm_contacts').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('crm_contacts').createIndex({ tenant_id: 1, account_id: 1 }).catch(() => {});
          await db.collection('crm_contacts').createIndex({ tenant_id: 1, email: 1 }).catch(() => {});
          console.log('  ✓ crm_contacts indexes created');
        },
      },
      {
        version: 'crm_sprint7_003_leads',
        description: 'Create indexes for crm_leads collection',
        run: async () => {
          await db.collection('crm_leads').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('crm_leads').createIndex({ tenant_id: 1, status: 1 }).catch(() => {});
          await db.collection('crm_leads').createIndex({ tenant_id: 1, score: -1 }).catch(() => {});
          await db.collection('crm_leads').createIndex({ tenant_id: 1, converted: 1 }).catch(() => {});
          console.log('  ✓ crm_leads indexes created');
        },
      },
      {
        version: 'crm_sprint7_004_deals',
        description: 'Create indexes for crm_deals collection',
        run: async () => {
          await db.collection('crm_deals').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('crm_deals').createIndex({ tenant_id: 1, stage_id: 1 }).catch(() => {});
          await db.collection('crm_deals').createIndex({ tenant_id: 1, account_id: 1 }).catch(() => {});
          await db.collection('crm_deals').createIndex({ tenant_id: 1, assigned_rep_id: 1 }).catch(() => {});
          await db.collection('crm_deals').createIndex({ tenant_id: 1, close_date: 1 }).catch(() => {});
          console.log('  ✓ crm_deals indexes created');
        },
      },
      {
        version: 'crm_sprint7_005_pipeline_stages',
        description: 'Create indexes for crm_pipeline_stages collection',
        run: async () => {
          await db.collection('crm_pipeline_stages').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('crm_pipeline_stages').createIndex({ tenant_id: 1, position: 1 }).catch(() => {});
          console.log('  ✓ crm_pipeline_stages indexes created');
        },
      },
    ];

    for (const migration of migrations) {
      if (applied.has(migration.version)) {
        console.log(`  ⏭  Skipping already applied: ${migration.version}`);
        continue;
      }
      console.log(`  ▶  Running: ${migration.version} — ${migration.description}`);
      await migration.run();
      await db.collection('schema_migrations').insertOne({
        version:     migration.version,
        description: migration.description,
        applied_at:  new Date(),
      });
      console.log(`  ✅ Applied: ${migration.version}`);
    }

    console.log('\nAll CRM Sprint 7 migrations complete.');
  } finally {
    await client.close();
  }
}

runMigrations().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
