import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

router.get('/controls', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const controls = await adapter.findMany('audit_controls', { tenant_id: tenantId }, { limit: 100 });
    res.json({ controls });
  } catch (err) {
    logger.error('Audit controls list error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/controls', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { name, framework, category, description, test_frequency } = req.body;
    if (!name || !framework) return res.status(400).json({ error: 'name and framework are required' });
    const adapter = await getAdapter();
    const control = {
      id: randomUUID(),
      tenant_id: tenantId,
      name,
      framework,
      category: category || 'general',
      description: description || '',
      test_frequency: test_frequency || 'quarterly',
      status: 'active',
      created_at: new Date().toISOString(),
    };
    await adapter.insertOne('audit_controls', control);
    res.status(201).json({ control });
  } catch (err) {
    logger.error('Audit control create error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/assessments', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const assessments = await adapter.findMany('audit_assessments', { tenant_id: tenantId }, { limit: 100 });
    res.json({ assessments });
  } catch (err) {
    logger.error('Audit assessments list error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/assessments', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { control_id, assessor_id, result, evidence, notes } = req.body;
    if (!control_id || !result) return res.status(400).json({ error: 'control_id and result are required' });
    const adapter = await getAdapter();
    const assessment = {
      id: randomUUID(),
      tenant_id: tenantId,
      control_id,
      assessor_id: assessor_id || req.user.id,
      result,
      evidence: evidence || '',
      notes: notes || '',
      assessed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    await adapter.insertOne('audit_assessments', assessment);
    if (result === 'fail') {
      await adapter.insertOne('audit_risk_register', {
        id: randomUUID(),
        tenant_id: tenantId,
        control_id,
        assessment_id: assessment.id,
        severity: 'high',
        status: 'open',
        created_at: new Date().toISOString(),
      });
    }
    res.status(201).json({ assessment });
  } catch (err) {
    logger.error('Audit assessment create error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/risk-register', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const risks = await adapter.findMany('audit_risk_register', { tenant_id: tenantId }, { limit: 100 });
    res.json({ risks });
  } catch (err) {
    logger.error('Audit risk register error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/report', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const assessments = await adapter.findMany('audit_assessments', { tenant_id: tenantId }, { limit: 500 });
    const total = assessments.length;
    const passed = assessments.filter(a => a.result === 'pass').length;
    const failed = assessments.filter(a => a.result === 'fail').length;
    const partial = assessments.filter(a => a.result === 'partial').length;
    const complianceScore = total ? Math.round((passed / total) * 10000) / 100 : 0;
    res.json({ total, passed, failed, partial, compliance_score_pct: complianceScore });
  } catch (err) {
    logger.error('Audit report error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
