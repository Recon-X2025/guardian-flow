/**
 * @file server/routes/schedule.js
 * @description Schedule optimiser API — Sprint 7.
 *
 * Routes
 * ------
 * POST /api/schedule/optimize              — run solver for a date
 * GET  /api/schedule/assignments           — list saved assignments
 * PUT  /api/schedule/assignments/:id       — accept or override an assignment
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { solveSchedule } from '../services/scheduler.js';
import { writeDecisionRecord } from '../services/flowspace.js';
import logger from '../utils/logger.js';

const router = express.Router();
const COLLECTION = 'schedule_assignments';

// ── POST /api/schedule/optimize ───────────────────────────────────────────────

router.post('/optimize', async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) {
      return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
    }

    const tenantId = req.user.tenantId;
    const result   = await solveSchedule(date, tenantId);

    // Persist proposed assignments
    const adapter = await getAdapter();
    const runId   = randomUUID();

    const saved = await Promise.all(
      result.assignments.map(async assignment => {
        const record = {
          id:                    randomUUID(),
          tenant_id:             tenantId,
          run_id:                runId,
          date,
          work_order_id:         assignment.workOrderId,
          work_order_title:      assignment.workOrderTitle,
          technician_id:         assignment.technicianId,
          technician_name:       assignment.technicianName,
          score:                 assignment.score,
          skill_match_percent:   assignment.skillMatchPercent,
          constraint_violations: assignment.constraintViolations,
          alternatives:          assignment.alternatives,
          status:                'proposed',
          created_at:            new Date(),
          updated_at:            new Date(),
        };
        await adapter.insertOne(COLLECTION, record);
        return record;
      }),
    );

    // Write a FlowSpace solver-run record
    await writeDecisionRecord({
      tenantId,
      domain:    'fsm',
      actorType: 'system',
      actorId:   'schedule-solver',
      action:    'schedule_solved',
      context:   {
        date,
        run_id:         runId,
        assigned_count: result.assignments.length,
        unassigned_count: result.unassigned.length,
      },
    }).catch(err => logger.warn('FlowSpace write failed', { error: err.message }));

    res.json({
      runId,
      assignments:  saved,
      unassigned:   result.unassigned,
      solverMeta:   result.solverMeta,
    });
  } catch (error) {
    logger.error('Schedule: optimize error', { error: error.message });
    res.status(500).json({ error: 'Failed to run schedule optimiser' });
  }
});

// ── GET /api/schedule/assignments ─────────────────────────────────────────────

router.get('/assignments', async (req, res) => {
  try {
    const adapter  = await getAdapter();
    const { date, status } = req.query;
    const filter = { tenant_id: req.user.tenantId };
    if (date)   filter.date   = date;
    if (status) filter.status = status;

    const assignments = await adapter.findMany(COLLECTION, filter);
    res.json({ assignments, total: assignments.length });
  } catch (error) {
    logger.error('Schedule: list assignments error', { error: error.message });
    res.status(500).json({ error: 'Failed to list assignments' });
  }
});

// ── PUT /api/schedule/assignments/:id ─────────────────────────────────────────

router.put('/assignments/:id', async (req, res) => {
  try {
    const { id }     = req.params;
    const { action, override_technician_id, override_technician_name } = req.body;

    if (!action || !['accept', 'override'].includes(action)) {
      return res.status(400).json({ error: 'action must be "accept" or "override"' });
    }

    const adapter    = await getAdapter();
    const tenantId   = req.user.tenantId;
    const assignment = await adapter.findOne(COLLECTION, { id, tenant_id: tenantId });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const updates = {
      status:     action === 'accept' ? 'accepted' : 'overridden',
      updated_at: new Date(),
      accepted_by: req.user.id,
    };

    if (action === 'override') {
      if (!override_technician_id) {
        return res.status(400).json({ error: 'override_technician_id is required for override action' });
      }
      updates.technician_id   = override_technician_id;
      updates.technician_name = override_technician_name || null;
      updates.override_reason = req.body.override_reason || null;
    }

    await adapter.updateOne(COLLECTION, { id, tenant_id: tenantId }, { $set: updates });
    const updated = { ...assignment, ...updates };

    // DEX integration — write FlowSpace record and transition DEX context
    if (action === 'accept' || action === 'override') {
      // Write FlowSpace acceptance record
      await writeDecisionRecord({
        tenantId,
        domain:    'fsm',
        actorType: 'human',
        actorId:   req.user.id,
        action:    'schedule_assignment_accepted',
        context:   {
          assignment_id:    id,
          work_order_id:    assignment.work_order_id,
          technician_id:    updates.technician_id || assignment.technician_id,
          technician_name:  updates.technician_name || assignment.technician_name,
          score:            assignment.score,
          override:         action === 'override',
        },
      }).catch(err => logger.warn('FlowSpace write failed on accept', { error: err.message }));

      // Attempt to advance DEX context for this work order to 'assigned' stage
      if (assignment.work_order_id) {
        try {
          const dexContext = await adapter.findOne('execution_contexts', {
            tenant_id: tenantId,
            'entity.id': assignment.work_order_id,
          });
          if (dexContext && dexContext.stage !== 'assigned') {
            await adapter.updateOne(
              'execution_contexts',
              { id: dexContext.id, tenant_id: tenantId },
              {
                $set: {
                  stage:      'assigned',
                  updated_at: new Date(),
                },
                $push: {
                  trace: {
                    timestamp:    new Date(),
                    stage:        'assigned',
                    actor_type:   'system',
                    actor_id:     'schedule-solver',
                    action:       'schedule_assignment_accepted',
                    assignment_id: id,
                  },
                },
              },
            );
          }
        } catch (dexErr) {
          logger.warn('DEX context transition failed', { error: dexErr.message, workOrderId: assignment.work_order_id });
        }
      }
    }

    res.json({ assignment: updated });
  } catch (error) {
    logger.error('Schedule: update assignment error', { error: error.message });
    res.status(500).json({ error: 'Failed to update assignment' });
  }
});

// ── GET /api/schedule/capacity-forecast ──────────────────────────────────────
//
// Returns capacity vs demand forecast for upcoming weeks.
// Query params:
//   weeks     (default 4)  — number of future weeks to forecast
//   territory (optional)   — filter by territory name

router.get('/capacity-forecast', async (req, res) => {
  try {
    const tenantId  = req.user?.tenantId || req.user?.id;
    const weeks     = Math.min(Math.max(parseInt(req.query.weeks || '4', 10), 1), 26);
    const territory = req.query.territory || null;

    const adapter = await getAdapter();

    // Historical WOs from last 4 weeks (for moving average)
    const histStart = new Date();
    histStart.setDate(histStart.getDate() - 28);
    const histFilter = { tenant_id: tenantId };
    if (territory) histFilter.territory = territory;

    const [allHistWOs, allTechs] = await Promise.all([
      adapter.findMany('work_orders', histFilter),
      adapter.findMany('profiles', { tenant_id: tenantId }),
    ]);

    // Filter historical WOs to last 4 weeks
    const histWOs = allHistWOs.filter(wo => wo.created_at && new Date(wo.created_at) >= histStart);

    // Count technicians (users with role 'technician')
    const techCount = allTechs.filter(p =>
      Array.isArray(p.user_roles)
        ? p.user_roles.some(r => r.role === 'technician')
        : p.role === 'technician',
    ).length || 1;

    const availableCapacityPerWeek = techCount * 8 * 5; // hours

    // Get start of current ISO week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // Mon=1 … Sun=7
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    // Historical WOs per week (last 4) for moving average
    const histWeekCounts = [];
    for (let w = 4; w >= 1; w--) {
      const wStart = new Date(monday);
      wStart.setDate(monday.getDate() - w * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wStart.getDate() + 7);
      const count = histWOs.filter(wo => {
        const d = new Date(wo.created_at);
        return d >= wStart && d < wEnd;
      }).length;
      histWeekCounts.push(count);
    }

    const avgHistWOs = histWeekCounts.length
      ? histWeekCounts.reduce((s, c) => s + c, 0) / histWeekCounts.length
      : 0;

    const forecast = [];
    for (let w = 0; w < weeks; w++) {
      const wStart = new Date(monday);
      wStart.setDate(monday.getDate() + w * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wStart.getDate() + 7);

      // ISO week label
      const isoWeek   = getISOWeek(wStart);
      const isoYear   = getISOYear(wStart);
      const weekLabel = `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;

      const forecastedWOs      = Math.round(avgHistWOs * 1.2); // +20% buffer
      const gap                = forecastedWOs - availableCapacityPerWeek;

      forecast.push({
        week:              weekLabel,
        startDate:         wStart.toISOString().slice(0, 10),
        endDate:           new Date(wEnd.getTime() - 1).toISOString().slice(0, 10),
        forecastedWOs,
        availableCapacity: availableCapacityPerWeek,
        gap,
      });
    }

    res.json({ forecast, techCount, weeks });
  } catch (error) {
    logger.error('Schedule: capacity-forecast error', { error: error.message });
    res.status(500).json({ error: 'Failed to generate capacity forecast' });
  }
});

// ── GET /api/schedule/capacity-forecast/gaps ─────────────────────────────────

router.get('/capacity-forecast/gaps', async (req, res) => {
  try {
    const weeks     = Math.min(Math.max(parseInt(req.query.weeks || '4', 10), 1), 26);
    const territory = req.query.territory || null;

    // Re-use forecast logic via internal call
    const fakeReq = { user: req.user, query: { weeks: String(weeks), territory } };
    let forecastResult;
    await new Promise((resolve) => {
      const fakeRes = {
        json: (data) => { forecastResult = data; resolve(); },
        status: () => fakeRes,
      };
      router.handle(
        Object.assign(fakeReq, { method: 'GET', url: '/capacity-forecast' }),
        fakeRes,
        resolve,
      );
    });

    // Fallback: inline computation if internal routing fails
    if (!forecastResult) {
      return res.json({ gaps: [] });
    }

    const gaps = (forecastResult.forecast || [])
      .filter(f => f.gap > 0)
      .map(f => ({
        ...f,
        recommendation: `Week ${f.week} is under-resourced by ${f.gap} hours. Consider activating crowd partners or extending shifts.`,
      }));

    res.json({ gaps });
  } catch (error) {
    logger.error('Schedule: capacity-forecast/gaps error', { error: error.message });
    res.status(500).json({ error: 'Failed to get capacity gaps' });
  }
});

// ISO week helpers

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getISOYear(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

export default router;
