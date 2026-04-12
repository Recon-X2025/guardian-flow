/**
 * Health Routes (no auth required)
 * GET /api/health-full/full
 */

import express from 'express';
import { getAdapter } from '../db/factory.js';

const router = express.Router();

router.get('/full', async (req, res) => {
  let dbStatus = 'connected';
  try { await getAdapter(); } catch { dbStatus = 'degraded'; }
  res.json({
    status: 'ok', version: '1.0.0', timestamp: new Date(),
    db: dbStatus, uptime_seconds: Math.floor(process.uptime()),
  });
});

export default router;
