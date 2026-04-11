import { getAdapter } from '../../db/factory.js';
import { randomUUID } from 'crypto';
import { createHmac } from 'crypto';

function formatCEF(event) {
  const severity = event.result === 'failure' ? 7 : 2;
  const ext = Object.entries({
    rt: new Date(event.timestamp || Date.now()).getTime(),
    src: event.ip || '0.0.0.0',
    suser: event.userId || 'unknown',
    act: event.action || 'unknown',
    outcome: event.result || 'success',
    tenantId: event.tenantId || '',
    resource: event.resource || '',
  }).map(([k, v]) => `${k}=${String(v).replace(/[=\\]/g, '')}`).join(' ');
  return `CEF:0|GuardianFlow|GuardianFlow|1.0|${event.action || 'audit'}|${event.action || 'Audit Event'}|${severity}|${ext}`;
}

function formatJSONExport(events) {
  return JSON.stringify(events.map(e => ({
    timestamp: e.timestamp || e.created_at || new Date(),
    tenantId: e.tenant_id || e.tenantId,
    userId: e.user_id || e.userId,
    action: e.action,
    resource: e.resource,
    ip: e.ip,
    result: e.result || 'success',
  })));
}

export async function exportAuditLog(tenantId, sinceTimestamp) {
  const adapter = await getAdapter();
  const siemConfig = await adapter.findOne('siem_configs', { tenantId, active: true });
  const format = siemConfig?.format || 'json';
  const since = sinceTimestamp || new Date(Date.now() - 3600000);

  let events = [];
  try {
    events = await adapter.findMany('audit_logs', { tenant_id: tenantId }, { sort: { created_at: -1 }, limit: 500 });
    events = events.filter(e => new Date(e.created_at || 0) >= new Date(since));
  } catch { events = []; }

  if (format === 'cef') {
    return events.map(e => formatCEF({ ...e, tenantId })).join('\n');
  }
  return formatJSONExport(events);
}

export async function sendToSIEM(tenantId) {
  const adapter = await getAdapter();
  const config = await adapter.findOne('siem_configs', { tenantId, active: true });
  if (!config) return { skipped: true };

  const payload = await exportAuditLog(tenantId, config.lastExportAt);
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);

  const hmac = createHmac('sha256', config.auth_token || 'default');
  hmac.update(body);
  const sig = hmac.digest('hex');

  try {
    const resp = await fetch(config.endpoint_url, {
      method: 'POST',
      headers: {
        'Content-Type': config.format === 'cef' ? 'text/plain' : 'application/json',
        'X-GuardianFlow-Signature': sig,
      },
      body,
    });
    await adapter.updateOne('siem_configs', { tenantId }, { $set: { lastExportAt: new Date() } });
    return { ok: resp.ok, status: resp.status };
  } catch (e) {
    return { error: e.message };
  }
}

export async function scheduleHourlyExport() {
  const run = async () => {
    try {
      const adapter = await getAdapter();
      const configs = await adapter.findMany('siem_configs', { active: true }, { limit: 100 });
      for (const cfg of configs) {
        try { await sendToSIEM(cfg.tenantId); } catch { /* per-tenant error */ }
      }
    } catch { /* non-critical */ }
  };
  setInterval(run, 3600000);
}
