/**
 * Shifts Routes
 * GET/POST   /api/shifts
 * PUT/DELETE /api/shifts/:id
 * GET        /api/shifts/technician/:technicianId?week=
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const { technician_id, date } = req.query;
    const filter = { tenant_id: req.user.tenantId };
    if (technician_id) filter.technician_id = technician_id;
    if (date) filter.date = date;
    const shifts = await adapter.findMany('technician_shifts', filter);
    res.json({ shifts, total: shifts.length });
  } catch (err) {
    logger.error('Shifts: list error', { error: err.message });
    res.status(500).json({ error: 'Failed to list shifts' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { technician_id, date, start_time, end_time, shift_type, is_available, notes } = req.body;
    if (!technician_id || !date) return res.status(400).json({ error: 'technician_id and date are required' });
    const adapter = await getAdapter();
    const shift = {
      id: randomUUID(), tenant_id: req.user.tenantId, technician_id, date,
      start_time: start_time || null, end_time: end_time || null,
      shift_type: shift_type || 'regular', is_available: is_available !== false,
      notes: notes || null, created_at: new Date(),
    };
    await adapter.insertOne('technician_shifts', shift);
    res.status(201).json({ shift });
  } catch (err) {
    logger.error('Shifts: create error', { error: err.message });
    res.status(500).json({ error: 'Failed to create shift' });
  }
});

router.get('/technician/:technicianId', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const filter = { tenant_id: req.user.tenantId, technician_id: req.params.technicianId };
    let shifts = await adapter.findMany('technician_shifts', filter);

    const { week } = req.query;
    if (week) {
      // week format: YYYY-WW — compute start/end of that ISO week
      const [yearStr, weekStr] = week.split('-W');
      const year = parseInt(yearStr, 10);
      const weekNum = parseInt(weekStr, 10);
      const jan4 = new Date(year, 0, 4);
      const startOfWeek1 = new Date(jan4);
      startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
      const weekStart = new Date(startOfWeek1);
      weekStart.setDate(startOfWeek1.getDate() + (weekNum - 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const startStr = weekStart.toISOString().slice(0, 10);
      const endStr = weekEnd.toISOString().slice(0, 10);
      shifts = shifts.filter(s => s.date >= startStr && s.date <= endStr);
    }

    res.json({ shifts, total: shifts.length });
  } catch (err) {
    logger.error('Shifts: list by technician error', { error: err.message });
    res.status(500).json({ error: 'Failed to list technician shifts' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const shift = await adapter.findOne('technician_shifts', { id: req.params.id, tenant_id: req.user.tenantId });
    if (!shift) return res.status(404).json({ error: 'Shift not found' });
    const allowed = ['date', 'start_time', 'end_time', 'shift_type', 'is_available', 'notes'];
    const updates = {};
    for (const key of allowed) { if (key in req.body) updates[key] = req.body[key]; }
    await adapter.updateOne('technician_shifts', { id: req.params.id, tenant_id: req.user.tenantId }, updates);
    res.json({ shift: { ...shift, ...updates } });
  } catch (err) {
    logger.error('Shifts: update error', { error: err.message });
    res.status(500).json({ error: 'Failed to update shift' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const shift = await adapter.findOne('technician_shifts', { id: req.params.id, tenant_id: req.user.tenantId });
    if (!shift) return res.status(404).json({ error: 'Shift not found' });
    await adapter.deleteOne('technician_shifts', { id: req.params.id, tenant_id: req.user.tenantId });
    res.json({ deleted: true });
  } catch (err) {
    logger.error('Shifts: delete error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete shift' });
  }
});

export default router;
