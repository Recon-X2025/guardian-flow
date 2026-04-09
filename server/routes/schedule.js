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

export default router;
