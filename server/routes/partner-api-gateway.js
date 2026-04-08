import express from 'express';
import { randomUUID, createHash } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { findOne, findMany, insertOne } from '../db/query.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// POST /register — admin only
router.post('/register', authenticateToken, async (req, res) => {
  try {
    if (!req.user?.user_roles?.includes('admin')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { company_name, partner_type, contact_email, api_quota_daily = 1000 } = req.body;

    if (!company_name || !partner_type || !contact_email) {
      return res.status(400).json({ error: 'company_name, partner_type, and contact_email are required' });
    }

    const api_key = randomUUID();
    const api_key_hash = createHash('sha256').update(api_key).digest('hex');
    const partner_id = randomUUID();

    await insertOne('partners', {
      id: partner_id,
      company_name,
      partner_type,
      contact_email,
      api_key_hash,
      api_quota_daily,
      status: 'active',
      created_at: new Date().toISOString(),
    });

    return res.status(201).json({
      message: 'Partner registered successfully',
      partner_id,
      api_key,
    });
  } catch (err) {
    logger.error('POST /partner-api-gateway/register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /authenticate — no auth required (this IS the auth endpoint for partners)
router.post('/authenticate', async (req, res) => {
  try {
    const { api_key } = req.body;

    if (!api_key) {
      return res.status(400).json({ error: 'api_key is required' });
    }

    const api_key_hash = createHash('sha256').update(api_key).digest('hex');
    const partner = await findOne('partners', { api_key_hash, status: 'active' });

    if (!partner) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const adapter = getAdapter();
    const usageCount = await adapter.countDocuments('partner_api_usage', {
      partner_id: partner.id,
      date: today,
    });

    const quota_remaining = partner.api_quota_daily - usageCount;

    if (quota_remaining <= 0) {
      return res.status(429).json({ error: 'Daily quota exceeded' });
    }

    return res.status(200).json({
      authenticated: true,
      partner_id: partner.id,
      partner_type: partner.partner_type,
      quota_remaining,
    });
  } catch (err) {
    logger.error('POST /partner-api-gateway/authenticate error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /partners — admin only
router.get('/partners', authenticateToken, async (req, res) => {
  try {
    if (!req.user?.user_roles?.includes('admin')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const partners = await findMany('partners', {}, { sort: { created_at: -1 }, limit: 100 });

    return res.status(200).json({ partners });
  } catch (err) {
    logger.error('GET /partner-api-gateway/partners error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /usage — internal usage recording (no auth, fire-and-forget)
router.post('/usage', async (req, res) => {
  try {
    const { partner_id, endpoint, method, status_code, response_time_ms } = req.body;
    const today = new Date().toISOString().slice(0, 10);

    insertOne('partner_api_usage', {
      id: randomUUID(),
      partner_id,
      endpoint,
      method,
      status_code,
      response_time_ms,
      date: today,
      created_at: new Date().toISOString(),
    }).catch((err) => logger.error('partner_api_usage insert error:', err));

    return res.status(200).json({ logged: true });
  } catch (err) {
    logger.error('POST /partner-api-gateway/usage error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
