#!/usr/bin/env node
/**
 * MongoDB migration runner — Sprint 35
 * (Crowd Marketplace WO + Email→WO AI + Capacity Demand Forecasting + Multi-day WO)
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
        version: '035_work_orders_crowd_multiday_fields',
        description: 'Add crowd and multi-day fields to work_orders collection',
        run: async () => {
          await db.collection('work_orders').updateMany(
            { crowd_partner_id: { $exists: false } },
            {
              $set: {
                crowd_partner_id:  null,
                crowd_status:      null,
                multi_day:         false,
                planned_start_date: null,
                planned_end_date:   null,
                daily_schedule:    [],
              },
            },
          );
          await db.collection('work_orders').createIndex({ crowd_partner_id: 1 }).catch(() => {});
          await db.collection('work_orders').createIndex({ crowd_status: 1 }).catch(() => {});
          await db.collection('work_orders').createIndex({ tenant_id: 1, crowd_status: 1 }).catch(() => {});
        },
      },

      {
        version: '035_crowd_partners_collection',
        description: 'Create crowd_partners collection',
        run: async () => {
          await db.createCollection('crowd_partners').catch(() => {});
          await db.collection('crowd_partners').createIndex({ tenantId: 1 }).catch(() => {});
          await db.collection('crowd_partners').createIndex({ tenantId: 1, contactEmail: 1 }, { unique: true }).catch(() => {});
          await db.collection('crowd_partners').createIndex({ status: 1 }).catch(() => {});
          await db.collection('crowd_partners').createIndex({ skills: 1 }).catch(() => {});
          await db.collection('crowd_partners').createIndex({ territories: 1 }).catch(() => {});
        },
      },
    ];

    for (const migration of migrations) {
      if (appliedSet.has(migration.version)) {
        console.log(`  ⏩  Skipping ${migration.version} (already applied)`);
        continue;
      }

      console.log(`  ▶   Running ${migration.version}: ${migration.description}`);
      try {
        await migration.run();
        await db.collection('schema_migrations').insertOne({
          version:     migration.version,
          description: migration.description,
          applied_at:  new Date(),
        });
        console.log(`  ✅  ${migration.version} applied`);
      } catch (err) {
        console.error(`  ❌  ${migration.version} FAILED:`, err.message);
        throw err;
      }
    }

    console.log('Migration complete.');
  } finally {
    await client.close();
  }
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
