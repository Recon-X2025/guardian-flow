/**
 * @file server/routes/customer360.js
 * @description Customer 360 aggregate view API — Sprint 9.
 *
 * Routes
 * ------
 * GET /api/customer360/:customerId          — merged aggregate (customer info, WO history,
 *                                            invoices, CSAT, comms)
 * GET /api/customer360/:customerId/timeline — chronological event stream
 *
 * Security
 * --------
 * - All routes require authentication.
 * - tenantId is sourced from the authenticated user's profile.
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.use(authenticateToken);

// ── GET /api/customer360/:customerId ──────────────────────────────────────────

router.get('/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const tenantId = req.user.tenantId;

    const adapter = await getAdapter();

    // Fetch all data in parallel
    const [customer, workOrders, invoices, csatScores, commThreads] = await Promise.all([
      adapter.findOne('customers', { id: customerId, tenant_id: tenantId }),
      adapter.find('work_orders', { customer_id: customerId, tenant_id: tenantId }),
      adapter.find('invoices', { customer_id: customerId, tenant_id: tenantId }),
      adapter.find('customer_csat', { customer_id: customerId, tenant_id: tenantId }),
      adapter.find('communication_threads', { customer_id: customerId, tenant_id: tenantId }),
    ]);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const openInvoices = invoices.filter(inv => inv.status === 'open' || inv.status === 'overdue');
    const openWOs = workOrders.filter(wo => wo.status !== 'completed' && wo.status !== 'cancelled');
    const avgCsat =
      csatScores.length > 0
        ? csatScores.reduce((sum, s) => sum + (s.score || 0), 0) / csatScores.length
        : null;

    // Last interaction: latest across WOs, invoices, comms
    const allDates = [
      ...workOrders.map(wo => wo.updated_at || wo.created_at),
      ...invoices.map(inv => inv.updated_at || inv.created_at),
      ...commThreads.map(t => t.updated_at || t.created_at),
    ]
      .filter(Boolean)
      .sort()
      .reverse();

    const lastInteractionDate = allDates[0] || null;

    res.json({
      customer,
      stats: {
        totalWorkOrders: workOrders.length,
        openWorkOrders: openWOs.length,
        totalInvoices: invoices.length,
        openInvoices: openInvoices.length,
        csatScore: avgCsat !== null ? Math.round(avgCsat * 100) / 100 : null,
        csatResponses: csatScores.length,
        lastInteractionDate,
      },
      workOrders,
      invoices,
      csatScores,
      communicationThreads: commThreads,
    });
  } catch (err) {
    logger.error('customer360 get error', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve customer 360 view' });
  }
});

// ── GET /api/customer360/:customerId/timeline ─────────────────────────────────

router.get('/:customerId/timeline', async (req, res) => {
  try {
    const { customerId } = req.params;
    const tenantId = req.user.tenantId;
    const { limit = 50, offset = 0 } = req.query;

    const adapter = await getAdapter();

    const [customer, workOrders, invoices, commThreads, bookings] = await Promise.all([
      adapter.findOne('customers', { id: customerId, tenant_id: tenantId }),
      adapter.find('work_orders', { customer_id: customerId, tenant_id: tenantId }),
      adapter.find('invoices', { customer_id: customerId, tenant_id: tenantId }),
      adapter.find('communication_threads', { customer_id: customerId, tenant_id: tenantId }),
      adapter.find('customer_bookings', { customer_id: customerId, tenant_id: tenantId }),
    ]);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Build unified event stream
    const events = [
      ...workOrders.map(wo => ({
        id: wo.id,
        type: 'work_order',
        title: wo.title || `Work Order #${wo.id.slice(0, 8)}`,
        status: wo.status,
        date: wo.created_at,
        updatedAt: wo.updated_at,
        metadata: { serviceType: wo.service_type, technicianId: wo.technician_id },
      })),
      ...invoices.map(inv => ({
        id: inv.id,
        type: 'invoice',
        title: `Invoice #${inv.invoice_number || inv.id.slice(0, 8)}`,
        status: inv.status,
        date: inv.created_at,
        updatedAt: inv.updated_at,
        metadata: { amount: inv.total_amount, currency: inv.currency },
      })),
      ...commThreads.map(t => ({
        id: t.id,
        type: 'communication',
        title: t.subject || `${t.channel?.toUpperCase() || 'MSG'} conversation`,
        status: t.status,
        date: t.created_at,
        updatedAt: t.updated_at,
        metadata: { channel: t.channel, workOrderId: t.work_order_id },
      })),
      ...bookings.map(b => ({
        id: b.id,
        type: 'booking',
        title: `Booking: ${b.service_type}`,
        status: b.status,
        date: b.created_at,
        updatedAt: b.updated_at,
        metadata: { serviceType: b.service_type, bookingDate: b.date, startTime: b.start_time },
      })),
    ];

    // Sort chronologically descending
    events.sort((a, b) => new Date(b.date) - new Date(a.date));

    const parsedLimit = Math.min(Number(limit) || 50, 200);
    const parsedOffset = Number(offset) || 0;
    const page = events.slice(parsedOffset, parsedOffset + parsedLimit);

    res.json({
      customerId,
      total: events.length,
      limit: parsedLimit,
      offset: parsedOffset,
      events: page,
    });
  } catch (err) {
    logger.error('customer360 timeline error', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve customer timeline' });
  }
});

export default router;
