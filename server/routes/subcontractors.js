/**
 * Subcontractors Routes
 * GET/POST   /api/subcontractors
 * PUT/DELETE /api/subcontractors/:id
 * GET/POST   /api/subcontractors/:id/assignments
 * GET        /api/subcontractors/:id/performance
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const subcontractors = await adapter.findMany('subcontractors', { tenant_id: req.user.tenantId });
    res.json({ subcontractors, total: subcontractors.length });
  } catch (err) {
    logger.error('Subcontractors: list error', { error: err.message });
    res.status(500).json({ error: 'Failed to list subcontractors' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { company_name, contact_name, email, phone, trade_types, hourly_rate, currency, certifications, status } = req.body;
    if (!company_name) return res.status(400).json({ error: 'company_name is required' });
    const adapter = await getAdapter();
    const sub = {
      id: randomUUID(), tenant_id: req.user.tenantId, company_name,
      contact_name: contact_name || null, email: email || null, phone: phone || null,
      trade_types: trade_types || [], hourly_rate: hourly_rate || 0, currency: currency || 'USD',
      certifications: certifications || [], status: status || 'active', created_at: new Date(),
    };
    await adapter.insertOne('subcontractors', sub);
    res.status(201).json({ subcontractor: sub });
  } catch (err) {
    logger.error('Subcontractors: create error', { error: err.message });
    res.status(500).json({ error: 'Failed to create subcontractor' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const sub = await adapter.findOne('subcontractors', { id: req.params.id, tenant_id: req.user.tenantId });
    if (!sub) return res.status(404).json({ error: 'Subcontractor not found' });
    const allowed = ['company_name', 'contact_name', 'email', 'phone', 'trade_types', 'hourly_rate', 'currency', 'certifications', 'status'];
    const updates = {};
    for (const key of allowed) { if (key in req.body) updates[key] = req.body[key]; }
    await adapter.updateOne('subcontractors', { id: req.params.id, tenant_id: req.user.tenantId }, updates);
    res.json({ subcontractor: { ...sub, ...updates } });
  } catch (err) {
    logger.error('Subcontractors: update error', { error: err.message });
    res.status(500).json({ error: 'Failed to update subcontractor' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const sub = await adapter.findOne('subcontractors', { id: req.params.id, tenant_id: req.user.tenantId });
    if (!sub) return res.status(404).json({ error: 'Subcontractor not found' });
    await adapter.deleteOne('subcontractors', { id: req.params.id, tenant_id: req.user.tenantId });
    res.json({ deleted: true });
  } catch (err) {
    logger.error('Subcontractors: delete error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete subcontractor' });
  }
});

router.get('/:id/assignments', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const assignments = await adapter.findMany('subcontractor_assignments', {
      subcontractor_id: req.params.id, tenant_id: req.user.tenantId,
    });
    res.json({ assignments, total: assignments.length });
  } catch (err) {
    logger.error('Subcontractors: list assignments error', { error: err.message });
    res.status(500).json({ error: 'Failed to list assignments' });
  }
});

router.post('/:id/assignments', async (req, res) => {
  try {
    const { work_order_id, assigned_date, expected_completion, status, labor_cost, notes } = req.body;
    const adapter = await getAdapter();
    const assignment = {
      id: randomUUID(), tenant_id: req.user.tenantId, subcontractor_id: req.params.id,
      work_order_id: work_order_id || null, assigned_date: assigned_date || new Date(),
      expected_completion: expected_completion || null, status: status || 'pending',
      labor_cost: labor_cost || 0, notes: notes || null, created_at: new Date(),
    };
    await adapter.insertOne('subcontractor_assignments', assignment);
    res.status(201).json({ assignment });
  } catch (err) {
    logger.error('Subcontractors: create assignment error', { error: err.message });
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

router.get('/:id/performance', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const assignments = await adapter.findMany('subcontractor_assignments', {
      subcontractor_id: req.params.id, tenant_id: req.user.tenantId,
    });
    const completed = assignments.filter(a => a.status === 'completed');
    const completion_days = completed
      .filter(a => a.assigned_date && a.expected_completion)
      .map(a => Math.abs(new Date(a.expected_completion) - new Date(a.assigned_date)) / (1000 * 60 * 60 * 24));
    const avg_completion_days = completion_days.length > 0
      ? completion_days.reduce((s, d) => s + d, 0) / completion_days.length : 0;
    const costs = assignments.filter(a => a.labor_cost).map(a => Number(a.labor_cost));
    const avg_cost = costs.length > 0 ? costs.reduce((s, c) => s + c, 0) / costs.length : 0;

    res.json({
      assignment_count: assignments.length,
      completed_count: completed.length,
      avg_completion_days: +avg_completion_days.toFixed(1),
      avg_cost: +avg_cost.toFixed(2),
    });
  } catch (err) {
    logger.error('Subcontractors: performance error', { error: err.message });
    res.status(500).json({ error: 'Failed to get subcontractor performance' });
  }
});

export default router;
