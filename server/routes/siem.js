import express from 'express';
import { randomUUID } from 'crypto';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import { getAdapter } from '../db/factory.js';
import { exportAuditLog, sendToSIEM } from '../services/audit/siem-export.js';

const router = express.Router();

const CIPHER_KEY = Buffer.from((process.env.SIEM_CIPHER_KEY || '').padEnd(32, '0').slice(0, 32));

function encryptToken(token) {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', CIPHER_KEY, iv);
  const enc = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + enc.toString('hex');
}

function decryptToken(encrypted) {
  try {
    const [ivHex, encHex] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const enc = Buffer.from(encHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', CIPHER_KEY, iv);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  } catch {
    return encrypted; // fallback
  }
}

function maskToken(token) {
  if (!token) return null;
  return token.slice(0, 4) + '****';
}

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

router.post('/admin/siem/configure', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { endpoint_url, format, auth_token, active } = req.body;
    if (!endpoint_url) return res.status(400).json({ error: 'endpoint_url is required' });
    const adapter = await getAdapter();
    const encrypted = auth_token ? encryptToken(auth_token) : '';
    const existing = await adapter.findOne('siem_configs', { tenantId });
    const config = { tenantId, endpoint_url, format: format || 'json', auth_token: encrypted, active: active !== false, lastExportAt: null };
    if (existing) {
      await adapter.updateOne('siem_configs', { tenantId }, { $set: config });
    } else {
      await adapter.insertOne('siem_configs', { id: randomUUID(), ...config });
    }
    res.json({ success: true, format: config.format, active: config.active });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/admin/siem/config', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const config = await adapter.findOne('siem_configs', { tenantId });
    if (!config) return res.json({ configured: false });
    res.json({ configured: true, endpoint_url: config.endpoint_url, format: config.format, active: config.active, auth_token: maskToken(config.auth_token), lastExportAt: config.lastExportAt });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/admin/siem/test', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const config = await adapter.findOne('siem_configs', { tenantId });
    if (!config) return res.status(404).json({ error: 'No SIEM config found' });
    const format = config.format || 'json';
    const testEvent = { timestamp: new Date(), tenantId, userId: req.user.id, action: 'siem_test', resource: 'siem', ip: req.ip, result: 'success' };
    let payload;
    if (format === 'cef') {
      payload = `CEF:0|GuardianFlow|GuardianFlow|1.0|siem_test|SIEM Test Event|2|rt=${Date.now()} src=${req.ip} suser=${req.user.id} act=siem_test outcome=success`;
    } else {
      payload = JSON.stringify([testEvent]);
    }
    try {
      const rawToken = config.auth_token ? decryptToken(config.auth_token) : '';
      await fetch(config.endpoint_url, {
        method: 'POST',
        headers: { 'Content-Type': format === 'cef' ? 'text/plain' : 'application/json', 'Authorization': `Bearer ${rawToken}` },
        body: payload,
      });
    } catch { /* endpoint may not respond */ }
    res.json({ success: true, format, payload: payload.slice(0, 200) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/admin/siem/export', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const config = await adapter.findOne('siem_configs', { tenantId });
    const format = config?.format || 'json';
    const exported = await exportAuditLog(tenantId, null);
    const count = format === 'cef' ? (exported ? exported.split('\n').filter(Boolean).length : 0) : (JSON.parse(exported || '[]').length);
    res.json({ exported: count, format });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
