import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';

export function auditLogMiddleware(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || !req.user) return next();
  const entry = {
    id: randomUUID(), tenant_id: req.user.tenantId, actor_id: req.user.userId,
    actor_email: req.user.email || req.user.userId, method: req.method, path: req.path,
    body_summary: req.body ? JSON.stringify(req.body).substring(0, 200) : null,
    ip: req.ip, created_at: new Date(),
  };
  getAdapter().then(a => a.insertOne('audit_logs', entry)).catch(() => {});
  next();
}
