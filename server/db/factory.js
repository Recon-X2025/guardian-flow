/**
 * @file server/db/factory.js
 * @description
 * Connection factory — reads the DB_ADAPTER environment variable and returns
 * the active DbAdapter singleton.
 *
 * Supported values of DB_ADAPTER
 * --------------------------------
 *   mongodb    (default)  — MongoDB Atlas / on-prem via MONGODB_URI
 *   postgresql / postgres — PostgreSQL via POSTGRES_URI
 *
 * Usage
 * -----
 *   import { getAdapter } from './factory.js';
 *   const adapter = await getAdapter();
 *   const user = await adapter.findOne('users', { email });
 */

import { validateAdapter } from './interface.js';

/** @type {import('./interface.js').DbAdapter | null} */
let _adapter = null;

/**
 * Return the active database adapter (lazy singleton).
 * The adapter is chosen once based on `process.env.DB_ADAPTER`.
 *
 * @returns {Promise<import('./interface.js').DbAdapter>}
 */
export async function getAdapter() {
  if (_adapter) return _adapter;

  const adapterName = (process.env.DB_ADAPTER || 'mongodb').toLowerCase().trim();
  console.log(`📦 Initialising DB adapter: ${adapterName}`);

  switch (adapterName) {
    case 'mongodb': {
      const { default: mongoAdapter } = await import('./adapters/mongodb.js');
      _adapter = mongoAdapter;
      break;
    }
    case 'postgresql':
    case 'postgres': {
      const { default: pgAdapter } = await import('./adapters/postgresql.js');
      _adapter = pgAdapter;
      break;
    }
    default:
      throw new Error(
        `Unknown DB_ADAPTER: "${adapterName}". ` +
        `Valid values: mongodb, postgresql`
      );
  }

  return validateAdapter(_adapter);
}

/**
 * Return the adapter name currently active.
 * @returns {string}
 */
export function getAdapterName() {
  return (process.env.DB_ADAPTER || 'mongodb').toLowerCase().trim();
}

/**
 * Reset the cached adapter (test helper — not for production use).
 * @internal
 */
export function _resetAdapter() {
  _adapter = null;
}
