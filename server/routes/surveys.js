/**
 * @file server/routes/surveys.js
 * @description NPS/CSAT Surveys — Sprint 39.
 *
 * Routes
 * -------
 * POST /api/surveys/send               — generate token + survey record (auth required)
 * POST /api/surveys/respond/:token     — PUBLIC, no auth
 * GET  /api/surveys/analytics          — NPS/CSAT analytics (auth required)
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();
const SURVEYS_COL = 'survey_responses';

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

// ── POST /send ────────────────────────────────────────────────────────────────

router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { workOrderId, customerId, surveyType = 'nps' } = req.body;
    if (!customerId) return res.status(400).json({ error: 'customerId is required' });

    const VALID_TYPES = ['nps', 'csat'];
    if (!VALID_TYPES.includes(surveyType)) {
      return res.status(400).json({ error: 'surveyType must be nps or csat' });
    }

    const tenantId = await resolveTenantId(req.user.id);
    const token    = randomUUID();
    const now      = new Date().toISOString();

    const survey = {
      id:          randomUUID(),
      tenantId,
      surveyType,
      workOrderId: workOrderId || null,
      customerId,
      score:       null,
      comment:     null,
      token,
      tokenUsed:   false,
      respondedAt: null,
      createdAt:   now,
    };

    const adapter = await getAdapter();
    await adapter.insertOne(SURVEYS_COL, survey);

    res.status(201).json({
      token,
      surveyUrl: `/survey/${token}`,
      id:        survey.id,
    });
  } catch (err) {
    logger.error('Surveys: send error', { error: err.message });
    res.status(500).json({ error: 'Failed to send survey' });
  }
});

// ── POST /respond/:token ──────────────────────────────────────────────────────
// PUBLIC — no authenticateToken middleware

router.post('/respond/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { score, comment } = req.body;

    if (score === undefined || score === null) return res.status(400).json({ error: 'score is required' });

    const adapter = await getAdapter();
    const survey  = await adapter.findOne(SURVEYS_COL, { token });
    if (!survey)           return res.status(404).json({ error: 'Survey not found' });
    if (survey.tokenUsed)  return res.status(409).json({ error: 'Survey already completed' });

    await adapter.updateOne(SURVEYS_COL, { token }, {
      $set: {
        score:       Number(score),
        comment:     comment || null,
        tokenUsed:   true,
        respondedAt: new Date().toISOString(),
      },
    });

    res.json({ message: 'Thank you for your feedback!' });
  } catch (err) {
    logger.error('Surveys: respond error', { error: err.message });
    res.status(500).json({ error: 'Failed to submit response' });
  }
});

// ── GET /analytics ────────────────────────────────────────────────────────────

router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();

    const responses = await adapter.findMany(
      SURVEYS_COL,
      { tenantId, tokenUsed: true },
      { limit: 5000 },
    );

    const npsResponses  = responses.filter(r => r.surveyType === 'nps'  && r.score !== null);
    const csatResponses = responses.filter(r => r.surveyType === 'csat' && r.score !== null);

    // NPS: promoters = 9-10, detractors = 0-6
    const promoters  = npsResponses.filter(r => r.score >= 9).length;
    const detractors = npsResponses.filter(r => r.score <= 6).length;
    const npsScore   = npsResponses.length > 0
      ? Math.round(((promoters - detractors) / npsResponses.length) * 100)
      : null;

    // CSAT: average score (typically 1-5)
    const csatAvg = csatResponses.length > 0
      ? Math.round((csatResponses.reduce((s, r) => s + r.score, 0) / csatResponses.length) * 100) / 100
      : null;

    // Response rate: responded / total sent
    const totalSent       = await adapter.findMany(SURVEYS_COL, { tenantId }, { limit: 10000 });
    const responseRate    = totalSent.length > 0
      ? Math.round((responses.length / totalSent.length) * 100)
      : 0;

    // Weekly trend (last 8 weeks)
    const weeklyTrend = buildWeeklyTrend(responses, 8);

    res.json({ npsScore, csat: csatAvg, responseRate, weeklyTrend });
  } catch (err) {
    logger.error('Surveys: analytics error', { error: err.message });
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

function buildWeeklyTrend(responses, weeks) {
  const trend = [];
  const now   = new Date();

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (i + 1) * 7);
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - i * 7);

    const weekLabel = weekStart.toISOString().slice(0, 10);
    const inWindow  = responses.filter(r => {
      const d = new Date(r.respondedAt);
      return d >= weekStart && d < weekEnd;
    });

    const npsR  = inWindow.filter(r => r.surveyType === 'nps');
    const csatR = inWindow.filter(r => r.surveyType === 'csat');

    const promoters  = npsR.filter(r => r.score >= 9).length;
    const detractors = npsR.filter(r => r.score <= 6).length;
    const nps = npsR.length > 0
      ? Math.round(((promoters - detractors) / npsR.length) * 100)
      : null;
    const csat = csatR.length > 0
      ? Math.round((csatR.reduce((s, r) => s + r.score, 0) / csatR.length) * 100) / 100
      : null;

    trend.push({ week: weekLabel, nps, csat, responses: inWindow.length });
  }

  return trend;
}

export default router;
