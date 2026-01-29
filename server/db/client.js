import pg from 'pg';
import dotenv from 'dotenv';
import { validateDatabaseCredentials } from '../config/dbValidation.js';

dotenv.config();

const { Pool } = pg;

// Validate credentials in production
try {
  validateDatabaseCredentials();
} catch (err) {
  console.error(err.message);
  if (process.env.NODE_ENV === 'production') process.exit(1);
}

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'guardianflow',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Enable SSL in production
if (process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false') {
  poolConfig.ssl = { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' };
}

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
