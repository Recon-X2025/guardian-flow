import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { validateDatabaseCredentials } from '../config/dbValidation.js';

dotenv.config();

// Validate credentials in production
try {
  validateDatabaseCredentials();
} catch (err) {
  console.error(err.message);
  if (process.env.NODE_ENV === 'production') process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vivekkumar787067_db_user:Vivek09876@cluster0.xdkbkkd.mongodb.net/';
const DB_NAME = process.env.DB_NAME || 'guardianflow';
const MAX_RETRIES = parseInt(process.env.DB_CONNECT_RETRIES || '5', 10);
const RETRY_DELAY_MS = parseInt(process.env.DB_RETRY_DELAY_MS || '3000', 10);

const client = new MongoClient(MONGODB_URI, {
  maxPoolSize: parseInt(process.env.DB_POOL_MAX || '20', 10),
  connectTimeoutMS: parseInt(process.env.DB_POOL_CONNECT_TIMEOUT || '5000', 10),
  serverSelectionTimeoutMS: parseInt(process.env.DB_POOL_CONNECT_TIMEOUT || '5000', 10),
});

const db = client.db(DB_NAME);

/** Track connection state for health checks */
let connected = false;

async function connectWithRetry(retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await client.connect();
      connected = true;
      console.log('✅ Connected to MongoDB Atlas database');
      return;
    } catch (err) {
      console.error(`❌ MongoDB connection attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt < retries) {
        const delay = RETRY_DELAY_MS * attempt;
        console.log(`   Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  console.error('❌ All MongoDB connection attempts failed');
  if (process.env.NODE_ENV === 'production') {
    process.exit(-1);
  }
  // In development, server starts but health check reports degraded
}

connectWithRetry();

client.on('error', (err) => {
  console.error('❌ Unexpected MongoDB error', err.message);
  connected = false;
});

// Re-track connection when topology changes
client.on('topologyOpening', () => { connected = false; });
client.on('serverHeartbeatSucceeded', () => { connected = true; });
client.on('serverHeartbeatFailed', () => { connected = false; });

function isConnected() {
  return connected;
}

export { db, client, isConnected };
export default db;
