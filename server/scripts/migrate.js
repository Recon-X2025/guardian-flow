#!/usr/bin/env node
/**
 * MongoDB migration runner
 * Since MongoDB is schemaless, this primarily runs the index setup
 * and any data transformations needed between versions.
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

    // Create migrations tracking collection
    const migrationsApplied = await db.collection('schema_migrations').find({}).toArray();
    const appliedVersions = new Set(migrationsApplied.map(m => m.version));

    // Define migrations as functions
    const migrations = [
      {
        version: '001_initial_indexes',
        description: 'Create initial collection indexes',
        run: async () => {
          // Users & Auth
          await db.collection('users').createIndex({ email: 1 }, { unique: true }).catch(() => {});
          await db.collection('user_roles').createIndex({ user_id: 1, role: 1 }, { unique: true }).catch(() => {});
          await db.collection('profiles').createIndex({ id: 1 }, { unique: true }).catch(() => {});
          await db.collection('token_blacklist').createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }).catch(() => {});
          await db.collection('token_blacklist').createIndex({ jti: 1 }).catch(() => {});
          await db.collection('refresh_tokens').createIndex({ token_hash: 1 }).catch(() => {});

          // Core business
          await db.collection('work_orders').createIndex({ status: 1 }).catch(() => {});
          await db.collection('work_orders').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('invoices').createIndex({ customer_id: 1 }).catch(() => {});
          await db.collection('customers').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('technicians').createIndex({ status: 1 }).catch(() => {});

          // Knowledge base text search
          await db.collection('knowledge_base_articles').createIndex(
            { title: 'text', content: 'text', summary: 'text' }
          ).catch(() => {});
          await db.collection('faqs').createIndex(
            { question: 'text', answer: 'text' }
          ).catch(() => {});
        },
      },
      {
        version: '002_token_blacklist_ttl',
        description: 'Set up TTL index for token blacklist auto-cleanup',
        run: async () => {
          await db.collection('token_blacklist').createIndex(
            { expires_at: 1 },
            { expireAfterSeconds: 0 }
          ).catch(() => {});
          await db.collection('user_token_revocations').createIndex(
            { revoked_at: 1 },
            { expireAfterSeconds: 30 * 24 * 60 * 60 } // 30 days
          ).catch(() => {});
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
