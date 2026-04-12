#!/usr/bin/env node
/**
 * @file server/scripts/sprint37-migration.js
 * @description MongoDB migration — Sprint 37
 * (Accounts Payable, Supplier Portal, ASC 606 / IFRS 15 Revenue Recognition Engine)
 *
 * Creates:
 *  - ap_invoices collection
 *  - vendors collection
 *  - revenue_contracts collection
 *  - revenue_schedules collection
 *
 * Idempotent: uses schema_migrations to track applied versions.
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
    console.log('Connected to MongoDB');

    await db.createCollection('schema_migrations').catch(() => {});
    await db.collection('schema_migrations').createIndex({ version: 1 }, { unique: true }).catch(() => {});

    const applied    = await db.collection('schema_migrations').find({}).toArray();
    const appliedSet = new Set(applied.map(m => m.version));

    const migrations = [
      {
        version: '037_ap_invoices',
        description: 'Create ap_invoices collection with indexes',
        run: async () => {
          await db.createCollection('ap_invoices').catch(() => {});
          const col = db.collection('ap_invoices');
          await col.createIndex({ tenantId: 1, status: 1 }).catch(() => {});
          await col.createIndex({ tenantId: 1, vendorId: 1 }).catch(() => {});
          await col.createIndex({ tenantId: 1, dueDate: 1 }).catch(() => {});
          await col.createIndex({ tenantId: 1, invoiceNo: 1 }, { unique: true, sparse: true }).catch(() => {});
        },
      },
      {
        version: '037_vendors',
        description: 'Create vendors collection with indexes',
        run: async () => {
          await db.createCollection('vendors').catch(() => {});
          const col = db.collection('vendors');
          await col.createIndex({ tenantId: 1, status: 1 }).catch(() => {});
          await col.createIndex({ tenantId: 1, name: 1 }).catch(() => {});
          await col.createIndex({ tenantId: 1, contactEmail: 1 }, { sparse: true }).catch(() => {});
        },
      },
      {
        version: '037_revenue_contracts',
        description: 'Create revenue_contracts collection with indexes',
        run: async () => {
          await db.createCollection('revenue_contracts').catch(() => {});
          const col = db.collection('revenue_contracts');
          await col.createIndex({ tenantId: 1, status: 1 }).catch(() => {});
          await col.createIndex({ tenantId: 1, customerId: 1 }).catch(() => {});
          await col.createIndex({ tenantId: 1, contractNo: 1 }, { unique: true, sparse: true }).catch(() => {});
        },
      },
      {
        version: '037_revenue_schedules',
        description: 'Create revenue_schedules collection with indexes',
        run: async () => {
          await db.createCollection('revenue_schedules').catch(() => {});
          const col = db.collection('revenue_schedules');
          await col.createIndex({ tenantId: 1, contractId: 1 }).catch(() => {});
          await col.createIndex({ tenantId: 1, period: 1 }).catch(() => {});
          await col.createIndex({ contractId: 1, obligationId: 1, period: 1 }, { unique: true, sparse: true }).catch(() => {});
        },
      },
    ];

    for (const migration of migrations) {
      if (appliedSet.has(migration.version)) {
        console.log(`  SKIP  ${migration.version} — already applied`);
        continue;
      }
      console.log(`  RUN   ${migration.version}: ${migration.description}`);
      await migration.run();
      await db.collection('schema_migrations').insertOne({
        version:     migration.version,
        description: migration.description,
        appliedAt:   new Date().toISOString(),
      });
      console.log(`  DONE  ${migration.version}`);
    }

    console.log('\nMigrations complete.');
  } finally {
    await client.close();
  }
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
