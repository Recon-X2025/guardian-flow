/**
 * @file server/routes/skills.js
 * @description Skills & Certifications API — Sprint 4.
 *
 * Routes
 * ------
 * GET    /api/skills                                   — list skills
 * POST   /api/skills                                   — create skill
 * GET    /api/skills/:id                               — get skill
 * PUT    /api/skills/:id                               — update skill
 * DELETE /api/skills/:id                               — delete skill
 *
 * GET    /api/skills/certifications                    — list certifications
 * POST   /api/skills/certifications                    — create certification
 * PUT    /api/skills/certifications/:id                — update certification
 * DELETE /api/skills/certifications/:id                — delete certification
 *
 * POST   /api/skills/technicians/:techId/skills        — assign skill to technician
 * GET    /api/skills/technicians/:techId               — list technician's skills
 *
 * GET    /api/skills/match?workOrderId=X               — score technicians for a WO
 *
 * Security
 * --------
 * All routes require authentication (applied by server.js middleware).
 * Tenant isolation enforced via req.user.tenantId.
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { writeDecisionRecord } from '../services/flowspace.js';
import logger from '../utils/logger.js';

const router = express.Router();

// ── Scoring helper ────────────────────────────────────────────────────────────

function scoreMatch(techSkills, requiredSkills) {
  const matched = techSkills.filter(s => requiredSkills.includes(s.skill_id));
  const allValid = matched.every(s => !s.expiry_date || new Date(s.expiry_date) > new Date());
  return {
    skillMatchPercent: requiredSkills.length ? (matched.length / requiredSkills.length) * 100 : 100,
    certificationValid: allValid,
    finalScore: (matched.length / Math.max(requiredSkills.length, 1)) * 100 * (allValid ? 1 : 0.5),
  };
}

// ── Skills CRUD ───────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const skills = await adapter.findMany('skills', { tenant_id: req.user.tenantId });
    res.json({ skills, total: skills.length });
  } catch (error) {
    logger.error('Skills: list error', { error: error.message });
    res.status(500).json({ error: 'Failed to list skills' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, category, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const adapter = await getAdapter();
    const skill = {
      id: randomUUID(),
      tenant_id: req.user.tenantId,
      name,
      category: category || null,
      description: description || null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    await adapter.insertOne('skills', skill);
    res.status(201).json({ skill });
  } catch (error) {
    logger.error('Skills: create error', { error: error.message });
    res.status(500).json({ error: 'Failed to create skill' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const skill = await adapter.findOne('skills', { id: req.params.id, tenant_id: req.user.tenantId });
    if (!skill) return res.status(404).json({ error: 'Skill not found' });
    res.json({ skill });
  } catch (error) {
    logger.error('Skills: get error', { error: error.message });
    res.status(500).json({ error: 'Failed to get skill' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, category, description } = req.body;
    const adapter = await getAdapter();
    const skill = await adapter.findOne('skills', { id: req.params.id, tenant_id: req.user.tenantId });
    if (!skill) return res.status(404).json({ error: 'Skill not found' });

    const updates = { updated_at: new Date() };
    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description;

    await adapter.updateOne('skills', { id: req.params.id, tenant_id: req.user.tenantId }, { $set: updates });
    res.json({ skill: { ...skill, ...updates } });
  } catch (error) {
    logger.error('Skills: update error', { error: error.message });
    res.status(500).json({ error: 'Failed to update skill' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const skill = await adapter.findOne('skills', { id: req.params.id, tenant_id: req.user.tenantId });
    if (!skill) return res.status(404).json({ error: 'Skill not found' });

    await adapter.deleteOne('skills', { id: req.params.id, tenant_id: req.user.tenantId });
    res.json({ success: true });
  } catch (error) {
    logger.error('Skills: delete error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete skill' });
  }
});

// ── Certifications CRUD ───────────────────────────────────────────────────────

router.get('/certifications', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const certifications = await adapter.findMany('certifications', { tenant_id: req.user.tenantId });
    res.json({ certifications, total: certifications.length });
  } catch (error) {
    logger.error('Certifications: list error', { error: error.message });
    res.status(500).json({ error: 'Failed to list certifications' });
  }
});

router.post('/certifications', async (req, res) => {
  try {
    const { name, validity_period_days, required_by_regulations, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const adapter = await getAdapter();
    const certification = {
      id: randomUUID(),
      tenant_id: req.user.tenantId,
      name,
      validity_period_days: validity_period_days || null,
      required_by_regulations: required_by_regulations || false,
      description: description || null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    await adapter.insertOne('certifications', certification);
    res.status(201).json({ certification });
  } catch (error) {
    logger.error('Certifications: create error', { error: error.message });
    res.status(500).json({ error: 'Failed to create certification' });
  }
});

router.put('/certifications/:id', async (req, res) => {
  try {
    const { name, validity_period_days, required_by_regulations, description } = req.body;
    const adapter = await getAdapter();
    const cert = await adapter.findOne('certifications', { id: req.params.id, tenant_id: req.user.tenantId });
    if (!cert) return res.status(404).json({ error: 'Certification not found' });

    const updates = { updated_at: new Date() };
    if (name !== undefined) updates.name = name;
    if (validity_period_days !== undefined) updates.validity_period_days = validity_period_days;
    if (required_by_regulations !== undefined) updates.required_by_regulations = required_by_regulations;
    if (description !== undefined) updates.description = description;

    await adapter.updateOne('certifications', { id: req.params.id, tenant_id: req.user.tenantId }, { $set: updates });
    res.json({ certification: { ...cert, ...updates } });
  } catch (error) {
    logger.error('Certifications: update error', { error: error.message });
    res.status(500).json({ error: 'Failed to update certification' });
  }
});

router.delete('/certifications/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const cert = await adapter.findOne('certifications', { id: req.params.id, tenant_id: req.user.tenantId });
    if (!cert) return res.status(404).json({ error: 'Certification not found' });

    await adapter.deleteOne('certifications', { id: req.params.id, tenant_id: req.user.tenantId });
    res.json({ success: true });
  } catch (error) {
    logger.error('Certifications: delete error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete certification' });
  }
});

// ── Technician Skills ─────────────────────────────────────────────────────────

router.post('/technicians/:techId/skills', async (req, res) => {
  try {
    const { techId } = req.params;
    const { skillId, certificationId, expiryDate } = req.body;
    if (!skillId) return res.status(400).json({ error: 'skillId is required' });

    const adapter = await getAdapter();
    const techSkill = {
      id: randomUUID(),
      tenant_id: req.user.tenantId,
      technician_id: techId,
      skill_id: skillId,
      certification_id: certificationId || null,
      expiry_date: expiryDate ? new Date(expiryDate) : null,
      assigned_at: new Date(),
      updated_at: new Date(),
    };
    await adapter.insertOne('technician_skills', techSkill);
    res.status(201).json({ techSkill });
  } catch (error) {
    logger.error('TechnicianSkills: assign error', { error: error.message });
    res.status(500).json({ error: 'Failed to assign skill' });
  }
});

router.get('/technicians/:techId', async (req, res) => {
  try {
    const { techId } = req.params;
    const adapter = await getAdapter();
    const techSkills = await adapter.findMany('technician_skills', {
      tenant_id: req.user.tenantId,
      technician_id: techId,
    });

    const now = new Date();
    const enriched = techSkills.map(ts => ({
      ...ts,
      expiry_status: !ts.expiry_date
        ? 'no_expiry'
        : new Date(ts.expiry_date) > now
          ? 'valid'
          : 'expired',
    }));

    res.json({ techSkills: enriched, total: enriched.length });
  } catch (error) {
    logger.error('TechnicianSkills: list error', { error: error.message });
    res.status(500).json({ error: 'Failed to list technician skills' });
  }
});

// ── Skill Match Scoring ───────────────────────────────────────────────────────

router.get('/match', async (req, res) => {
  try {
    const { workOrderId } = req.query;
    if (!workOrderId) return res.status(400).json({ error: 'workOrderId is required' });

    const adapter = await getAdapter();
    const workOrder = await adapter.findOne('work_orders', {
      id: workOrderId,
      tenant_id: req.user.tenantId,
    });
    if (!workOrder) return res.status(404).json({ error: 'Work order not found' });

    const requiredSkills = workOrder.required_skills || workOrder.skill_tags || [];

    // Group technician_skills by technician
    const allTechSkills = await adapter.findMany('technician_skills', {
      tenant_id: req.user.tenantId,
    });

    const byTech = {};
    for (const ts of allTechSkills) {
      if (!byTech[ts.technician_id]) byTech[ts.technician_id] = [];
      byTech[ts.technician_id].push(ts);
    }

    const candidates = Object.entries(byTech).map(([techId, skills]) => {
      const score = scoreMatch(skills, requiredSkills);
      return { technician_id: techId, skills, ...score };
    });

    candidates.sort((a, b) => b.finalScore - a.finalScore);

    // Write FlowSpace decision record
    const topCandidates = candidates.slice(0, 3).map(c => ({
      technician_id: c.technician_id,
      finalScore: c.finalScore,
      skillMatchPercent: c.skillMatchPercent,
      certificationValid: c.certificationValid,
    }));

    await writeDecisionRecord({
      tenantId: req.user.tenantId,
      domain: 'fsm',
      actorType: 'system',
      actorId: 'skills-match-engine',
      action: 'skill_match_scored',
      context: {
        workOrderId,
        topCandidates,
        scoreBreakdown: { requiredSkills, totalCandidates: candidates.length },
      },
      entityType: 'work_order',
      entityId: workOrderId,
    }).catch(err => logger.warn('Skills: FlowSpace write failed', { error: err.message }));

    res.json({ candidates, total: candidates.length });
  } catch (error) {
    logger.error('Skills: match error', { error: error.message });
    res.status(500).json({ error: 'Failed to score skill match' });
  }
});

export default router;
