import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  // Check both migrations locations
  let migrationsDir = path.join(__dirname, '../migrations');
  if (!fs.existsSync(migrationsDir)) {
    migrationsDir = path.join(__dirname, 'migrations');
  }
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files`);

  // Create migrations tracking table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  for (const file of files) {
    const version = file.replace('.sql', '');
    
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
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    
    // Replace Supabase-specific references
    let modifiedSql = sql
      .replace(/auth\.users/g, 'users')
      .replace(/REFERENCES auth\.users\(id\)/g, 'REFERENCES users(id)')
      .replace(/CREATE TABLE public\./g, 'CREATE TABLE IF NOT EXISTS ')
      .replace(/CREATE TABLE (?!IF NOT EXISTS)/g, 'CREATE TABLE IF NOT EXISTS ');

    try {
      await pool.query('BEGIN');
      await pool.query(modifiedSql);
      await pool.query(
        'INSERT INTO schema_migrations (version) VALUES ($1)',
        [version]
      );
      await pool.query('COMMIT');
      console.log(`✅ Applied ${file}`);
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error(`❌ Error applying ${file}:`, error.message);
      throw error;
    }
  }

  console.log('✅ All migrations applied');
  await pool.end();
}

runMigrations().catch(console.error);

