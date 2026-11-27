/**
 * @file server/db/tenantScope.js
 * @description
 * Tenant-scoped adapter wrapper for multi-tenant isolation.
 *
 * Wraps any DbAdapter and automatically injects `tenant_id` into all queries,
 * inserts, updates, and aggregations — except for global collections that are
 * shared across tenants.
 *
 * Usage
 * -----
 *   import { createTenantScopedAdapter, GLOBAL_COLLECTIONS } from './tenantScope.js';
 *   const scopedAdapter = createTenantScopedAdapter(baseAdapter, tenantId);
 *   // All calls now automatically filter / stamp by tenant_id
 */

/**
 * Collections that are NOT tenant-scoped (shared globally).
 * Queries against these collections pass through without modification.
 */
export const GLOBAL_COLLECTIONS = new Set([
  'users',
  'refresh_tokens',
  'password_reset_tokens',
  'token_blacklist',
  'organizations',
  'tenants',          // the orgs/tenants table itself
  'org_invites',      // invites reference tenant_id explicitly
  'user_roles',       // roles are looked up by user_id across tenants
  'role_permissions',
  'permissions',
]);

/**
 * Create a tenant-scoped adapter that wraps a base DbAdapter.
 *
 * For tenant-scoped collections, every operation automatically includes
 * the tenant_id in filters and documents. For global collections, the
 * base adapter is called directly without modification.
 *
 * @param {import('./interface.js').DbAdapter} baseAdapter
 * @param {string} tenantId
 * @returns {import('./interface.js').DbAdapter}
 */
export function createTenantScopedAdapter(baseAdapter, tenantId) {
  if (!tenantId) {
    // No tenant — return the base adapter unmodified (backward compatible)
    return baseAdapter;
  }

  function isGlobal(collection) {
    return GLOBAL_COLLECTIONS.has(collection);
  }

  function scopeFilter(collection, filter) {
    if (isGlobal(collection)) return filter || {};
    return { ...(filter || {}), tenant_id: tenantId };
  }

  function stampDoc(collection, doc) {
    if (isGlobal(collection)) return doc;
    return { ...doc, tenant_id: tenantId };
  }

  return {
    // --- Query methods with tenant scoping ---

    findMany(collection, filter, opts) {
      return baseAdapter.findMany(collection, scopeFilter(collection, filter), opts);
    },

    findOne(collection, filter) {
      return baseAdapter.findOne(collection, scopeFilter(collection, filter));
    },

    insertOne(collection, doc) {
      return baseAdapter.insertOne(collection, stampDoc(collection, doc));
    },

    insertMany(collection, docs) {
      const stamped = isGlobal(collection)
        ? docs
        : docs.map(d => ({ ...d, tenant_id: tenantId }));
      return baseAdapter.insertMany(collection, stamped);
    },

    updateOne(collection, filter, update, opts) {
      return baseAdapter.updateOne(collection, scopeFilter(collection, filter), update, opts);
    },

    deleteMany(collection, filter) {
      return baseAdapter.deleteMany(collection, scopeFilter(collection, filter));
    },

    countDocuments(collection, filter) {
      return baseAdapter.countDocuments(collection, scopeFilter(collection, filter));
    },

    aggregate(collection, pipeline) {
      if (isGlobal(collection)) {
        return baseAdapter.aggregate(collection, pipeline);
      }
      // Prepend a $match stage for tenant_id
      const scopedPipeline = [
        { $match: { tenant_id: tenantId } },
        ...pipeline,
      ];
      return baseAdapter.aggregate(collection, scopedPipeline);
    },

    // --- Pass-through methods (not tenant-scoped) ---

    transaction: baseAdapter.transaction.bind(baseAdapter),
    isConnected: baseAdapter.isConnected.bind(baseAdapter),
    ping: baseAdapter.ping.bind(baseAdapter),
    ensureIndex: baseAdapter.ensureIndex.bind(baseAdapter),
    close: baseAdapter.close.bind(baseAdapter),

    // Expose raw getCollection if available (e.g. for MongoDB)
    ...(typeof baseAdapter.getCollection === 'function'
      ? { getCollection: baseAdapter.getCollection.bind(baseAdapter) }
      : {}),

    // Expose the tenant ID for debugging / logging
    __tenantId: tenantId,
  };
}
