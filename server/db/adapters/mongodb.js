/**
 * @file server/db/adapters/mongodb.js
 * @description
 * MongoDB adapter — satisfies the DbAdapter interface defined in
 * server/db/interface.js.
 *
 * This module is the sole home of all MongoDB-driver code.  No route handler
 * or service should import the `mongodb` package directly; everything goes
 * through this adapter (or the backward-compat re-exports in client.js /
 * query.js).
 *
 * Exports
 * -------
 *   default    — the validated DbAdapter object
 *   db         — raw mongodb.Db  (for legacy callers that need cursor API)
 *   mongoClient — raw MongoClient (for sessions / graceful shutdown)
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { validateDatabaseCredentials } from '../../config/dbValidation.js';
import { validateAdapter } from '../interface.js';

dotenv.config();

// ── Credential validation (production only) ──────────────────────────────────
try {
  validateDatabaseCredentials();
} catch (err) {
  console.error(err.message);
  if (process.env.NODE_ENV === 'production') process.exit(1);
}

// ── Configuration ─────────────────────────────────────────────────────────────
const MONGODB_URI    = process.env.MONGODB_URI || 'mongodb://localhost:27017/';
const DB_NAME        = process.env.DB_NAME || 'guardianflow';
const MAX_RETRIES    = parseInt(process.env.DB_CONNECT_RETRIES  || '5',    10);
const RETRY_DELAY_MS = parseInt(process.env.DB_RETRY_DELAY_MS   || '3000', 10);

// ── Client & connection ───────────────────────────────────────────────────────
const mongoClient = new MongoClient(MONGODB_URI, {
  maxPoolSize:                 parseInt(process.env.DB_POOL_MAX              || '20',   10),
  connectTimeoutMS:            parseInt(process.env.DB_POOL_CONNECT_TIMEOUT || '5000', 10),
  serverSelectionTimeoutMS:    parseInt(process.env.DB_POOL_CONNECT_TIMEOUT || '5000', 10),
});

export const db = mongoClient.db(DB_NAME);

let connected = false;

async function connectWithRetry(retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoClient.connect();
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

mongoClient.on('error',                  (err) => { console.error('❌ Unexpected MongoDB error', err.message); connected = false; });
mongoClient.on('topologyOpening',        ()    => { connected = false; });
mongoClient.on('serverHeartbeatSucceeded', () => { connected = true;  });
mongoClient.on('serverHeartbeatFailed',  ()    => { connected = false; });

// ── Helper ────────────────────────────────────────────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';

/** MongoDB error code for duplicate key / unique-constraint violation */
const MONGO_DUPLICATE_KEY = 11000;

function logQuery(label, meta) {
  if (!isProduction) {
    console.log(label, meta);
  } else if (meta.duration > 1000) {
    console.warn('Slow query', meta);
  }
}

// ── Adapter methods ───────────────────────────────────────────────────────────

function isConnected() {
  return connected;
}

async function ping() {
  await db.admin().ping();
}

async function close() {
  await mongoClient.close();
}

async function ensureIndex(collection, { keys, options = {} }) {
  try {
    await db.collection(collection).createIndex(keys, options);
  } catch {
    // Index already exists — safe to ignore
  }
}

async function transaction(callback) {
  const session = mongoClient.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await callback(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

async function findMany(table, filter = {}, opts = {}) {
  const start = Date.now();
  try {
    let cursor = db.collection(table).find(filter);
    if (opts.projection) cursor = cursor.project(opts.projection);
    if (opts.sort)       cursor = cursor.sort(opts.sort);
    if (opts.skip)       cursor = cursor.skip(opts.skip);
    if (opts.limit)      cursor = cursor.limit(opts.limit);
    const results = await cursor.toArray();
    logQuery('Executed query', { collection: table, duration: Date.now() - start, rows: results.length });
    return results;
  } catch (error) {
    if (isProduction) {
      console.error('Query error', { collection: table, duration: Date.now() - start, error: error.message });
    } else {
      console.error('Query error', { collection: table, error: error.message });
    }
    throw error;
  }
}

async function findOne(table, filter = {}) {
  const start = Date.now();
  try {
    const result = await db.collection(table).findOne(filter);
    logQuery('Executed query', { collection: table, duration: Date.now() - start, rows: result ? 1 : 0 });
    return result || null;
  } catch (error) {
    console.error('Query error', { collection: table, error: error.message });
    throw error;
  }
}

async function insertOne(table, doc) {
  const start = Date.now();
  try {
    const result = await db.collection(table).insertOne({ ...doc });
    logQuery('Executed insert', { collection: table, duration: Date.now() - start });
    return { ...doc, _id: result.insertedId };
  } catch (error) {
    // Duplicate key — return null (matches ON CONFLICT DO NOTHING behaviour)
    if (error.code === MONGO_DUPLICATE_KEY) return null;
    console.error('Insert error', { collection: table, error: error.message });
    throw error;
  }
}

async function insertMany(table, docs) {
  if (!docs || docs.length === 0) return [];
  const start = Date.now();
  try {
    const result = await db.collection(table).insertMany(docs, { ordered: false });
    logQuery('Executed insertMany', { collection: table, duration: Date.now() - start, count: result.insertedCount });
    return docs.map((doc, i) => ({ ...doc, _id: result.insertedIds[i] }));
  } catch (error) {
    // Partial insert with duplicates
    if (error.code === MONGO_DUPLICATE_KEY) return docs;
    console.error('InsertMany error', { collection: table, error: error.message });
    throw error;
  }
}

async function updateOne(table, filter, update, opts = {}) {
  const start = Date.now();
  try {
    let updateOp;
    if (update.$set || update.$setOnInsert || update.$inc || update.$push || update.$unset) {
      updateOp = { ...update };
    } else {
      updateOp = { $set: { ...update } };
    }

    const result = await db.collection(table).findOneAndUpdate(
      filter,
      updateOp,
      { upsert: opts.upsert || false, returnDocument: 'after' }
    );

    logQuery('Executed update', { collection: table, duration: Date.now() - start });
    return result || null;
  } catch (error) {
    console.error('Update error', { collection: table, error: error.message });
    throw error;
  }
}

async function deleteMany(table, filter = {}) {
  const start = Date.now();
  try {
    const result = await db.collection(table).deleteMany(filter);
    logQuery('Executed delete', { collection: table, duration: Date.now() - start, count: result.deletedCount });
    return result.deletedCount;
  } catch (error) {
    console.error('Delete error', { collection: table, error: error.message });
    throw error;
  }
}

async function countDocuments(table, filter = {}) {
  try {
    return await db.collection(table).countDocuments(filter);
  } catch (error) {
    console.error('Count error', { collection: table, error: error.message });
    throw error;
  }
}

async function aggregate(table, pipeline) {
  const start = Date.now();
  try {
    const results = await db.collection(table).aggregate(pipeline).toArray();
    logQuery('Executed aggregation', { collection: table, duration: Date.now() - start, rows: results.length });
    return results;
  } catch (error) {
    console.error('Aggregation error', { collection: table, error: error.message });
    throw error;
  }
}

// ── Validated adapter export ──────────────────────────────────────────────────
const mongoAdapter = validateAdapter({
  findMany,
  findOne,
  insertOne,
  insertMany,
  updateOne,
  deleteMany,
  countDocuments,
  aggregate,
  transaction,
  isConnected,
  ping,
  ensureIndex,
  close,
});

export { mongoClient };
export default mongoAdapter;
