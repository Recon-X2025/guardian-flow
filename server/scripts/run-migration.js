#!/usr/bin/env node

/**
 * Run database migration script
 * Usage: node server/scripts/run-migration.js <migration-file>
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'guardianflow',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function runMigration(migrationFile) {
  try {
    console.log(`📦 Running migration: ${migrationFile}`);
    
    const migrationPath = join(__dirname, 'migrations', migrationFile);
    const sql = readFileSync(migrationPath, 'utf8');
    
    console.log('🔌 Connecting to database...');
    const client = await pool.connect();
    
    try {
      console.log('▶️  Executing migration...');
      await client.query(sql);
      console.log('✅ Migration completed successfully!');
    } finally {
      client.release();
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

const migrationFile = process.argv[2] || 'add-payment-status.sql';
runMigration(migrationFile);

