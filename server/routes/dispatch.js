/**
 * @file server/routes/dispatch.js
 * @description FSM Dispatch Board — Sprint 2 (Gap Bridge).
 *   Provides the backend for the Gantt dispatch board, map view, ETA notifications,
 *   and SLA countdown data. Supplements the schedule.js route which handles AI-based
 *   optimisation; this route handles real-time human dispatcher operations.
 *
 * Routes
 * ------
 * GET    /api/dispatch/board                     — board data (WOs + technician slots for date range)
 * POST   /api/dispatch/assign                    — assign / reassign WO to technician + slot
 * POST   /api/dispatch/unassign                  — remove assignment
 * POST   /api/dispatch/bulk-assign               — bulk assign WOs for a day
 * GET    /api/dispatch/technicians/locations     — last-known GPS locations for map
 * POST   /api/dispatch/technicians/:id/location  — upsert technician GPS position
 * POST   /api/dispatch/notify-eta                — send ETA notification to customer
 * GET    /api/dispatch/sla-countdown             — SLA deadlines + elapsed % for open WOs
 * GET    /api/dispatch/audit                     — dispatch audit trail (all WOs)
 *
 * Security
 * --------
 * All routes require JWT (applied in server.js).
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

function tid(req) { return req.user?.tenantId ?? req.user?.tenant_id ?? 'default'; }
function uid(req) { return req.user?.userId || req.user?.id; }
function now() { return new Date().toISOString(); }

// ─── BOARD DATA ──────────────────────────────────────────────────────────────

/**
 * GET /api/dispatch/board?date=YYYY-MM-DD&days=7
 * Returns work orders (with assignment info) and technician shift windows
 * for the requested date window — the frontend maps this to Gantt rows.
 */
router.get('/board', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const { date = new Date().toISOString().slice(0, 10), days = 7, status, technicianId } = req.query;

    const from = new Date(date);
    const to = new Date(from);
    to.setDate(to.getDate() + Number(days));

    // Fetch work orders in window
    const woFilter = {
      tenant_id: tenantId,
      scheduled_start: { $gte: from.toISOString(), $lt: to.toISOString() },
    };
    if (status) woFilter.status = status;
    if (technicianId) woFilter.assigned_to = technicianId;

    const workOrders = await db.find('work_orders', woFilter, { sort: { scheduled_start: 1 } }) || [];

    // Fetch technician shift windows
    const shiftFilter = {
      tenant_id: tenantId,
      shift_date: { $gte: from.toISOString().slice(0, 10), $lte: to.toISOString().slice(0, 10) },
    };
    if (technicianId) shiftFilter.technician_id = technicianId;
    const shifts = await db.find('technician_shifts', shiftFilter, { sort: { shift_date: 1 } }) || [];

    // Fetch technician profiles for names/avatars
    const techIds = [...new Set([
      ...workOrders.map(w => w.assigned_to).filter(Boolean),
      ...shifts.map(s => s.technician_id),
    ])];
    let technicians = [];
    if (techIds.length > 0) {
      technicians = await db.find('technicians', { tenant_id: tenantId, _id: { $in: techIds } }) || [];
    }

    res.json({ workOrders, shifts, technicians, from: from.toISOString(), to: to.toISOString() });
  } catch (err) {
    logger.error(err, 'GET dispatch board');
    res.status(500).json({ error: 'Failed to load dispatch board' });
  }
});

// ─── ASSIGN / REASSIGN ───────────────────────────────────────────────────────

/**
 * POST /api/dispatch/assign
 * Body: { workOrderId, technicianId, scheduledStart, scheduledEnd, reason? }
 */
router.post('/assign', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const { workOrderId, technicianId, scheduledStart, scheduledEnd, reason = '' } = req.body;

    if (!workOrderId || !technicianId) {
      return res.status(400).json({ error: 'workOrderId and technicianId are required' });
    }

    const wo = await db.findOne('work_orders', { _id: workOrderId, tenant_id: tenantId });
    if (!wo) return res.status(404).json({ error: 'Work order not found' });

    const prevTech = wo.assigned_to;

    // Update work order
    const update = {
      assigned_to: technicianId,
      status: wo.status === 'open' ? 'assigned' : wo.status,
      updated_at: now(),
    };
    if (scheduledStart) update.scheduled_start = scheduledStart;
    if (scheduledEnd) update.scheduled_end = scheduledEnd;

    await db.updateOne('work_orders', { _id: workOrderId }, { ...wo, ...update });

    // Write dispatch audit entry
    const logEntry = {
      _id: randomUUID(),
      tenant_id: tenantId,
      work_order_id: workOrderId,
      action: prevTech ? 'reassigned' : 'assigned',
      from_technician_id: prevTech || null,
      to_technician_id: technicianId,
      actor_id: uid(req),
      reason,
      scheduled_start: scheduledStart || null,
      scheduled_end: scheduledEnd || null,
      created_at: now(),
    };
    await db.insert('dispatch_audit', logEntry);

    logger.info({ workOrderId, technicianId }, 'WO assigned via dispatch');
    res.json({ workOrder: { ...wo, ...update }, auditEntry: logEntry });
  } catch (err) {
    logger.error(err, 'POST dispatch assign');
    res.status(500).json({ error: 'Failed to assign work order' });
  }
});

/**
 * POST /api/dispatch/unassign
 * Body: { workOrderId, reason? }
 */
router.post('/unassign', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const { workOrderId, reason = '' } = req.body;

    if (!workOrderId) return res.status(400).json({ error: 'workOrderId required' });

    const wo = await db.findOne('work_orders', { _id: workOrderId, tenant_id: tenantId });
    if (!wo) return res.status(404).json({ error: 'Work order not found' });

    const prevTech = wo.assigned_to;
    await db.updateOne('work_orders', { _id: workOrderId }, {
      ...wo,
      assigned_to: null,
      status: 'open',
      updated_at: now(),
    });

    await db.insert('dispatch_audit', {
      _id: randomUUID(),
      tenant_id: tenantId,
      work_order_id: workOrderId,
      action: 'unassigned',
      from_technician_id: prevTech || null,
      to_technician_id: null,
      actor_id: uid(req),
      reason,
      created_at: now(),
    });

    res.json({ success: true, workOrderId, previousTechnician: prevTech });
  } catch (err) {
    logger.error(err, 'POST dispatch unassign');
    res.status(500).json({ error: 'Failed to unassign work order' });
  }
});

/**
 * POST /api/dispatch/bulk-assign
 * Body: { assignments: [{workOrderId, technicianId, scheduledStart, scheduledEnd}] }
 */
router.post('/bulk-assign', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const { assignments } = req.body;

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ error: 'assignments array required' });
    }

    const results = [];
    for (const a of assignments) {
      const wo = await db.findOne('work_orders', { _id: a.workOrderId, tenant_id: tenantId });
      if (!wo) { results.push({ workOrderId: a.workOrderId, error: 'not found' }); continue; }

      const prevTech = wo.assigned_to;
      const update = {
        ...wo,
        assigned_to: a.technicianId,
        status: wo.status === 'open' ? 'assigned' : wo.status,
        updated_at: now(),
      };
      if (a.scheduledStart) update.scheduled_start = a.scheduledStart;
      if (a.scheduledEnd) update.scheduled_end = a.scheduledEnd;

      await db.updateOne('work_orders', { _id: a.workOrderId }, update);
      await db.insert('dispatch_audit', {
        _id: randomUUID(),
        tenant_id: tenantId,
        work_order_id: a.workOrderId,
        action: prevTech ? 'reassigned' : 'assigned',
        from_technician_id: prevTech || null,
        to_technician_id: a.technicianId,
        actor_id: uid(req),
        reason: 'bulk_assign',
        created_at: now(),
      });
      results.push({ workOrderId: a.workOrderId, success: true });
    }

    res.json({ results, total: assignments.length, succeeded: results.filter(r => r.success).length });
  } catch (err) {
    logger.error(err, 'POST dispatch bulk-assign');
    res.status(500).json({ error: 'Failed to bulk assign' });
  }
});

// ─── TECHNICIAN LOCATIONS (MAP) ──────────────────────────────────────────────

/**
 * GET /api/dispatch/technicians/locations
 * Returns last-known GPS pin for each technician (for map rendering).
 */
router.get('/technicians/locations', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const locations = await db.find('technician_locations', { tenant_id: tenantId }, { sort: { updated_at: -1 } }) || [];
    res.json(locations);
  } catch (err) {
    logger.error(err, 'GET tech locations');
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

/**
 * POST /api/dispatch/technicians/:id/location
 * Body: { lat, lng, accuracy?, heading?, speed? }
 * Mobile app pushes GPS every N minutes; dispatcher map auto-refreshes.
 */
router.post('/technicians/:id/location', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const { lat, lng, accuracy, heading, speed, address } = req.body;

    if (lat == null || lng == null) return res.status(400).json({ error: 'lat and lng required' });

    const existing = await db.findOne('technician_locations', { tenant_id: tenantId, technician_id: req.params.id });
    const loc = {
      _id: existing?._id || randomUUID(),
      tenant_id: tenantId,
      technician_id: req.params.id,
      lat: Number(lat),
      lng: Number(lng),
      accuracy: accuracy != null ? Number(accuracy) : null,
      heading: heading != null ? Number(heading) : null,
      speed: speed != null ? Number(speed) : null,
      address: address || null,
      updated_at: now(),
    };

    if (existing) {
      await db.updateOne('technician_locations', { _id: existing._id }, loc);
    } else {
      await db.insert('technician_locations', { ...loc, created_at: now() });
    }

    // Also append to history for tracking/analytics
    await db.insert('technician_location_history', {
      _id: randomUUID(),
      tenant_id: tenantId,
      technician_id: req.params.id,
      lat: Number(lat),
      lng: Number(lng),
      recorded_at: now(),
    });

    res.json(loc);
  } catch (err) {
    logger.error(err, 'POST tech location');
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// ─── ETA NOTIFICATION ────────────────────────────────────────────────────────

/**
 * POST /api/dispatch/notify-eta
 * Body: { workOrderId, etaMinutes, channel? }  channel: sms|email|both
 * Logs the notification; actual send delegated to comms service stub.
 */
router.post('/notify-eta', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const { workOrderId, etaMinutes, channel = 'sms', customMessage } = req.body;

    if (!workOrderId || etaMinutes == null) {
      return res.status(400).json({ error: 'workOrderId and etaMinutes required' });
    }

    const wo = await db.findOne('work_orders', { _id: workOrderId, tenant_id: tenantId });
    if (!wo) return res.status(404).json({ error: 'Work order not found' });

    const etaTime = new Date(Date.now() + etaMinutes * 60000).toISOString();
    const message = customMessage || `Your technician is ${etaMinutes} minute(s) away (ETA ${etaTime.slice(11, 16)} UTC).`;

    const notification = {
      _id: randomUUID(),
      tenant_id: tenantId,
      work_order_id: workOrderId,
      customer_id: wo.customer_id || null,
      channel,
      message,
      eta_minutes: Number(etaMinutes),
      eta_time: etaTime,
      sent_by: uid(req),
      status: 'queued', // queued | sent | failed
      created_at: now(),
    };

    await db.insert('wo_notifications', notification);

    // Update WO with last ETA
    await db.updateOne('work_orders', { _id: workOrderId }, {
      ...wo,
      last_eta_minutes: Number(etaMinutes),
      last_eta_notified_at: now(),
      updated_at: now(),
    });

    logger.info({ workOrderId, etaMinutes, channel }, 'ETA notification queued');
    res.status(201).json({ notification, message: 'ETA notification queued for delivery' });
  } catch (err) {
    logger.error(err, 'POST notify-eta');
    res.status(500).json({ error: 'Failed to send ETA notification' });
  }
});

// ─── SLA COUNTDOWN ───────────────────────────────────────────────────────────

/**
 * GET /api/dispatch/sla-countdown?status=open,assigned
 * Returns SLA deadline, elapsed %, time remaining (ms) for each open WO.
 * Used to drive live countdown timers on the dispatch board.
 */
router.get('/sla-countdown', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const statuses = (req.query.status || 'open,assigned').split(',').map(s => s.trim());

    const wos = await db.find('work_orders', {
      tenant_id: tenantId,
      status: { $in: statuses },
      sla_deadline: { $exists: true },
    }, { sort: { sla_deadline: 1 } }) || [];

    const nowMs = Date.now();
    const result = wos.map(wo => {
      const deadlineMs = wo.sla_deadline ? new Date(wo.sla_deadline).getTime() : null;
      const createdMs = wo.created_at ? new Date(wo.created_at).getTime() : nowMs;
      const totalMs = deadlineMs ? deadlineMs - createdMs : null;
      const elapsedMs = nowMs - createdMs;
      const remainingMs = deadlineMs ? deadlineMs - nowMs : null;
      const elapsedPct = totalMs ? Math.min(100, Math.round((elapsedMs / totalMs) * 100)) : null;
      const breached = remainingMs != null && remainingMs < 0;

      return {
        workOrderId: wo._id,
        title: wo.title || wo._id,
        status: wo.status,
        priority: wo.priority,
        assignedTo: wo.assigned_to,
        slaDeadline: wo.sla_deadline,
        remainingMs,
        elapsedPct,
        breached,
        urgency: breached ? 'breached' : remainingMs != null && remainingMs < 3600000 ? 'critical' :
                 remainingMs != null && remainingMs < 7200000 ? 'warning' : 'normal',
      };
    });

    res.json({ items: result, total: result.length, breached: result.filter(r => r.breached).length });
  } catch (err) {
    logger.error(err, 'GET sla-countdown');
    res.status(500).json({ error: 'Failed to compute SLA countdown' });
  }
});

// ─── DISPATCH AUDIT ──────────────────────────────────────────────────────────

/**
 * GET /api/dispatch/audit?limit=50&workOrderId=X&technicianId=Y
 */
router.get('/audit', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const filter = { tenant_id: tenantId };
    if (req.query.workOrderId) filter.work_order_id = req.query.workOrderId;
    if (req.query.technicianId) filter.$or = [
      { from_technician_id: req.query.technicianId },
      { to_technician_id: req.query.technicianId },
    ];
    const limit = Math.min(Number(req.query.limit) || 50, 500);
    const entries = await db.find('dispatch_audit', filter, { sort: { created_at: -1 }, limit }) || [];
    res.json({ entries, total: entries.length });
  } catch (err) {
    logger.error(err, 'GET dispatch audit');
    res.status(500).json({ error: 'Failed to fetch dispatch audit' });
  }
});

export default router;
