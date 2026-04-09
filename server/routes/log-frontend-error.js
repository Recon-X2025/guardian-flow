import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

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

  const id = randomUUID();

  (async () => {
    try {
      const adapter = await getAdapter();
      await adapter.insertOne('frontend_errors', {
        id,
        error_message: String(error_message).slice(0, 2000),
        error_stack: error_stack ? String(error_stack).slice(0, 5000) : null,
        component_name: component_name || null,
        user_id: req.user?.id || null,
        tenant_id: req.user?.tenantId || null,
        browser_info,
        url: url || null,
        severity,
        created_at: new Date(),
      });
    } catch (err) {
      logger.error('frontend_errors insert failed', err);
    }
  })();

  return res.status(200).json({ logged: true });
});

export default router;
