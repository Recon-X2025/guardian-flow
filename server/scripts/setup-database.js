#!/usr/bin/env node

/**
 * Setup database - create if it doesn't exist and run migrations
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

const adminPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'postgres', // Connect to default postgres database
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const appPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'guardianflow',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function setupDatabase() {
  try {
    const dbName = process.env.DB_NAME || 'guardianflow';
    
    console.log('🔌 Connecting to PostgreSQL...');
    const adminClient = await adminPool.connect();
    
    try {
      // Check if database exists
      const dbCheck = await adminClient.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [dbName]
      );
      
      if (dbCheck.rows.length === 0) {
        console.log(`📦 Creating database '${dbName}'...`);
        await adminClient.query(`CREATE DATABASE ${dbName}`);
        console.log(`✅ Database '${dbName}' created`);
      } else {
        console.log(`✅ Database '${dbName}' already exists`);
      }
    } finally {
      adminClient.release();
    }
    
    await adminPool.end();
    
    // Now connect to the app database and run init script if needed
    console.log(`🔌 Connecting to '${dbName}'...`);
    const appClient = await appPool.connect();
    
    try {
      // Check if payment_status column exists (to see if migration was run)
      const migrationCheck = await appClient.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'invoices'
          AND column_name = 'payment_status'
        )
      `);
      
      if (!migrationCheck.rows[0].exists) {
        // Run migration
        console.log('📦 Running payment status migration...');
        const migrationSql = readFileSync(join(__dirname, 'migrations', 'add-payment-status.sql'), 'utf8');
        await appClient.query(migrationSql);
        console.log('✅ Migration completed successfully!');
      } else {
        console.log('✅ Payment status migration already applied');
      }
      
    } finally {
      appClient.release();
    }
    
    await appPool.end();
    console.log('✅ Database setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error(error);
    await adminPool.end();
    await appPool.end();
    process.exit(1);
  }
}

setupDatabase();

