/**
 * @file server/middleware/tenantContext.js
 * @description
 * Express middleware that creates a request-scoped, tenant-isolated DB adapter.
 *
 * Must run AFTER `authenticateToken` so that `req.user` is populated.
 *
 * After this middleware:
 *   - `req.tenantId`  — the authenticated user's tenant_id (string | null)
 *   - `req.db`        — a tenant-scoped DbAdapter (all queries auto-filter by tenant_id)
 *
 * Routes can use `req.db.findMany(...)` instead of the global `findMany` and
 * get automatic tenant isolation with zero changes to query logic.
 */

import { getAdapter } from '../db/factory.js';
import { createTenantScopedAdapter } from '../db/tenantScope.js';

/**
 * Attach a tenant-scoped DB adapter to `req.db`.
 *
 * If the user has no tenantId (e.g. legacy users, sys_admins without a tenant),
 * `req.db` falls back to the unscoped base adapter for backward compatibility.
 */
export async function tenantContext(req, _res, next) {
  try {
    const baseAdapter = await getAdapter();
    const tenantId = req.user?.tenantId || null;

    req.tenantId = tenantId;
    req.db = createTenantScopedAdapter(baseAdapter, tenantId);

    next();
  } catch (err) {
    next(err);
  }
}
