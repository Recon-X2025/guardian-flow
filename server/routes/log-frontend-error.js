import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

const ALLOWED_SEVERITIES = new Set(['debug', 'info', 'warning', 'error', 'critical']);

router.post('/', async (req, res) => {
  const {
    error_message,
    error_stack,
    component_name,
    browser_info = {},
    url,
    severity = 'error',
  } = req.body;

  if (!error_message) {
    return res.status(400).json({ error: 'error_message is required' });
  }

  // Validate severity against allowlist
  const safeSeverity = ALLOWED_SEVERITIES.has(severity) ? severity : 'error';

  // Sanitize browser_info: accept only known string/number scalar fields
  const safeBrowserInfo = {};
  const ALLOWED_BROWSER_FIELDS = ['userAgent', 'platform', 'language', 'vendor', 'cookieEnabled', 'onLine', 'hardwareConcurrency'];
  for (const field of ALLOWED_BROWSER_FIELDS) {
    if (browser_info[field] !== undefined) {
      const val = browser_info[field];
      if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        safeBrowserInfo[field] = typeof val === 'string' ? val.slice(0, 512) : val;
      }
    }
  }

  const id = randomUUID();

  (async () => {
    try {
      const adapter = await getAdapter();
      await adapter.insertOne('frontend_errors', {
        id,
        error_message: String(error_message).slice(0, 2000),
        error_stack: error_stack ? String(error_stack).slice(0, 5000) : null,
        component_name: component_name ? String(component_name).slice(0, 255) : null,
        user_id: req.user?.id || null,
        tenant_id: req.user?.tenantId || null,
        browser_info: safeBrowserInfo,
        url: url ? String(url).slice(0, 2048) : null,
        severity: safeSeverity,
        created_at: new Date(),
      });
    } catch (err) {
      logger.error('frontend_errors insert failed', err);
    }
  })();

  return res.status(200).json({ logged: true });
});

export default router;
