#!/usr/bin/env node
/**
 * Apply Phase 1 Platform Migration
 * Creates 19 missing tables and fixes schema issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrations = [
  '20251129_fix_profiles_schema.sql',
  '20251129_core_tables.sql',
  '20251129_knowledge_base_tables.sql',
  '20251129_phase1_platform_tables.sql'
];

async function applyMigrations() {
  const migrationsDir = path.join(__dirname, '../migrations');
  
  console.log('🚀 Starting Phase 1 Platform Migration...\n');

  // Create migrations tracking table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  for (const file of migrations) {
    const version = file.replace('.sql', '');
    const filePath = path.join(migrationsDir, file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${file} (file not found)`);
      continue;
    }

    // Check if already applied
    const result = await pool.query(
      'SELECT version FROM schema_migrations WHERE version = $1',
      [version]
    );

    if (result.rows.length > 0) {
      console.log(`⏭️  Skipping ${file} (already applied)`);
      continue;
    }

    console.log(`🔄 Applying ${file}...`);
    let sql = fs.readFileSync(filePath, 'utf8');
    
    // Replace Supabase-specific references for local PostgreSQL
    sql = sql
      .replace(/auth\.users/g, 'users')
      .replace(/REFERENCES auth\.users\(id\)/g, 'REFERENCES users(id)')
      .replace(/CREATE TABLE public\./g, 'CREATE TABLE IF NOT EXISTS ');

    try {
      await pool.query('BEGIN');
      await pool.query(sql);
      await pool.query(
        'INSERT INTO schema_migrations (version) VALUES ($1)',
        [version]
      );
      await pool.query('COMMIT');
      console.log(`✅ Applied ${file}\n`);
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error(`❌ Error applying ${file}:`, error.message);
      console.error(`   Details:`, error.detail || '');
      throw error;
    }
  }

  console.log('✅ Phase 1 migrations completed successfully!');
  await pool.end();
}

applyMigrations()
  .then(() => {
    console.log('\n🎉 All migrations applied successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

