#!/usr/bin/env node
/**
 * MongoDB migration runner — Sprint 34 (Crew Work Orders + Territory Planning + MFA TOTP)
 *
 * Adds:
 *  - Crew fields to work_orders collection
 *  - territories collection
 *  - asset_compliance_certs collection
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

    // Ensure schema_migrations collection exists
    await db.createCollection('schema_migrations').catch(() => {});
    await db.collection('schema_migrations').createIndex({ version: 1 }, { unique: true }).catch(() => {});

    const applied    = await db.collection('schema_migrations').find({}).toArray();
    const appliedSet = new Set(applied.map(m => m.version));

    const migrations = [
      {
        version: '034_crew_fields_work_orders',
        description: 'Add crew_members, crew_lead, min_crew_size, max_crew_size to work_orders',
        run: async () => {
          // Add default values to existing documents that are missing the fields
          await db.collection('work_orders').updateMany(
            { crew_members: { $exists: false } },
            { $set: { crew_members: [], crew_lead: null, min_crew_size: 1, max_crew_size: 10 } }
          );
          // Indexes for efficient crew queries
          await db.collection('work_orders').createIndex({ crew_members: 1 }).catch(() => {});
          await db.collection('work_orders').createIndex({ crew_lead: 1 }).catch(() => {});
          await db.collection('work_orders').createIndex({ tenant_id: 1, status: 1 }).catch(() => {});
        },
      },

      {
        version: '034_territories_collection',
        description: 'Create territories collection with GeoJSON polygon support',
        run: async () => {
          await db.createCollection('territories').catch(() => {});
          await db.collection('territories').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('territories').createIndex({ tenant_id: 1, name: 1 }, { unique: true }).catch(() => {});
          await db.collection('territories').createIndex({ 'polygon.geometry': '2dsphere' }).catch(() => {});
          await db.collection('territories').createIndex({ defaultTechnicianIds: 1 }).catch(() => {});
          await db.collection('territories').createIndex({ managerIds: 1 }).catch(() => {});
        },
      },

      {
        version: '034_asset_compliance_certs_collection',
        description: 'Create asset_compliance_certs collection',
        run: async () => {
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
        version: '034_mfa_user_fields',
        description: 'Ensure MFA fields are indexed on users collection',
        run: async () => {
          // mfa_secret, mfa_enabled, mfa_pending stored directly on users documents
          await db.collection('users').createIndex({ mfa_enabled: 1 }).catch(() => {});
          // Backup codes collection
          await db.createCollection('mfa_backup_codes').catch(() => {});
          await db.collection('mfa_backup_codes').createIndex({ user_id: 1 }).catch(() => {});
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
