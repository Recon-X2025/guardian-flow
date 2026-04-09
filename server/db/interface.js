/**
 * @file server/db/interface.js
 * @description
 * DB-Agnostic Repository Interface — the contract that both the MongoDB and
 * PostgreSQL adapters must satisfy.  Neither MongoDB nor Postgres code leaks
 * past this point into route handlers.
 *
 * Usage
 * -----
 *   import { validateAdapter } from './interface.js';
 *   const myAdapter = validateAdapter({ findMany, findOne, ... });
 */

/**
 * @typedef {Object} FindManyOpts
 * @property {object}  [sort]        - Sort spec  { field: 1 | -1 }
 * @property {number}  [limit]       - Max rows to return
 * @property {number}  [skip]        - Rows to skip (pagination offset)
 * @property {object}  [projection]  - Fields to include / exclude
 */

/**
 * @typedef {Object} UpdateOpts
 * @property {boolean} [upsert=false] - Insert if no document matches the filter
 */

/**
 * @typedef {Object} IndexSpec
 * @property {object}  keys     - Field → direction map  { field: 1 | -1 }
 * @property {object}  [options] - e.g. { unique: true, expireAfterSeconds: 0 }
 */

/**
 * @typedef {Object} DbAdapter
 *
 * @property {(collection: string, filter?: object, opts?: FindManyOpts) => Promise<any[]>} findMany
 *   Return all documents matching `filter`.
 *
 * @property {(collection: string, filter?: object) => Promise<any|null>} findOne
 *   Return the first document matching `filter`, or null.
 *
 * @property {(collection: string, doc: object) => Promise<any|null>} insertOne
 *   Insert a single document.  Returns the inserted doc (with generated id) or
 *   null on duplicate-key conflict.
 *
 * @property {(collection: string, docs: object[]) => Promise<any[]>} insertMany
 *   Insert multiple documents. Silently skips duplicates.
 *
 * @property {(collection: string, filter: object, update: object, opts?: UpdateOpts) => Promise<any|null>} updateOne
 *   Update the first document matching `filter`.  Supports MongoDB-style
 *   operators ($set, $setOnInsert, $inc, $push, $unset) or a plain object
 *   (treated as $set).  Returns the updated doc, or null if not found.
 *
 * @property {(collection: string, filter?: object) => Promise<number>} deleteMany
 *   Delete all documents matching `filter`.  Returns the count of deleted docs.
 *
 * @property {(collection: string, filter?: object) => Promise<number>} countDocuments
 *   Return the count of documents matching `filter`.
 *
 * @property {(collection: string, pipeline: object[]) => Promise<any[]>} aggregate
 *   Execute an aggregation pipeline.
 *
 * @property {(callback: (session: any) => Promise<any>) => Promise<any>} transaction
 *   Execute `callback` inside a database transaction / session.
 *   The session/client handle is passed to the callback.
 *
 * @property {() => boolean} isConnected
 *   Return true when the underlying connection is live.
 *
 * @property {() => Promise<void>} ping
 *   Lightweight health-check — throws if the DB is unreachable.
 *
 * @property {(collection: string, indexSpec: IndexSpec) => Promise<void>} ensureIndex
 *   Idempotently create an index.  Safe to call on every startup.
 *
 * @property {() => Promise<void>} close
 *   Gracefully close the connection / pool.
 */

const REQUIRED_METHODS = [
  'findMany',
  'findOne',
  'insertOne',
  'insertMany',
  'updateOne',
  'deleteMany',
  'countDocuments',
  'aggregate',
  'transaction',
  'isConnected',
  'ping',
  'ensureIndex',
  'close',
];

/**
 * Validate that `adapter` satisfies the DbAdapter interface at runtime.
 * Throws an Error listing any missing methods.
 *
 * @param {object} adapter
 * @returns {DbAdapter}
 */
export function validateAdapter(adapter) {
  const missing = REQUIRED_METHODS.filter(m => typeof adapter[m] !== 'function');
  if (missing.length > 0) {
    throw new Error(
      `DB adapter is missing required methods: ${missing.join(', ')}`
    );
  }
  return /** @type {DbAdapter} */ (adapter);
}
