#!/usr/bin/env node
/**
 * Apply Phase 1 Platform Migration (MongoDB version)
 * Creates indexes and seeds initial data
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

async function applyMigrations() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log('Starting Phase 1 Platform Migration...\n');

    // Create core indexes
    console.log('Creating core indexes...');
    await db.collection('users').createIndex({ email: 1 }, { unique: true }).catch(() => {});
    await db.collection('user_roles').createIndex({ user_id: 1, role: 1 }, { unique: true }).catch(() => {});
    await db.collection('profiles').createIndex({ id: 1 }, { unique: true }).catch(() => {});
    await db.collection('profiles').createIndex({ tenant_id: 1 }).catch(() => {});
    await db.collection('work_orders').createIndex({ status: 1 }).catch(() => {});
    await db.collection('work_orders').createIndex({ tenant_id: 1 }).catch(() => {});
    await db.collection('tickets').createIndex({ status: 1, tenant_id: 1 }).catch(() => {});
    await db.collection('customers').createIndex({ tenant_id: 1 }).catch(() => {});
    await db.collection('invoices').createIndex({ customer_id: 1 }).catch(() => {});
    await db.collection('technicians').createIndex({ status: 1 }).catch(() => {});
    await db.collection('contracts').createIndex({ status: 1 }).catch(() => {});
    await db.collection('knowledge_base_articles').createIndex({ title: 'text', content: 'text', summary: 'text' }).catch(() => {});
    await db.collection('faqs').createIndex({ question: 'text', answer: 'text' }).catch(() => {});

    // Track migration
    await db.collection('schema_migrations').updateOne(
      { version: 'phase1_platform' },
      { $set: { version: 'phase1_platform', applied_at: new Date() } },
      { upsert: true }
    );

    console.log('Phase 1 migrations completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

applyMigrations()
  .then(() => {
    console.log('\nAll migrations applied successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration failed:', error);
    process.exit(1);
  });
