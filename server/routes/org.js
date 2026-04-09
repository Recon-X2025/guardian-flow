/**
 * @file server/routes/org.js
 * @description Organisation Management and Administration Console (MAC) API.
 *
 * Routes
 * ------
 * GET    /api/org              — list orgs (sys_admin: all; tenant_admin: own)
 * POST   /api/org              — create org          (sys_admin only)
 * GET    /api/org/:id          — get org             (sys_admin: any; tenant_admin: own)
 * PATCH  /api/org/:id          — update org profile  (sys_admin: any; tenant_admin: own)
 * DELETE /api/org/:id          — deactivate org      (sys_admin only)
 *
 * GET    /api/org/:id/members        — list members
 * POST   /api/org/:id/members/invite — invite new member
 * PATCH  /api/org/:id/members/:uid   — change member role / status
 * DELETE /api/org/:id/members/:uid   — remove member
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the tenant_id for the currently-authenticated user.
 * Looks up the profiles collection; returns null when not found.
 */
async function getUserTenantId(adapter, userId) {
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? null;
}

/**
 * Return true when the current user has the sys_admin role.
 */
function isSysAdmin(req) {
  const roles = req.user?.mappedRoles ?? req.user?.roles ?? [];
  return roles.includes('sys_admin') || roles.includes('admin');
}

/**
 * Return true when the current user has the tenant_admin role.
 */
function isTenantAdmin(req) {
  const roles = req.user?.mappedRoles ?? req.user?.roles ?? [];
  return roles.includes('tenant_admin') || roles.includes('manager');
}

// ---------------------------------------------------------------------------
// Org CRUD
// ---------------------------------------------------------------------------

/** GET /api/org  — list organisations */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const adapter = await getAdapter();

    if (isSysAdmin(req)) {
      const { page: pageParam = 1, limit: limitParam = 50, search } = req.query;
      const page  = Math.max(1, parseInt(pageParam) || 1);
      const limit = Math.min(100, parseInt(limitParam) || 50);

      const filter = { active: { $ne: false } };
      if (search) {
        filter.$or = [
          { name:  { $regex: search, $options: 'i' } },
          { slug:  { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }

      const [orgs, total] = await Promise.all([
        adapter.findMany('tenants', filter, { limit, offset: (page - 1) * limit }),
        adapter.countDocuments('tenants', filter),
      ]);

      return res.json({ orgs, total, page, limit });
    }

    if (isTenantAdmin(req)) {
      const tenantId = await getUserTenantId(adapter, req.user.id);
      if (!tenantId) return res.json({ orgs: [], total: 0, page: 1, limit: 50 });

      const org = await adapter.findOne('tenants', { id: tenantId });
      return res.json({ orgs: org ? [org] : [], total: org ? 1 : 0, page: 1, limit: 1 });
    }

    return res.status(403).json({ error: 'Insufficient permissions' });
  } catch (err) {
    logger.error('GET /org error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** POST /api/org  — create new organisation (sys_admin only) */
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (!isSysAdmin(req)) return res.status(403).json({ error: 'sys_admin required' });

    const {
      name, slug, industry, email, phone, website,
      address, timezone = 'UTC', locale = 'en', plan = 'starter',
    } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'name must be at least 2 characters' });
    }
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: 'slug must be lowercase alphanumeric with hyphens' });
    }

    const adapter = await getAdapter();

    // Unique slug check
    const existing = await adapter.findOne('tenants', { slug });
    if (existing) return res.status(409).json({ error: 'slug already in use' });

    const id  = randomUUID();
    const now = new Date();

    const org = {
      id,
      name:        name.trim(),
      slug,
      industry:    industry   || null,
      email:       email      || null,
      phone:       phone      || null,
      website:     website    || null,
      address:     address    || {},
      timezone,
      locale,
      plan,
      active:      true,
      settings:    {},
      created_by:  req.user.id,
      created_at:  now,
      updated_at:  now,
    };

    await adapter.insertOne('tenants', org);

    logger.info('Org created', { id, name: org.name, created_by: req.user.id });
    return res.status(201).json({ org });
  } catch (err) {
    logger.error('POST /org error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /api/org/:id  — get single org */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const adapter  = await getAdapter();
    const { id }   = req.params;

    const org = await adapter.findOne('tenants', { id });
    if (!org) return res.status(404).json({ error: 'Organisation not found' });

    // tenant_admin can only read their own org
    if (!isSysAdmin(req)) {
      const tenantId = await getUserTenantId(adapter, req.user.id);
      if (!isTenantAdmin(req) || tenantId !== id) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    return res.json({ org });
  } catch (err) {
    logger.error('GET /org/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** PATCH /api/org/:id  — update org profile */
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const adapter  = await getAdapter();
    const { id }   = req.params;

    const org = await adapter.findOne('tenants', { id });
    if (!org) return res.status(404).json({ error: 'Organisation not found' });

    // tenant_admin can only update their own org
    if (!isSysAdmin(req)) {
      const tenantId = await getUserTenantId(adapter, req.user.id);
      if (!isTenantAdmin(req) || tenantId !== id) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    const ALLOWED = ['name', 'industry', 'email', 'phone', 'website', 'address', 'timezone', 'locale', 'settings', 'logo_url'];
    // sys_admin may also change plan/active status
    if (isSysAdmin(req)) ALLOWED.push('plan', 'active', 'slug');

    const updates = {};
    for (const key of ALLOWED) {
      if (key in req.body) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Slug uniqueness check when changing slug
    if (updates.slug && updates.slug !== org.slug) {
      const conflict = await adapter.findOne('tenants', { slug: updates.slug });
      if (conflict) return res.status(409).json({ error: 'slug already in use' });
    }

    updates.updated_at = new Date();
    await adapter.updateOne('tenants', { id }, { $set: updates });

    const updated = await adapter.findOne('tenants', { id });
    return res.json({ org: updated });
  } catch (err) {
    logger.error('PATCH /org/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** DELETE /api/org/:id  — deactivate org (sys_admin only, soft-delete) */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (!isSysAdmin(req)) return res.status(403).json({ error: 'sys_admin required' });

    const adapter = await getAdapter();
    const { id }  = req.params;

    const org = await adapter.findOne('tenants', { id });
    if (!org) return res.status(404).json({ error: 'Organisation not found' });

    await adapter.updateOne('tenants', { id }, { $set: { active: false, deactivated_at: new Date() } });

    logger.info('Org deactivated', { id, by: req.user.id });
    return res.json({ message: 'Organisation deactivated' });
  } catch (err) {
    logger.error('DELETE /org/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Member management
// ---------------------------------------------------------------------------

/** GET /api/org/:id/members  — list members of an org */
router.get('/:id/members', authenticateToken, async (req, res) => {
  try {
    const adapter = await getAdapter();
    const { id }  = req.params;

    if (!isSysAdmin(req)) {
      const tenantId = await getUserTenantId(adapter, req.user.id);
      if (!isTenantAdmin(req) || tenantId !== id) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    // Members are users whose profile.tenant_id matches this org
    const profiles = await adapter.findMany('profiles', { tenant_id: id });

    // Attach roles
    const userIds   = profiles.map(p => p.id);
    const allRoles  = userIds.length
      ? await adapter.findMany('user_roles', { user_id: { $in: userIds } })
      : [];

    const members = profiles.map(p => ({
      id:         p.id,
      email:      p.email,
      full_name:  p.full_name,
      avatar_url: p.avatar_url ?? null,
      active:     p.active !== false,
      joined_at:  p.created_at,
      roles:      allRoles.filter(r => r.user_id === p.id).map(r => r.role),
    }));

    return res.json({ members, total: members.length });
  } catch (err) {
    logger.error('GET /org/:id/members error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** POST /api/org/:id/members/invite  — invite a user to the org */
router.post('/:id/members/invite', authenticateToken, async (req, res) => {
  try {
    const adapter = await getAdapter();
    const { id }  = req.params;

    if (!isSysAdmin(req)) {
      const tenantId = await getUserTenantId(adapter, req.user.id);
      if (!isTenantAdmin(req) || tenantId !== id) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    const org = await adapter.findOne('tenants', { id });
    if (!org) return res.status(404).json({ error: 'Organisation not found' });

    const { email, role = 'tenant_admin', full_name } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const VALID_ROLES = ['tenant_admin', 'ops_manager', 'finance_manager', 'dispatcher',
      'technician', 'support_agent', 'fraud_investigator', 'auditor', 'billing_agent', 'partner_admin', 'customer'];
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
    }

    const now      = new Date();
    const inviteId = randomUUID();

    // Record pending invite
    await adapter.insertOne('org_invites', {
      id:           inviteId,
      tenant_id:    id,
      email,
      full_name:    full_name || null,
      role,
      invited_by:   req.user.id,
      status:       'pending',
      created_at:   now,
      expires_at:   new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    logger.info('Org invite created', { inviteId, tenant_id: id, email, role });
    return res.status(201).json({ invite: { id: inviteId, email, role, status: 'pending', expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) } });
  } catch (err) {
    logger.error('POST /org/:id/members/invite error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** PATCH /api/org/:id/members/:uid  — update a member's role or status */
router.patch('/:id/members/:uid', authenticateToken, async (req, res) => {
  try {
    const adapter          = await getAdapter();
    const { id, uid }      = req.params;

    if (!isSysAdmin(req)) {
      const tenantId = await getUserTenantId(adapter, req.user.id);
      if (!isTenantAdmin(req) || tenantId !== id) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    const profile = await adapter.findOne('profiles', { id: uid, tenant_id: id });
    if (!profile) return res.status(404).json({ error: 'Member not found in this organisation' });

    const { role, active } = req.body;

    if (role !== undefined) {
      const VALID_ROLES = ['tenant_admin', 'ops_manager', 'finance_manager', 'dispatcher',
        'technician', 'support_agent', 'fraud_investigator', 'auditor', 'billing_agent', 'partner_admin', 'customer'];
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
      }
      // Replace the user's primary role in user_roles
      await adapter.deleteMany('user_roles', { user_id: uid });
      await adapter.insertOne('user_roles', {
        id:         randomUUID(),
        user_id:    uid,
        role,
        tenant_id:  id,
        granted_by: req.user.id,
        granted_at: new Date(),
      });
    }

    if (active !== undefined) {
      await adapter.updateOne('users',    { id: uid }, { $set: { active: Boolean(active) } });
      await adapter.updateOne('profiles', { id: uid }, { $set: { active: Boolean(active) } });
    }

    return res.json({ message: 'Member updated' });
  } catch (err) {
    logger.error('PATCH /org/:id/members/:uid error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** DELETE /api/org/:id/members/:uid  — remove a member from the org */
router.delete('/:id/members/:uid', authenticateToken, async (req, res) => {
  try {
    const adapter      = await getAdapter();
    const { id, uid }  = req.params;

    if (!isSysAdmin(req)) {
      const tenantId = await getUserTenantId(adapter, req.user.id);
      if (!isTenantAdmin(req) || tenantId !== id) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    // Prevent removing yourself
    if (uid === req.user.id) {
      return res.status(400).json({ error: 'You cannot remove yourself from the organisation' });
    }

    const profile = await adapter.findOne('profiles', { id: uid, tenant_id: id });
    if (!profile) return res.status(404).json({ error: 'Member not found in this organisation' });

    // Disassociate user from org by clearing tenant_id, deactivate the account
    await adapter.updateOne('profiles', { id: uid }, { $set: { tenant_id: null, active: false } });
    await adapter.updateOne('users',    { id: uid }, { $set: { active: false } });
    await adapter.deleteMany('user_roles', { user_id: uid, tenant_id: id });

    logger.info('Org member removed', { tenant_id: id, removed_uid: uid, by: req.user.id });
    return res.json({ message: 'Member removed from organisation' });
  } catch (err) {
    logger.error('DELETE /org/:id/members/:uid error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
