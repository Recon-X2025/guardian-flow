import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();
const WO_COL = 'work_orders';
const USER_COL = 'users';

function requireTenantId(req) {
  const tenantId = req.securityContext?.tenantId ?? req.user?.tenantId ?? req.user?.tenant_id;
  if (!tenantId) {
    const error = new Error('Authenticated user has no tenant context');
    error.statusCode = 403;
    throw error;
  }
  return tenantId;
}

async function findTenantUser(adapter, userId, tenantId) {
  return adapter.findOne(USER_COL, { id: userId, tenant_id: tenantId });
}

router.post('/:id/crew', authenticateToken, async (req, res) => {
  try {
    const tenantId = requireTenantId(req);
    const { action, technicianId } = req.body;
    if (!action || !technicianId) return res.status(400).json({ error: 'action and technicianId are required' });
    if (action !== 'add' && action !== 'remove') return res.status(400).json({ error: 'action must be "add" or "remove"' });

    const adapter = await getAdapter();
    const wo = await adapter.findOne(WO_COL, { id: req.params.id, tenant_id: tenantId });
    if (!wo) return res.status(404).json({ error: 'Work order not found' });

    const technician = await findTenantUser(adapter, technicianId, tenantId);
    if (!technician) return res.status(404).json({ error: 'Technician not found' });

    const currentCrew = Array.isArray(wo.crew_members) ? wo.crew_members : [];
    let updatedCrew;
    if (action === 'add') {
      if (currentCrew.includes(technicianId)) return res.status(409).json({ error: 'Technician already in crew' });
      updatedCrew = [...currentCrew, technicianId];
    } else {
      updatedCrew = currentCrew.filter(id => id !== technicianId);
      if (wo.crew_lead === technicianId) {
        await adapter.updateOne(WO_COL, { id: req.params.id, tenant_id: tenantId }, { $set: { crew_lead: null } });
      }
    }

    await adapter.updateOne(WO_COL, { id: req.params.id, tenant_id: tenantId }, { $set: { crew_members: updatedCrew, updated_at: new Date().toISOString() } });
    logger.info('Crew updated', { workOrderId: req.params.id, action, technicianId, tenantId });
    res.json({ crew_members: updatedCrew });
  } catch (error) {
    logger.error('Crew: update error', { error: error.message });
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Failed to update crew' });
  }
});

router.get('/:id/crew', authenticateToken, async (req, res) => {
  try {
    const tenantId = requireTenantId(req);
    const adapter = await getAdapter();
    const wo = await adapter.findOne(WO_COL, { id: req.params.id, tenant_id: tenantId });
    if (!wo) return res.status(404).json({ error: 'Work order not found' });

    const memberIds = Array.isArray(wo.crew_members) ? wo.crew_members : [];
    const members = await Promise.all(memberIds.map(async techId => {
      const user = await findTenantUser(adapter, techId, tenantId);
      if (!user) return { id: techId, name: 'Unknown', skills: [], certifications: [] };
      let skills = [];
      let certifications = [];
      try {
        const techSkills = await adapter.findMany('technician_skills', { technician_id: techId, tenant_id: tenantId });
        skills = techSkills.map(s => s.skill_id);
        certifications = techSkills.filter(s => s.cert_id).map(s => s.cert_id);
      } catch { /* skills optional */ }
      return { id: user.id, name: user.full_name || user.email, email: user.email, skills, certifications, is_lead: wo.crew_lead === techId };
    }));
    res.json({ crew_members: members, crew_lead: wo.crew_lead });
  } catch (error) {
    logger.error('Crew: list error', { error: error.message });
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Failed to get crew' });
  }
});

router.put('/:id/crew/lead', authenticateToken, async (req, res) => {
  try {
    const tenantId = requireTenantId(req);
    const { technicianId } = req.body;
    if (!technicianId) return res.status(400).json({ error: 'technicianId is required' });

    const adapter = await getAdapter();
    const wo = await adapter.findOne(WO_COL, { id: req.params.id, tenant_id: tenantId });
    if (!wo) return res.status(404).json({ error: 'Work order not found' });

    const currentCrew = Array.isArray(wo.crew_members) ? wo.crew_members : [];
    if (!currentCrew.includes(technicianId)) return res.status(400).json({ error: 'Technician must be a crew member before being set as lead' });

    const technician = await findTenantUser(adapter, technicianId, tenantId);
    if (!technician) return res.status(404).json({ error: 'Technician not found' });

    await adapter.updateOne(WO_COL, { id: req.params.id, tenant_id: tenantId }, { $set: { crew_lead: technicianId, updated_at: new Date().toISOString() } });
    logger.info('Crew lead set', { workOrderId: req.params.id, technicianId, tenantId });
    res.json({ crew_lead: technicianId });
  } catch (error) {
    logger.error('Crew: set lead error', { error: error.message });
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Failed to set crew lead' });
  }
});

export default router;
