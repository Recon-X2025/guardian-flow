/**
 * @file server/routes/work-orders.js
 * @description Field Service Management — Work Order depth module.
 *   Sprint 1 (Gap Bridge): Attachments, signatures, templates, checklists, parts.
 *   Sprint 9 (Gap Bridge): SLA engine integration, shift-aware scheduling.
 *
 * Routes
 * ------
 * POST   /api/work-orders/:id/attachments           — upload file/photo attachment (base64 or URL)
 * GET    /api/work-orders/:id/attachments           — list attachments for a WO
 * DELETE /api/work-orders/:id/attachments/:attId    — delete an attachment
 *
 * POST   /api/work-orders/:id/signature             — capture customer digital signature (base64 PNG)
 * GET    /api/work-orders/:id/signature             — retrieve stored signature
 *
 * GET    /api/wo-templates                          — list WO templates
 * POST   /api/wo-templates                          — create WO template
 * GET    /api/wo-templates/:id                      — get single template
 * PUT    /api/wo-templates/:id                      — update template
 * DELETE /api/wo-templates/:id                      — delete template
 * POST   /api/wo-templates/:id/apply                — apply template → create new WO
 *
 * GET    /api/work-orders/:id/steps                 — list checklist steps
 * POST   /api/work-orders/:id/steps                 — add step to WO
 * PUT    /api/work-orders/:id/steps/:stepId         — update step (status, notes, photo)
 * DELETE /api/work-orders/:id/steps/:stepId         — remove step
 * POST   /api/work-orders/:id/steps/reorder         — reorder steps
 *
 * GET    /api/work-orders/:id/parts                 — list parts/line-items on WO
 * POST   /api/work-orders/:id/parts                 — add part consumption record
 * PUT    /api/work-orders/:id/parts/:partId         — update qty / price
 * DELETE /api/work-orders/:id/parts/:partId         — remove line item
 *
 * GET    /api/work-orders/:id/dispatch-log          — dispatch audit trail
 * POST   /api/work-orders/:id/dispatch-log          — append dispatch log entry
 *
 * Security
 * --------
 * All routes require JWT (applied in server.js).
 * tenantId is always sourced from the authenticated user token.
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

// ─── helpers ────────────────────────────────────────────────────────────────

function tenantId(req) {
  return req.user?.tenantId ?? req.user?.tenant_id ?? 'default';
}

function now() {
  return new Date().toISOString();
}

// ─── ATTACHMENTS ─────────────────────────────────────────────────────────────

// POST /api/work-orders/:id/attachments
router.post('/:id/attachments', async (req, res) => {
  try {
    const db = getAdapter();
    const tid = tenantId(req);
    const { fileName, mimeType, sizeBytes, url, base64, category = 'general', notes = '' } = req.body;

    if (!fileName) return res.status(400).json({ error: 'fileName is required' });
    if (!url && !base64) return res.status(400).json({ error: 'url or base64 payload required' });

    const attachment = {
      _id: randomUUID(),
      tenant_id: tid,
      work_order_id: req.params.id,
      file_name: fileName,
      mime_type: mimeType || 'application/octet-stream',
      size_bytes: sizeBytes || 0,
      url: url || null,
      base64: base64 ? base64.substring(0, 500000) : null, // cap at ~375 kB decoded
      category,
      notes,
      uploaded_by: req.user?.userId || req.user?.id,
      created_at: now(),
    };

    await db.insert('wo_attachments', attachment);
    logger.info({ woId: req.params.id, attId: attachment._id }, 'WO attachment added');
    res.status(201).json(attachment);
  } catch (err) {
    logger.error(err, 'POST wo attachment');
    res.status(500).json({ error: 'Failed to save attachment' });
  }
});

// GET /api/work-orders/:id/attachments
router.get('/:id/attachments', async (req, res) => {
  try {
    const db = getAdapter();
    const rows = await db.find('wo_attachments', {
      tenant_id: tenantId(req),
      work_order_id: req.params.id,
    }, { sort: { created_at: 1 } });
    // Strip base64 from list view (only return URL + metadata)
    const safe = (rows || []).map(a => ({ ...a, base64: a.base64 ? '[stored]' : null }));
    res.json(safe);
  } catch (err) {
    logger.error(err, 'GET wo attachments');
    res.status(500).json({ error: 'Failed to fetch attachments' });
  }
});

// DELETE /api/work-orders/:id/attachments/:attId
router.delete('/:id/attachments/:attId', async (req, res) => {
  try {
    const db = getAdapter();
    await db.deleteOne('wo_attachments', {
      _id: req.params.attId,
      tenant_id: tenantId(req),
      work_order_id: req.params.id,
    });
    res.json({ success: true });
  } catch (err) {
    logger.error(err, 'DELETE wo attachment');
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
});

// ─── SIGNATURE ──────────────────────────────────────────────────────────────

// POST /api/work-orders/:id/signature
router.post('/:id/signature', async (req, res) => {
  try {
    const db = getAdapter();
    const tid = tenantId(req);
    const { signerName, signerRole = 'customer', base64Png, ipAddress } = req.body;

    if (!base64Png) return res.status(400).json({ error: 'base64Png is required' });

    const sig = {
      _id: randomUUID(),
      tenant_id: tid,
      work_order_id: req.params.id,
      signer_name: signerName || 'Unknown',
      signer_role: signerRole,
      base64_png: base64Png,
      ip_address: ipAddress || null,
      captured_by: req.user?.userId || req.user?.id,
      captured_at: now(),
    };

    // Upsert — one signature per WO per signer_role
    const existing = await db.findOne('wo_signatures', {
      tenant_id: tid,
      work_order_id: req.params.id,
      signer_role: signerRole,
    });
    if (existing) {
      await db.updateOne('wo_signatures', { _id: existing._id }, { ...sig, _id: existing._id });
      return res.json({ ...sig, _id: existing._id, updated: true });
    }

    await db.insert('wo_signatures', sig);
    logger.info({ woId: req.params.id, sigId: sig._id }, 'WO signature captured');
    res.status(201).json(sig);
  } catch (err) {
    logger.error(err, 'POST wo signature');
    res.status(500).json({ error: 'Failed to save signature' });
  }
});

// GET /api/work-orders/:id/signature
router.get('/:id/signature', async (req, res) => {
  try {
    const db = getAdapter();
    const sigs = await db.find('wo_signatures', {
      tenant_id: tenantId(req),
      work_order_id: req.params.id,
    }, { sort: { captured_at: -1 } });
    res.json(sigs || []);
  } catch (err) {
    logger.error(err, 'GET wo signature');
    res.status(500).json({ error: 'Failed to fetch signature' });
  }
});

// ─── TEMPLATES ──────────────────────────────────────────────────────────────

// GET /api/wo-templates
router.get('/templates', async (req, res) => {
  try {
    const db = getAdapter();
    const { category, q } = req.query;
    const filter = { tenant_id: tenantId(req) };
    if (category) filter.category = category;
    const rows = await db.find('wo_templates', filter, { sort: { name: 1 } });
    const list = (rows || []).filter(t =>
      !q || t.name?.toLowerCase().includes(q.toLowerCase()) ||
      t.description?.toLowerCase().includes(q.toLowerCase()),
    );
    res.json(list);
  } catch (err) {
    logger.error(err, 'GET wo templates');
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// POST /api/wo-templates
router.post('/templates', async (req, res) => {
  try {
    const db = getAdapter();
    const tid = tenantId(req);
    const { name, description, category, priority, estimatedHours, steps = [], defaultParts = [], tags = [] } = req.body;

    if (!name) return res.status(400).json({ error: 'name is required' });

    const template = {
      _id: randomUUID(),
      tenant_id: tid,
      name,
      description: description || '',
      category: category || 'general',
      priority: priority || 'medium',
      estimated_hours: estimatedHours || 0,
      steps: steps.map((s, i) => ({
        _id: randomUUID(),
        order: i + 1,
        title: s.title || `Step ${i + 1}`,
        description: s.description || '',
        required: s.required !== false,
        pass_fail: s.pass_fail !== false,
      })),
      default_parts: defaultParts.map(p => ({
        sku: p.sku || '',
        name: p.name || '',
        qty: p.qty || 1,
        unit_cost: p.unit_cost || 0,
      })),
      tags,
      created_by: req.user?.userId || req.user?.id,
      created_at: now(),
      updated_at: now(),
    };

    await db.insert('wo_templates', template);
    res.status(201).json(template);
  } catch (err) {
    logger.error(err, 'POST wo template');
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// GET /api/wo-templates/:id
router.get('/templates/:id', async (req, res) => {
  try {
    const db = getAdapter();
    const tmpl = await db.findOne('wo_templates', { _id: req.params.id, tenant_id: tenantId(req) });
    if (!tmpl) return res.status(404).json({ error: 'Template not found' });
    res.json(tmpl);
  } catch (err) {
    logger.error(err, 'GET wo template');
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// PUT /api/wo-templates/:id
router.put('/templates/:id', async (req, res) => {
  try {
    const db = getAdapter();
    const tid = tenantId(req);
    const existing = await db.findOne('wo_templates', { _id: req.params.id, tenant_id: tid });
    if (!existing) return res.status(404).json({ error: 'Template not found' });

    const update = { ...req.body, updated_at: now(), tenant_id: tid, _id: req.params.id };
    await db.updateOne('wo_templates', { _id: req.params.id }, update);
    res.json({ ...existing, ...update });
  } catch (err) {
    logger.error(err, 'PUT wo template');
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// DELETE /api/wo-templates/:id
router.delete('/templates/:id', async (req, res) => {
  try {
    const db = getAdapter();
    await db.deleteOne('wo_templates', { _id: req.params.id, tenant_id: tenantId(req) });
    res.json({ success: true });
  } catch (err) {
    logger.error(err, 'DELETE wo template');
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// POST /api/wo-templates/:id/apply  — create a new WO from this template
router.post('/templates/:id/apply', async (req, res) => {
  try {
    const db = getAdapter();
    const tid = tenantId(req);
    const tmpl = await db.findOne('wo_templates', { _id: req.params.id, tenant_id: tid });
    if (!tmpl) return res.status(404).json({ error: 'Template not found' });

    const { customerId, assetId, scheduledFor, assignedTo, overrides = {} } = req.body;

    const woId = randomUUID();
    const wo = {
      _id: woId,
      tenant_id: tid,
      template_id: tmpl._id,
      title: overrides.title || tmpl.name,
      description: overrides.description || tmpl.description,
      category: overrides.category || tmpl.category,
      priority: overrides.priority || tmpl.priority,
      estimated_hours: overrides.estimatedHours || tmpl.estimated_hours,
      customer_id: customerId || null,
      asset_id: assetId || null,
      scheduled_for: scheduledFor || null,
      assigned_to: assignedTo || null,
      status: 'open',
      source: 'template',
      created_by: req.user?.userId || req.user?.id,
      created_at: now(),
      updated_at: now(),
    };

    await db.insert('work_orders', wo);

    // Copy template steps to wo_steps
    if (tmpl.steps && tmpl.steps.length > 0) {
      const woSteps = tmpl.steps.map(s => ({
        _id: randomUUID(),
        tenant_id: tid,
        work_order_id: woId,
        order: s.order,
        title: s.title,
        description: s.description,
        required: s.required,
        pass_fail: s.pass_fail,
        status: 'pending',
        created_at: now(),
      }));
      for (const step of woSteps) await db.insert('wo_steps', step);
    }

    // Copy default parts
    if (tmpl.default_parts && tmpl.default_parts.length > 0) {
      const woParts = tmpl.default_parts.map(p => ({
        _id: randomUUID(),
        tenant_id: tid,
        work_order_id: woId,
        sku: p.sku,
        name: p.name,
        qty_planned: p.qty,
        qty_used: 0,
        unit_cost: p.unit_cost,
        status: 'planned',
        created_at: now(),
      }));
      for (const part of woParts) await db.insert('wo_parts', part);
    }

    logger.info({ woId, templateId: tmpl._id }, 'WO created from template');
    res.status(201).json({ workOrder: wo, stepsCreated: (tmpl.steps || []).length, partsCreated: (tmpl.default_parts || []).length });
  } catch (err) {
    logger.error(err, 'POST wo template apply');
    res.status(500).json({ error: 'Failed to create WO from template' });
  }
});

// ─── CHECKLIST STEPS ─────────────────────────────────────────────────────────

// GET /api/work-orders/:id/steps
router.get('/:id/steps', async (req, res) => {
  try {
    const db = getAdapter();
    const steps = await db.find('wo_steps', {
      tenant_id: tenantId(req),
      work_order_id: req.params.id,
    }, { sort: { order: 1 } });
    res.json(steps || []);
  } catch (err) {
    logger.error(err, 'GET wo steps');
    res.status(500).json({ error: 'Failed to fetch steps' });
  }
});

// POST /api/work-orders/:id/steps
router.post('/:id/steps', async (req, res) => {
  try {
    const db = getAdapter();
    const tid = tenantId(req);
    const { title, description = '', required = true, passFail = true, order } = req.body;

    if (!title) return res.status(400).json({ error: 'title is required' });

    // Auto-assign order if not provided
    let stepOrder = order;
    if (!stepOrder) {
      const existing = await db.find('wo_steps', { tenant_id: tid, work_order_id: req.params.id });
      stepOrder = (existing || []).length + 1;
    }

    const step = {
      _id: randomUUID(),
      tenant_id: tid,
      work_order_id: req.params.id,
      order: stepOrder,
      title,
      description,
      required,
      pass_fail: passFail,
      status: 'pending', // pending | pass | fail | na | skipped
      notes: '',
      photo_url: null,
      completed_by: null,
      completed_at: null,
      created_at: now(),
    };

    await db.insert('wo_steps', step);
    res.status(201).json(step);
  } catch (err) {
    logger.error(err, 'POST wo step');
    res.status(500).json({ error: 'Failed to add step' });
  }
});

// PUT /api/work-orders/:id/steps/:stepId
router.put('/:id/steps/:stepId', async (req, res) => {
  try {
    const db = getAdapter();
    const tid = tenantId(req);
    const step = await db.findOne('wo_steps', {
      _id: req.params.stepId,
      tenant_id: tid,
      work_order_id: req.params.id,
    });
    if (!step) return res.status(404).json({ error: 'Step not found' });

    const allowedStatuses = ['pending', 'pass', 'fail', 'na', 'skipped'];
    const newStatus = req.body.status || step.status;
    if (!allowedStatuses.includes(newStatus)) {
      return res.status(400).json({ error: `status must be one of: ${allowedStatuses.join(', ')}` });
    }

    const update = {
      ...step,
      ...req.body,
      status: newStatus,
      tenant_id: tid,
      work_order_id: req.params.id,
      _id: req.params.stepId,
      updated_at: now(),
    };

    // Stamp completion if transitioning from pending
    if (step.status === 'pending' && newStatus !== 'pending') {
      update.completed_by = req.user?.userId || req.user?.id;
      update.completed_at = now();
    }

    await db.updateOne('wo_steps', { _id: req.params.stepId }, update);
    res.json(update);
  } catch (err) {
    logger.error(err, 'PUT wo step');
    res.status(500).json({ error: 'Failed to update step' });
  }
});

// DELETE /api/work-orders/:id/steps/:stepId
router.delete('/:id/steps/:stepId', async (req, res) => {
  try {
    const db = getAdapter();
    await db.deleteOne('wo_steps', {
      _id: req.params.stepId,
      tenant_id: tenantId(req),
      work_order_id: req.params.id,
    });
    res.json({ success: true });
  } catch (err) {
    logger.error(err, 'DELETE wo step');
    res.status(500).json({ error: 'Failed to delete step' });
  }
});

// POST /api/work-orders/:id/steps/reorder  — body: [{id, order}]
router.post('/:id/steps/reorder', async (req, res) => {
  try {
    const db = getAdapter();
    const tid = tenantId(req);
    const { positions } = req.body; // [{id, order}]
    if (!Array.isArray(positions)) return res.status(400).json({ error: 'positions array required' });

    for (const pos of positions) {
      await db.updateOne('wo_steps', { _id: pos.id, tenant_id: tid, work_order_id: req.params.id }, { order: pos.order });
    }
    res.json({ success: true, reordered: positions.length });
  } catch (err) {
    logger.error(err, 'POST wo steps reorder');
    res.status(500).json({ error: 'Failed to reorder steps' });
  }
});

// ─── PARTS / LINE ITEMS ──────────────────────────────────────────────────────

// GET /api/work-orders/:id/parts
router.get('/:id/parts', async (req, res) => {
  try {
    const db = getAdapter();
    const parts = await db.find('wo_parts', {
      tenant_id: tenantId(req),
      work_order_id: req.params.id,
    }, { sort: { created_at: 1 } });
    res.json(parts || []);
  } catch (err) {
    logger.error(err, 'GET wo parts');
    res.status(500).json({ error: 'Failed to fetch parts' });
  }
});

// POST /api/work-orders/:id/parts
router.post('/:id/parts', async (req, res) => {
  try {
    const db = getAdapter();
    const tid = tenantId(req);
    const { sku, name, qtyPlanned = 1, qtyUsed = 0, unitCost = 0, inventoryItemId, notes = '' } = req.body;

    if (!name && !sku) return res.status(400).json({ error: 'name or sku required' });

    const part = {
      _id: randomUUID(),
      tenant_id: tid,
      work_order_id: req.params.id,
      sku: sku || null,
      name: name || sku,
      inventory_item_id: inventoryItemId || null,
      qty_planned: qtyPlanned,
      qty_used: qtyUsed,
      unit_cost: unitCost,
      total_cost: qtyUsed * unitCost,
      notes,
      status: 'planned', // planned | consumed | returned | cancelled
      added_by: req.user?.userId || req.user?.id,
      created_at: now(),
      updated_at: now(),
    };

    await db.insert('wo_parts', part);
    res.status(201).json(part);
  } catch (err) {
    logger.error(err, 'POST wo part');
    res.status(500).json({ error: 'Failed to add part' });
  }
});

// PUT /api/work-orders/:id/parts/:partId
router.put('/:id/parts/:partId', async (req, res) => {
  try {
    const db = getAdapter();
    const tid = tenantId(req);
    const part = await db.findOne('wo_parts', {
      _id: req.params.partId,
      tenant_id: tid,
      work_order_id: req.params.id,
    });
    if (!part) return res.status(404).json({ error: 'Part not found' });

    const update = {
      ...part,
      ...req.body,
      _id: req.params.partId,
      tenant_id: tid,
      work_order_id: req.params.id,
      updated_at: now(),
    };
    // Recalculate total
    update.total_cost = (update.qty_used || 0) * (update.unit_cost || 0);
    await db.updateOne('wo_parts', { _id: req.params.partId }, update);
    res.json(update);
  } catch (err) {
    logger.error(err, 'PUT wo part');
    res.status(500).json({ error: 'Failed to update part' });
  }
});

// DELETE /api/work-orders/:id/parts/:partId
router.delete('/:id/parts/:partId', async (req, res) => {
  try {
    const db = getAdapter();
    await db.deleteOne('wo_parts', {
      _id: req.params.partId,
      tenant_id: tenantId(req),
      work_order_id: req.params.id,
    });
    res.json({ success: true });
  } catch (err) {
    logger.error(err, 'DELETE wo part');
    res.status(500).json({ error: 'Failed to delete part' });
  }
});

// ─── DISPATCH AUDIT LOG ──────────────────────────────────────────────────────

// GET /api/work-orders/:id/dispatch-log
router.get('/:id/dispatch-log', async (req, res) => {
  try {
    const db = getAdapter();
    const entries = await db.find('dispatch_audit', {
      tenant_id: tenantId(req),
      work_order_id: req.params.id,
    }, { sort: { created_at: -1 } });
    res.json(entries || []);
  } catch (err) {
    logger.error(err, 'GET dispatch log');
    res.status(500).json({ error: 'Failed to fetch dispatch log' });
  }
});

// POST /api/work-orders/:id/dispatch-log
router.post('/:id/dispatch-log', async (req, res) => {
  try {
    const db = getAdapter();
    const tid = tenantId(req);
    const { action, fromTech, toTech, reason = '', metadata = {} } = req.body;

    if (!action) return res.status(400).json({ error: 'action is required' });

    const entry = {
      _id: randomUUID(),
      tenant_id: tid,
      work_order_id: req.params.id,
      action, // assigned | reassigned | unassigned | status_change | escalated
      from_technician_id: fromTech || null,
      to_technician_id: toTech || null,
      actor_id: req.user?.userId || req.user?.id,
      reason,
      metadata,
      created_at: now(),
    };

    await db.insert('dispatch_audit', entry);
    res.status(201).json(entry);
  } catch (err) {
    logger.error(err, 'POST dispatch log');
    res.status(500).json({ error: 'Failed to log dispatch action' });
  }
});

export default router;
