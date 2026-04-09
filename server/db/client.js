/**
 * @file server/db/client.js
 * @description
 * Backward-compatible re-export shim.
 *
 * Existing code that does:
 *   import { db, client, isConnected } from '../db/client.js';
 * continues to work without modification.
 *
 * When DB_ADAPTER=mongodb (default):
 *   - `db`     → raw mongodb.Db object (supports cursor API, createIndex, etc.)
 *   - `client` → raw MongoClient       (supports sessions, close())
 *   - `isConnected` → live heartbeat tracker
 *
 * When DB_ADAPTER=postgresql:
 *   - `db`     → null  (callers using raw MongoDB cursor API need migration)
 *   - `client` → null
 *   - `isConnected` → pg pool live-check
 *
 * New code should import from the factory instead:
 *   import { getAdapter } from './factory.js';
 */

import { getAdapterName } from './factory.js';

let db     = null;
let client = null;
let isConnected = () => false;

const adapterName = getAdapterName();

if (adapterName === 'mongodb') {
  // Import synchronously from the MongoDB adapter module.
  // The adapter module starts the connection on import, exactly as before.
  const mongo = await import('./adapters/mongodb.js');
  db          = mongo.db;
  client      = mongo.mongoClient;
  isConnected = mongo.default.isConnected;
} else {
  // PostgreSQL (or future adapters): raw `db` / `client` are not applicable.
  // Import the adapter so its connection is started.
  const pgMod = await import('./adapters/postgresql.js');
  isConnected = pgMod.default.isConnected;
}

export { db, client, isConnected };
export default db;
