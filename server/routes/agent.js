/**
 * @file server/routes/agent.js
 * @description Agentic AI API — autonomous goal-driven agents with tool calling.
 *
 * Routes
 * ──────
 *  POST /api/agent/run         — launch an agent to achieve a goal
 *  GET  /api/agent/runs        — list agent runs for tenant
 *  GET  /api/agent/runs/:id    — get single agent run with full trace
 *  GET  /api/agent/tools       — list available tools + their schemas
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import { runAgent, TOOL_DEFINITIONS } from '../services/ai/agent.js';
import logger from '../utils/logger.js';

const router = express.Router();

const agentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // Agent runs are expensive — 20/min per user
  keyGenerator: (req) => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many agent requests — maximum 20 per minute' },
});

router.use(authenticateToken);

function tenantId(req) {
  return req.user?.tenantId ?? req.user?.tenant_id ?? req.user?.id;
}

// ── POST /api/agent/run ───────────────────────────────────────────────────────

router.post('/run', agentLimiter, async (req, res) => {
  try {
    const tid = tenantId(req);
    const { goal, payload, dex_context_id } = req.body;
    if (!goal || typeof goal !== 'string' || goal.trim().length < 5) {
      return res.status(400).json({ error: 'goal must be a string with at least 5 characters' });
    }

    logger.info('agent: run requested', { tenantId: tid, goal: goal.slice(0, 80) });

    const agentRun = await runAgent({
      tenantId: tid,
      goal: goal.trim(),
      payload: payload ?? {},
      dexContextId: dex_context_id ?? null,
      actorId: req.user.id,
    });

    res.status(201).json(agentRun);
  } catch (err) {
    logger.error('agent: run error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/agent/runs ───────────────────────────────────────────────────────

router.get('/runs', async (req, res) => {
  try {
    const tid = tenantId(req);
    const adapter = await getAdapter();
    const { limit = 20, offset = 0, status } = req.query;
    const filter = { tenant_id: tid };
    if (status) filter.status = status;
    const runs = await adapter.findMany('agent_runs', filter, {
      limit: parseInt(limit),
      skip: parseInt(offset),
      sort: { started_at: -1 },
    });
    // Return summary (omit trace for list view)
    const summary = runs.map(r => ({
      id: r.id, goal: r.goal, status: r.status,
      turns_used: r.turns_used, started_at: r.started_at, finished_at: r.finished_at,
    }));
    res.json({ runs: summary, total: runs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/agent/runs/:id ───────────────────────────────────────────────────

router.get('/runs/:id', async (req, res) => {
  try {
    const tid = tenantId(req);
    const adapter = await getAdapter();
    const run = await adapter.findOne('agent_runs', { id: req.params.id, tenant_id: tid });
    if (!run) return res.status(404).json({ error: 'Agent run not found' });
    res.json(run);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/agent/tools ──────────────────────────────────────────────────────

router.get('/tools', (req, res) => {
  res.json({
    tools: TOOL_DEFINITIONS.map(t => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    })),
  });
});

export default router;
