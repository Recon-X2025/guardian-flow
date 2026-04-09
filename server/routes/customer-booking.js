/**
 * @file server/routes/customer-booking.js
 * @description Customer self-scheduling API — Sprint 9.
 *
 * Routes
 * ------
 * GET  /api/customer-booking/availability  — available time slots (public)
 * POST /api/customer-booking/book          — create booking (public, tenant-scoped)
 * GET  /api/customer-booking/:bookingId    — get booking status (public)
 *
 * Security
 * --------
 * - Public endpoints: no auth required.
 * - tenantId is validated from request body or query param.
 * - All queries are scoped by tenant_id.
 */

import express from 'express';
import { randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();
const COLLECTION = 'customer_bookings';

const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many booking requests, please slow down' },
});

router.use(bookingLimiter);

const SERVICE_TYPES = ['installation', 'repair', 'maintenance', 'inspection', 'consultation'];

// Generate time slots for a given date (09:00–17:00, 1-hour slots)
function generateTimeSlots(date) {
  const slots = [];
  for (let hour = 9; hour < 17; hour++) {
    slots.push({
      id: randomUUID(),
      date,
      startTime: `${String(hour).padStart(2, '0')}:00`,
      endTime: `${String(hour + 1).padStart(2, '0')}:00`,
      available: true,
    });
  }
  return slots;
}

// ── GET /api/customer-booking/availability ────────────────────────────────────

router.get('/availability', async (req, res) => {
  try {
    const { serviceType, date, tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }
    if (!serviceType) {
      return res.status(400).json({ error: 'serviceType is required' });
    }
    if (!SERVICE_TYPES.includes(serviceType)) {
      return res.status(400).json({
        error: `serviceType must be one of: ${SERVICE_TYPES.join(', ')}`,
      });
    }

    const targetDate = date || new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
    }

    const adapter = await getAdapter();

    // Find already-booked slots for this date and tenant
    const existingBookings = await adapter.find(COLLECTION, {
      tenant_id: tenantId,
      date: targetDate,
      status: { $in: ['confirmed', 'pending'] },
    });

    const bookedTimes = new Set(existingBookings.map(b => b.start_time));
    const slots = generateTimeSlots(targetDate).map(slot => ({
      ...slot,
      available: !bookedTimes.has(slot.startTime),
    }));

    res.json({ date: targetDate, serviceType, slots });
  } catch (err) {
    logger.error('customer-booking availability error', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve availability' });
  }
});

// ── POST /api/customer-booking/book ──────────────────────────────────────────

router.post('/book', async (req, res) => {
  try {
    const {
      tenantId,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      serviceType,
      date,
      startTime,
      notes,
    } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }
    if (!serviceType || !date || !startTime) {
      return res.status(400).json({ error: 'serviceType, date, and startTime are required' });
    }
    if (!customerName || !customerEmail) {
      return res.status(400).json({ error: 'customerName and customerEmail are required' });
    }
    if (!SERVICE_TYPES.includes(serviceType)) {
      return res.status(400).json({
        error: `serviceType must be one of: ${SERVICE_TYPES.join(', ')}`,
      });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
    }
    if (!/^\d{2}:\d{2}$/.test(startTime)) {
      return res.status(400).json({ error: 'startTime must be in HH:MM format' });
    }

    const adapter = await getAdapter();

    // Check slot is still available
    const conflict = await adapter.findOne(COLLECTION, {
      tenant_id: tenantId,
      date,
      start_time: startTime,
      status: { $in: ['confirmed', 'pending'] },
    });

    if (conflict) {
      return res.status(409).json({ error: 'This time slot is no longer available' });
    }

    const [startHour] = startTime.split(':').map(Number);
    const endHour = startHour + 1;
    const endTime = `${String(endHour).padStart(2, '0')}:00`;

    const booking = {
      id: randomUUID(),
      tenant_id: tenantId,
      customer_id: customerId || null,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone || null,
      service_type: serviceType,
      date,
      start_time: startTime,
      end_time: endTime,
      notes: notes || null,
      status: 'confirmed',
      booking_reference: `BK-${Date.now().toString(36).toUpperCase()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await adapter.insertOne(COLLECTION, booking);

    logger.info('customer booking created', {
      bookingId: booking.id,
      tenantId,
      serviceType,
      date,
    });

    res.status(201).json({
      bookingId: booking.id,
      bookingReference: booking.booking_reference,
      status: booking.status,
      date: booking.date,
      startTime: booking.start_time,
      endTime: booking.end_time,
      serviceType: booking.service_type,
      message: 'Booking confirmed successfully',
    });
  } catch (err) {
    logger.error('customer-booking book error', { error: err.message });
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// ── GET /api/customer-booking/:bookingId ──────────────────────────────────────

router.get('/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId query param is required' });
    }

    const adapter = await getAdapter();
    const booking = await adapter.findOne(COLLECTION, {
      id: bookingId,
      tenant_id: tenantId,
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({
      bookingId: booking.id,
      bookingReference: booking.booking_reference,
      status: booking.status,
      customerName: booking.customer_name,
      customerEmail: booking.customer_email,
      serviceType: booking.service_type,
      date: booking.date,
      startTime: booking.start_time,
      endTime: booking.end_time,
      notes: booking.notes,
      createdAt: booking.created_at,
    });
  } catch (err) {
    logger.error('customer-booking get error', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve booking' });
  }
});

export default router;
