/**
 * @file server/db/query.js
 * @description
 * Backward-compatible re-export shim.
 *
 * Existing code that does:
 *   import { findMany, insertOne, ... } from '../db/query.js';
 * continues to work without modification — the calls are now forwarded to
 * whichever adapter is active (MongoDB or PostgreSQL).
 *
 * New code should import from the factory instead:
 *   import { getAdapter } from './factory.js';
 */

import { getAdapter } from './factory.js';

const adapter = await getAdapter();

export const findMany       = adapter.findMany.bind(adapter);
export const findOne        = adapter.findOne.bind(adapter);
export const insertOne      = adapter.insertOne.bind(adapter);
export const insertMany     = adapter.insertMany.bind(adapter);
export const updateOne      = adapter.updateOne.bind(adapter);
export const deleteMany     = adapter.deleteMany.bind(adapter);
export const countDocuments = adapter.countDocuments.bind(adapter);
export const aggregate      = adapter.aggregate.bind(adapter);
export const transaction    = adapter.transaction.bind(adapter);

/**
 * Get a raw MongoDB collection (MongoDB adapter only).
 * Returns null when using the PostgreSQL adapter.
 * @deprecated Prefer the adapter methods; avoid raw collection access.
 */
export function getCollection(name) {
  if (typeof adapter.getCollection === 'function') {
    return adapter.getCollection(name);
  }
  return null;
}
