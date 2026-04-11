#!/usr/bin/env node
/**
 * @file server/scripts/sprint36-migration.js
 * @description MongoDB migration — Sprint 36
 * (Offline PWA + Asset CMDB Dependency Graph + Truck Stock + Compliance Certificates)
 *
 * Adds:
 *  - parent_asset_id, child_asset_ids, dependency_type fields to assets collection
 *  - asset_compliance_certs collection (skipped if already created in sprint34)
 *  - technician_vehicles collection
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
        version: '036_assets_dependency_fields',
        description: 'Add dependency graph fields to assets collection',
        run: async () => {
          await db.collection('assets').updateMany(
            { parent_asset_id: { $exists: false } },
            {
              $set: {
                parent_asset_id: null,
                child_asset_ids: [],
                dependency_type: null,
              },
            },
          );
          await db.collection('assets').createIndex({ parent_asset_id: 1 }).catch(() => {});
          await db.collection('assets').createIndex({ child_asset_ids: 1 }).catch(() => {});
          await db.collection('assets').createIndex({ tenant_id: 1, parent_asset_id: 1 }).catch(() => {});
        },
      },

      {
        version: '036_asset_compliance_certs_collection',
        description: 'Create asset_compliance_certs collection (no-op if already created in sprint34)',
        run: async () => {
          // sprint34 may have already created this — createCollection is idempotent via catch
          await db.createCollection('asset_compliance_certs').catch(() => {});
          await db.collection('asset_compliance_certs').createIndex({ assetId: 1 }).catch(() => {});
          await db.collection('asset_compliance_certs').createIndex({ tenantId: 1 }).catch(() => {});
          await db.collection('asset_compliance_certs').createIndex({ tenantId: 1, assetId: 1 }).catch(() => {});
          await db.collection('asset_compliance_certs').createIndex({ expiryDate: 1 }).catch(() => {});
          await db.collection('asset_compliance_certs').createIndex({ status: 1 }).catch(() => {});
          await db.collection('asset_compliance_certs').createIndex({ certType: 1 }).catch(() => {});
        },
      },

      {
        version: '036_technician_vehicles_collection',
        description: 'Create technician_vehicles collection for truck stock',
        run: async () => {
          await db.createCollection('technician_vehicles').catch(() => {});
          await db.collection('technician_vehicles').createIndex({ technicianId: 1 }, { unique: true }).catch(() => {});
          await db.collection('technician_vehicles').createIndex({ tenantId: 1 }).catch(() => {});
          await db.collection('technician_vehicles').createIndex({ tenantId: 1, technicianId: 1 }).catch(() => {});
        },
      },
    ];

    for (const migration of migrations) {
      if (appliedSet.has(migration.version)) {
        console.log(`  ⏩  Skipping ${migration.version} (already applied)`);
        continue;
      }
      try {
        console.log(`  ▶  Running ${migration.version}: ${migration.description}`);
        await migration.run();
        await db.collection('schema_migrations').insertOne({
          version:     migration.version,
          description: migration.description,
          appliedAt:   new Date(),
        });
        console.log(`  ✅  ${migration.version} applied`);
      } catch (err) {
        console.error(`  ❌  ${migration.version} failed:`, err.message);
        throw err;
      }
    }

    console.log('\nSprint 36 migrations complete.');
  } finally {
    await client.close();
  }
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
