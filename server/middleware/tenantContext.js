/**
 * Canonical tenant/security helpers for authenticated domain routes.
 *
 * Tenant identity must come from the authenticated principal. Never accept a
 * tenant id from request params, query parameters, or request bodies.
 */

export function getTenantId(req) {
  return req.securityContext?.tenantId ?? req.user?.tenantId ?? req.user?.tenant_id ?? null;
}

export function requireTenantId(req, res) {
  const tenantId = getTenantId(req);
  if (!tenantId) {
    res.status(403).json({ error: 'Tenant context required' });
    return null;
  }
  return tenantId;
}

/**
 * Verify that a referenced record belongs to the authenticated tenant.
 * Returns the record when valid, otherwise null.
 */
export async function findTenantRecord(db, collection, id, tenantId, idField = '_id') {
  if (!id || !tenantId) return null;
  return db.findOne(collection, { [idField]: id, tenant_id: tenantId });
}

/**
 * Verify a set of optional references against the same tenant.
 *
 * references: [{ collection, id, label, idField? }]
 * Returns null when all references are valid; otherwise returns a human-readable
 * error label for the first invalid reference.
 */
export async function validateTenantReferences(db, tenantId, references = []) {
  for (const ref of references) {
    if (ref?.id == null || ref.id === '') continue;
    const record = await findTenantRecord(db, ref.collection, ref.id, tenantId, ref.idField || '_id');
    if (!record) return ref.label || ref.collection;
  }
  return null;
}
