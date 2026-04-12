/**
 * @file server/routes/work-orders-multiday.js
 * @description Multi-day Work Order schedule endpoints — Sprint 35.
 *
 * Routes
 * ------
 * PUT /api/work-orders/:id/daily-schedule  — set daily schedule array
 * GET /api/work-orders/:id/daily-schedule  — get daily schedule
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();
const WO_COL = 'work_orders';

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

// ── PUT /api/work-orders/:id/daily-schedule ───────────────────────────────────

router.put('/:id/daily-schedule', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const wo       = await adapter.findOne(WO_COL, { id: req.params.id, tenant_id: tenantId });
    if (!wo) return res.status(404).json({ error: 'Work order not found' });

    const { schedule } = req.body;
    if (!Array.isArray(schedule) || schedule.length === 0) {
      return res.status(400).json({ error: 'schedule must be a non-empty array' });
    }

    // Validate each entry
    for (const entry of schedule) {
      if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
        return res.status(400).json({ error: `Invalid or missing date in entry: ${JSON.stringify(entry)}` });
      }
      if (typeof entry.planned_hours !== 'number' || entry.planned_hours <= 0) {
        return res.status(400).json({ error: `planned_hours must be a positive number in entry for ${entry.date}` });
      }
    }

    // Validate date range if planned_start_date and planned_end_date are set
    if (wo.planned_start_date && wo.planned_end_date) {
      const rangeStart = wo.planned_start_date;
      const rangeEnd   = wo.planned_end_date;
      for (const entry of schedule) {
        if (entry.date < rangeStart || entry.date > rangeEnd) {
          return res.status(400).json({
            error: `Date ${entry.date} is outside planned range ${rangeStart} – ${rangeEnd}`,
          });
        }
      }
    }

    // Merge: preserve completed status for existing entries, add new ones
    const existingSchedule = Array.isArray(wo.daily_schedule) ? wo.daily_schedule : [];
    const existingMap = new Map(existingSchedule.map(e => [e.date, e]));

    const merged = schedule.map(entry => ({
      date:          entry.date,
      technician_id: entry.technician_id || null,
      planned_hours: entry.planned_hours,
      completed:     existingMap.get(entry.date)?.completed ?? false,
    }));

    const isMultiDay = merged.length > 1;
    const updates = {
      daily_schedule:    merged,
      multi_day:         isMultiDay,
      planned_start_date: wo.planned_start_date || merged[0].date,
      planned_end_date:   wo.planned_end_date   || merged[merged.length - 1].date,
      updated_at:        new Date().toISOString(),
    };

    await adapter.updateOne(WO_COL, { id: req.params.id, tenant_id: tenantId }, updates);

    logger.info('Multi-day: schedule saved', { workOrderId: req.params.id, days: merged.length });
    res.json({ daily_schedule: merged, multi_day: isMultiDay });
  } catch (error) {
    logger.error('Multi-day: PUT schedule error', { error: error.message });
    res.status(500).json({ error: 'Failed to save daily schedule' });
  }
});

// ── GET /api/work-orders/:id/daily-schedule ───────────────────────────────────

router.get('/:id/daily-schedule', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const wo       = await adapter.findOne(WO_COL, { id: req.params.id, tenant_id: tenantId });
    if (!wo) return res.status(404).json({ error: 'Work order not found' });

    const daily_schedule   = Array.isArray(wo.daily_schedule) ? wo.daily_schedule : [];
    const totalPlanned     = daily_schedule.reduce((s, e) => s + (e.planned_hours || 0), 0);
    const completedEntries = daily_schedule.filter(e => e.completed).length;

    res.json({
      workOrderId:        wo.id,
      multi_day:          wo.multi_day || false,
      planned_start_date: wo.planned_start_date || null,
      planned_end_date:   wo.planned_end_date   || null,
      daily_schedule,
      totalPlannedHours:  totalPlanned,
      completedDays:      completedEntries,
      totalDays:          daily_schedule.length,
    });
  } catch (error) {
    logger.error('Multi-day: GET schedule error', { error: error.message });
    res.status(500).json({ error: 'Failed to get daily schedule' });
  }
});

export default router;
