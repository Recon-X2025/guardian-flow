#!/usr/bin/env node
/**
 * Run a named MongoDB migration
 * Usage: node server/scripts/run-migration.js <migration-name>
 *
 * Since MongoDB doesn't use SQL files, this now runs named migration functions.
 * For most cases, use migrate.js instead.
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

async function runMigration(migrationName) {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`Running migration: ${migrationName}`);

    // Available migrations
    const migrations = {
      'init-indexes': async () => {
        // Run the full init-mongodb.js index setup
        const { default: init } = await import('./init-mongodb.js');
      },
      'seed-data': async () => {
        // Run the create-missing-tables.js (now seed data)
        const { default: seed } = await import('./create-missing-tables.js');
      },
    };

    if (!migrations[migrationName]) {
      console.log(`Unknown migration: ${migrationName}`);
      console.log('Available migrations:', Object.keys(migrations).join(', '));
      process.exit(1);
    }

    await migrations[migrationName]();
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

const migrationName = process.argv[2] || 'init-indexes';
runMigration(migrationName);
