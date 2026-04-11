/**
 * @file server/routes/crm.js
 * @description CRM API — Accounts, Contacts, Leads, Deals, Pipeline Stages.
 *
 * Routes
 * ------
 * GET    /api/crm/accounts                  — list accounts
 * POST   /api/crm/accounts                  — create account
 * GET    /api/crm/accounts/:id              — get account
 * PUT    /api/crm/accounts/:id              — update account
 * DELETE /api/crm/accounts/:id              — delete account
 *
 * GET    /api/crm/contacts                  — list contacts (optionally by account)
 * POST   /api/crm/contacts                  — create contact
 * GET    /api/crm/contacts/:id              — get contact
 * PUT    /api/crm/contacts/:id              — update contact
 * DELETE /api/crm/contacts/:id              — delete contact
 *
 * GET    /api/crm/leads                     — list leads
 * POST   /api/crm/leads                     — create lead
 * GET    /api/crm/leads/:id                 — get lead
 * PUT    /api/crm/leads/:id                 — update lead
 * DELETE /api/crm/leads/:id                 — delete lead
 * POST   /api/crm/leads/:id/convert         — convert lead to deal + contact + account
 *
 * GET    /api/crm/deals                     — list deals
 * POST   /api/crm/deals                     — create deal
 * GET    /api/crm/deals/:id                 — get deal
 * PUT    /api/crm/deals/:id                 — update deal (includes stage move)
 * DELETE /api/crm/deals/:id                 — delete deal
 *
 * GET    /api/crm/pipeline-stages           — list pipeline stages
 * POST   /api/crm/pipeline-stages           — create pipeline stage
 * PUT    /api/crm/pipeline-stages/:id       — update pipeline stage
 * DELETE /api/crm/pipeline-stages/:id       — delete pipeline stage
 * PUT    /api/crm/pipeline-stages/reorder   — reorder stages (array of {id, position})
 *
 * Security
 * --------
 * All routes require JWT authentication (applied in server.js via authenticateToken).
 * Tenant isolation via req.user.tenantId on every query.
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

const COL_ACCOUNTS        = 'crm_accounts';
const COL_CONTACTS        = 'crm_contacts';
const COL_LEADS           = 'crm_leads';
const COL_DEALS           = 'crm_deals';
const COL_PIPELINE_STAGES = 'crm_pipeline_stages';

const DEFAULT_STAGES = [
  { name: 'Prospecting',    position: 1, colour: '#6366f1' },
  { name: 'Qualification',  position: 2, colour: '#8b5cf6' },
  { name: 'Proposal',       position: 3, colour: '#f59e0b' },
  { name: 'Negotiation',    position: 4, colour: '#f97316' },
  { name: 'Closed Won',     position: 5, colour: '#22c55e' },
  { name: 'Closed Lost',    position: 6, colour: '#ef4444' },
];

// ── Ensure default stages exist for a tenant ─────────────────────────────────

async function ensureDefaultStages(adapter, tenantId) {
  const existing = await adapter.findMany(COL_PIPELINE_STAGES, { tenant_id: tenantId });
  if (existing.length === 0) {
    const now = new Date();
    await Promise.all(
      DEFAULT_STAGES.map(s =>
        adapter.insertOne(COL_PIPELINE_STAGES, {
          id:         randomUUID(),
          tenant_id:  tenantId,
          name:       s.name,
          position:   s.position,
          colour:     s.colour,
          is_default: true,
          created_at: now,
          updated_at: now,
        }),
      ),
    );
    return await adapter.findMany(COL_PIPELINE_STAGES, { tenant_id: tenantId });
  }
  return existing;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCOUNTS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/accounts', async (req, res) => {
  try {
    const adapter  = await getAdapter();
    const accounts = await adapter.findMany(COL_ACCOUNTS, { tenant_id: req.user.tenantId });
    accounts.sort((a, b) => (a.company_name || '').localeCompare(b.company_name || ''));
    res.json({ accounts, total: accounts.length });
  } catch (err) {
    logger.error('CRM: list accounts error', { error: err.message });
    res.status(500).json({ error: 'Failed to list accounts' });
  }
});

router.post('/accounts', async (req, res) => {
  try {
    const { company_name, industry, website, billing_address, shipping_address, assigned_rep_id, phone, email, notes } = req.body;
    if (!company_name) return res.status(400).json({ error: 'company_name is required' });

    const adapter = await getAdapter();
    const now     = new Date();
    const account = {
      id:               randomUUID(),
      tenant_id:        req.user.tenantId,
      company_name,
      industry:         industry ?? null,
      website:          website ?? null,
      billing_address:  billing_address ?? null,
      shipping_address: shipping_address ?? null,
      assigned_rep_id:  assigned_rep_id ?? null,
      phone:            phone ?? null,
      email:            email ?? null,
      notes:            notes ?? null,
      created_by:       req.user.userId,
      created_at:       now,
      updated_at:       now,
    };
    await adapter.insertOne(COL_ACCOUNTS, account);
    logger.info('CRM: account created', { accountId: account.id, tenantId: req.user.tenantId });
    res.status(201).json({ account });
  } catch (err) {
    logger.error('CRM: create account error', { error: err.message });
    res.status(500).json({ error: 'Failed to create account' });
  }
});

router.get('/accounts/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const account = await adapter.findOne(COL_ACCOUNTS, { id: req.params.id, tenant_id: req.user.tenantId });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json({ account });
  } catch (err) {
    logger.error('CRM: get account error', { error: err.message });
    res.status(500).json({ error: 'Failed to get account' });
  }
});

router.put('/accounts/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const account = await adapter.findOne(COL_ACCOUNTS, { id: req.params.id, tenant_id: req.user.tenantId });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const allowed = ['company_name', 'industry', 'website', 'billing_address', 'shipping_address', 'assigned_rep_id', 'phone', 'email', 'notes'];
    const updates = {};
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }
    updates.updated_at = new Date();

    await adapter.updateOne(COL_ACCOUNTS, { id: req.params.id, tenant_id: req.user.tenantId }, updates);
    res.json({ account: { ...account, ...updates } });
  } catch (err) {
    logger.error('CRM: update account error', { error: err.message });
    res.status(500).json({ error: 'Failed to update account' });
  }
});

router.delete('/accounts/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const account = await adapter.findOne(COL_ACCOUNTS, { id: req.params.id, tenant_id: req.user.tenantId });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    await adapter.deleteOne(COL_ACCOUNTS, { id: req.params.id, tenant_id: req.user.tenantId });
    res.json({ deleted: true });
  } catch (err) {
    logger.error('CRM: delete account error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONTACTS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/contacts', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const filter  = { tenant_id: req.user.tenantId };
    if (req.query.account_id) filter.account_id = req.query.account_id;

    const contacts = await adapter.findMany(COL_CONTACTS, filter);
    contacts.sort((a, b) => (a.last_name || '').localeCompare(b.last_name || ''));
    res.json({ contacts, total: contacts.length });
  } catch (err) {
    logger.error('CRM: list contacts error', { error: err.message });
    res.status(500).json({ error: 'Failed to list contacts' });
  }
});

router.post('/contacts', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, title, account_id, is_primary, notes } = req.body;
    if (!first_name || !last_name) return res.status(400).json({ error: 'first_name and last_name are required' });

    const adapter = await getAdapter();

    // Validate account exists for this tenant if provided
    if (account_id) {
      const acct = await adapter.findOne(COL_ACCOUNTS, { id: account_id, tenant_id: req.user.tenantId });
      if (!acct) return res.status(400).json({ error: 'account_id references unknown account' });
    }

    const now     = new Date();
    const contact = {
      id:          randomUUID(),
      tenant_id:   req.user.tenantId,
      first_name,
      last_name,
      email:       email ?? null,
      phone:       phone ?? null,
      title:       title ?? null,
      account_id:  account_id ?? null,
      is_primary:  is_primary ?? false,
      notes:       notes ?? null,
      created_by:  req.user.userId,
      created_at:  now,
      updated_at:  now,
    };
    await adapter.insertOne(COL_CONTACTS, contact);
    logger.info('CRM: contact created', { contactId: contact.id, tenantId: req.user.tenantId });
    res.status(201).json({ contact });
  } catch (err) {
    logger.error('CRM: create contact error', { error: err.message });
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

router.get('/contacts/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const contact = await adapter.findOne(COL_CONTACTS, { id: req.params.id, tenant_id: req.user.tenantId });
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    res.json({ contact });
  } catch (err) {
    logger.error('CRM: get contact error', { error: err.message });
    res.status(500).json({ error: 'Failed to get contact' });
  }
});

router.put('/contacts/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const contact = await adapter.findOne(COL_CONTACTS, { id: req.params.id, tenant_id: req.user.tenantId });
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    const allowed = ['first_name', 'last_name', 'email', 'phone', 'title', 'account_id', 'is_primary', 'notes'];
    const updates = {};
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }
    updates.updated_at = new Date();

    await adapter.updateOne(COL_CONTACTS, { id: req.params.id, tenant_id: req.user.tenantId }, updates);
    res.json({ contact: { ...contact, ...updates } });
  } catch (err) {
    logger.error('CRM: update contact error', { error: err.message });
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

router.delete('/contacts/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const contact = await adapter.findOne(COL_CONTACTS, { id: req.params.id, tenant_id: req.user.tenantId });
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    await adapter.deleteOne(COL_CONTACTS, { id: req.params.id, tenant_id: req.user.tenantId });
    res.json({ deleted: true });
  } catch (err) {
    logger.error('CRM: delete contact error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// LEADS
// ═══════════════════════════════════════════════════════════════════════════════

// Lead score: sum of weighted signals (0-100)
function computeLeadScore(lead) {
  let score = 0;
  if (lead.email)          score += 10;
  if (lead.phone)          score += 10;
  if (lead.company_name)   score += 10;
  if (lead.budget_estimate && lead.budget_estimate > 0) score += 20;
  if (lead.source === 'referral')  score += 20;
  else if (lead.source === 'inbound') score += 15;
  else if (lead.source)    score += 5;
  if (lead.interest_level === 'high')   score += 20;
  else if (lead.interest_level === 'medium') score += 10;
  if (lead.timeline_weeks && lead.timeline_weeks <= 4) score += 10;
  return Math.min(score, 100);
}

router.get('/leads', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const leads   = await adapter.findMany(COL_LEADS, { tenant_id: req.user.tenantId });
    leads.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json({ leads, total: leads.length });
  } catch (err) {
    logger.error('CRM: list leads error', { error: err.message });
    res.status(500).json({ error: 'Failed to list leads' });
  }
});

router.post('/leads', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, company_name, title, source, interest_level, budget_estimate, timeline_weeks, notes } = req.body;
    if (!first_name || !last_name) return res.status(400).json({ error: 'first_name and last_name are required' });

    const now  = new Date();
    const body = { first_name, last_name, email, phone, company_name, title, source, interest_level, budget_estimate, timeline_weeks, notes };
    const lead = {
      id:               randomUUID(),
      tenant_id:        req.user.tenantId,
      ...body,
      status:           'new',
      score:            computeLeadScore(body),
      converted:        false,
      converted_deal_id:    null,
      converted_contact_id: null,
      converted_account_id: null,
      created_by:       req.user.userId,
      created_at:       now,
      updated_at:       now,
    };
    const adapter = await getAdapter();
    await adapter.insertOne(COL_LEADS, lead);
    logger.info('CRM: lead created', { leadId: lead.id, score: lead.score, tenantId: req.user.tenantId });
    res.status(201).json({ lead });
  } catch (err) {
    logger.error('CRM: create lead error', { error: err.message });
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

router.get('/leads/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const lead    = await adapter.findOne(COL_LEADS, { id: req.params.id, tenant_id: req.user.tenantId });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json({ lead });
  } catch (err) {
    logger.error('CRM: get lead error', { error: err.message });
    res.status(500).json({ error: 'Failed to get lead' });
  }
});

router.put('/leads/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const lead    = await adapter.findOne(COL_LEADS, { id: req.params.id, tenant_id: req.user.tenantId });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const allowed = ['first_name', 'last_name', 'email', 'phone', 'company_name', 'title', 'source', 'interest_level', 'budget_estimate', 'timeline_weeks', 'notes', 'status'];
    const updates = {};
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }
    const merged = { ...lead, ...updates };
    updates.score      = computeLeadScore(merged);
    updates.updated_at = new Date();

    await adapter.updateOne(COL_LEADS, { id: req.params.id, tenant_id: req.user.tenantId }, updates);
    res.json({ lead: { ...lead, ...updates } });
  } catch (err) {
    logger.error('CRM: update lead error', { error: err.message });
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

router.delete('/leads/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const lead    = await adapter.findOne(COL_LEADS, { id: req.params.id, tenant_id: req.user.tenantId });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    await adapter.deleteOne(COL_LEADS, { id: req.params.id, tenant_id: req.user.tenantId });
    res.json({ deleted: true });
  } catch (err) {
    logger.error('CRM: delete lead error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// Convert lead → Account + Contact + Deal
router.post('/leads/:id/convert', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const lead    = await adapter.findOne(COL_LEADS, { id: req.params.id, tenant_id: req.user.tenantId });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (lead.converted) return res.status(409).json({ error: 'Lead already converted' });

    const tenantId = req.user.tenantId;
    const now      = new Date();

    // Ensure pipeline stages exist
    await ensureDefaultStages(adapter, tenantId);
    const stages   = await adapter.findMany(COL_PIPELINE_STAGES, { tenant_id: tenantId });
    stages.sort((a, b) => a.position - b.position);
    const firstStage = stages[0];

    // 1. Create Account
    const account = {
      id:              randomUUID(),
      tenant_id:       tenantId,
      company_name:    lead.company_name || `${lead.first_name} ${lead.last_name}`,
      industry:        null,
      website:         null,
      billing_address: null,
      shipping_address: null,
      assigned_rep_id: null,
      phone:           lead.phone ?? null,
      email:           lead.email ?? null,
      notes:           `Converted from lead ${lead.id}`,
      created_by:      req.user.userId,
      created_at:      now,
      updated_at:      now,
    };
    await adapter.insertOne(COL_ACCOUNTS, account);

    // 2. Create Contact
    const contact = {
      id:          randomUUID(),
      tenant_id:   tenantId,
      first_name:  lead.first_name,
      last_name:   lead.last_name,
      email:       lead.email ?? null,
      phone:       lead.phone ?? null,
      title:       lead.title ?? null,
      account_id:  account.id,
      is_primary:  true,
      notes:       `Converted from lead ${lead.id}`,
      created_by:  req.user.userId,
      created_at:  now,
      updated_at:  now,
    };
    await adapter.insertOne(COL_CONTACTS, contact);

    // 3. Create Deal
    const deal = {
      id:               randomUUID(),
      tenant_id:        tenantId,
      title:            req.body.deal_title || `${account.company_name} — Deal`,
      account_id:       account.id,
      contact_id:       contact.id,
      stage_id:         firstStage?.id ?? null,
      stage_name:       firstStage?.name ?? 'Prospecting',
      value:            lead.budget_estimate ?? 0,
      currency:         'USD',
      probability:      10,
      close_date:       null,
      assigned_rep_id:  null,
      notes:            `Converted from lead ${lead.id}`,
      created_by:       req.user.userId,
      created_at:       now,
      updated_at:       now,
    };
    await adapter.insertOne(COL_DEALS, deal);

    // 4. Mark lead converted
    await adapter.updateOne(COL_LEADS, { id: lead.id, tenant_id: tenantId }, {
      converted:            true,
      status:               'converted',
      converted_deal_id:    deal.id,
      converted_contact_id: contact.id,
      converted_account_id: account.id,
      updated_at:           now,
    });

    logger.info('CRM: lead converted', { leadId: lead.id, accountId: account.id, contactId: contact.id, dealId: deal.id });
    res.status(201).json({ account, contact, deal });
  } catch (err) {
    logger.error('CRM: convert lead error', { error: err.message });
    res.status(500).json({ error: 'Failed to convert lead' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEALS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/deals', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const filter  = { tenant_id: req.user.tenantId };
    if (req.query.stage_id)    filter.stage_id    = req.query.stage_id;
    if (req.query.account_id)  filter.account_id  = req.query.account_id;

    const deals = await adapter.findMany(COL_DEALS, filter);
    deals.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json({ deals, total: deals.length });
  } catch (err) {
    logger.error('CRM: list deals error', { error: err.message });
    res.status(500).json({ error: 'Failed to list deals' });
  }
});

router.post('/deals', async (req, res) => {
  try {
    const { title, account_id, contact_id, stage_id, value, currency, probability, close_date, assigned_rep_id, notes } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const adapter  = await getAdapter();
    const tenantId = req.user.tenantId;

    // Resolve stage name
    let stageName = 'Prospecting';
    if (stage_id) {
      const stage = await adapter.findOne(COL_PIPELINE_STAGES, { id: stage_id, tenant_id: tenantId });
      if (!stage) return res.status(400).json({ error: 'stage_id references unknown pipeline stage' });
      stageName = stage.name;
    }

    const now  = new Date();
    const deal = {
      id:               randomUUID(),
      tenant_id:        tenantId,
      title,
      account_id:       account_id ?? null,
      contact_id:       contact_id ?? null,
      stage_id:         stage_id   ?? null,
      stage_name:       stageName,
      value:            value      ?? 0,
      currency:         currency   ?? 'USD',
      probability:      probability ?? 10,
      close_date:       close_date ?? null,
      assigned_rep_id:  assigned_rep_id ?? null,
      notes:            notes ?? null,
      created_by:       req.user.userId,
      created_at:       now,
      updated_at:       now,
    };
    await adapter.insertOne(COL_DEALS, deal);
    logger.info('CRM: deal created', { dealId: deal.id, tenantId });
    res.status(201).json({ deal });
  } catch (err) {
    logger.error('CRM: create deal error', { error: err.message });
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

router.get('/deals/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const deal    = await adapter.findOne(COL_DEALS, { id: req.params.id, tenant_id: req.user.tenantId });
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    res.json({ deal });
  } catch (err) {
    logger.error('CRM: get deal error', { error: err.message });
    res.status(500).json({ error: 'Failed to get deal' });
  }
});

router.put('/deals/:id', async (req, res) => {
  try {
    const adapter  = await getAdapter();
    const tenantId = req.user.tenantId;
    const deal     = await adapter.findOne(COL_DEALS, { id: req.params.id, tenant_id: tenantId });
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    const allowed = ['title', 'account_id', 'contact_id', 'stage_id', 'value', 'currency', 'probability', 'close_date', 'assigned_rep_id', 'notes'];
    const updates = {};
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }

    // If stage changed, resolve stage name
    if (updates.stage_id && updates.stage_id !== deal.stage_id) {
      const stage = await adapter.findOne(COL_PIPELINE_STAGES, { id: updates.stage_id, tenant_id: tenantId });
      if (!stage) return res.status(400).json({ error: 'stage_id references unknown pipeline stage' });
      updates.stage_name = stage.name;
    }

    updates.updated_at = new Date();
    await adapter.updateOne(COL_DEALS, { id: req.params.id, tenant_id: tenantId }, updates);
    res.json({ deal: { ...deal, ...updates } });
  } catch (err) {
    logger.error('CRM: update deal error', { error: err.message });
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

router.delete('/deals/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const deal    = await adapter.findOne(COL_DEALS, { id: req.params.id, tenant_id: req.user.tenantId });
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    await adapter.deleteOne(COL_DEALS, { id: req.params.id, tenant_id: req.user.tenantId });
    res.json({ deleted: true });
  } catch (err) {
    logger.error('CRM: delete deal error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete deal' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE STAGES
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/pipeline-stages', async (req, res) => {
  try {
    const adapter  = await getAdapter();
    const tenantId = req.user.tenantId;
    const stages   = await ensureDefaultStages(adapter, tenantId);
    stages.sort((a, b) => a.position - b.position);
    res.json({ stages, total: stages.length });
  } catch (err) {
    logger.error('CRM: list pipeline stages error', { error: err.message });
    res.status(500).json({ error: 'Failed to list pipeline stages' });
  }
});

router.post('/pipeline-stages', async (req, res) => {
  try {
    const { name, colour } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const adapter  = await getAdapter();
    const tenantId = req.user.tenantId;

    const existing = await adapter.findMany(COL_PIPELINE_STAGES, { tenant_id: tenantId });
    const maxPos   = existing.reduce((m, s) => Math.max(m, s.position || 0), 0);

    const now   = new Date();
    const stage = {
      id:         randomUUID(),
      tenant_id:  tenantId,
      name,
      position:   maxPos + 1,
      colour:     colour ?? '#6366f1',
      is_default: false,
      created_at: now,
      updated_at: now,
    };
    await adapter.insertOne(COL_PIPELINE_STAGES, stage);
    res.status(201).json({ stage });
  } catch (err) {
    logger.error('CRM: create pipeline stage error', { error: err.message });
    res.status(500).json({ error: 'Failed to create pipeline stage' });
  }
});

router.put('/pipeline-stages/reorder', async (req, res) => {
  try {
    const { positions } = req.body; // [{ id, position }]
    if (!Array.isArray(positions)) return res.status(400).json({ error: 'positions must be an array' });

    const adapter  = await getAdapter();
    const tenantId = req.user.tenantId;
    const now      = new Date();

    await Promise.all(
      positions.map(({ id, position }) =>
        adapter.updateOne(COL_PIPELINE_STAGES, { id, tenant_id: tenantId }, { position, updated_at: now }),
      ),
    );
    res.json({ reordered: positions.length });
  } catch (err) {
    logger.error('CRM: reorder pipeline stages error', { error: err.message });
    res.status(500).json({ error: 'Failed to reorder pipeline stages' });
  }
});

router.put('/pipeline-stages/:id', async (req, res) => {
  try {
    const adapter  = await getAdapter();
    const tenantId = req.user.tenantId;
    const stage    = await adapter.findOne(COL_PIPELINE_STAGES, { id: req.params.id, tenant_id: tenantId });
    if (!stage) return res.status(404).json({ error: 'Pipeline stage not found' });

    const allowed = ['name', 'colour', 'position'];
    const updates = {};
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }
    updates.updated_at = new Date();

    // If name changed, sync all deals referencing this stage
    if (updates.name && updates.name !== stage.name) {
      const deals = await adapter.findMany(COL_DEALS, { tenant_id: tenantId, stage_id: stage.id });
      await Promise.all(
        deals.map(d => adapter.updateOne(COL_DEALS, { id: d.id, tenant_id: tenantId }, { stage_name: updates.name, updated_at: new Date() })),
      );
    }

    await adapter.updateOne(COL_PIPELINE_STAGES, { id: req.params.id, tenant_id: tenantId }, updates);
    res.json({ stage: { ...stage, ...updates } });
  } catch (err) {
    logger.error('CRM: update pipeline stage error', { error: err.message });
    res.status(500).json({ error: 'Failed to update pipeline stage' });
  }
});

router.delete('/pipeline-stages/:id', async (req, res) => {
  try {
    const adapter  = await getAdapter();
    const tenantId = req.user.tenantId;
    const stage    = await adapter.findOne(COL_PIPELINE_STAGES, { id: req.params.id, tenant_id: tenantId });
    if (!stage) return res.status(404).json({ error: 'Pipeline stage not found' });

    // Reject if deals exist in this stage
    const deals = await adapter.findMany(COL_DEALS, { tenant_id: tenantId, stage_id: stage.id });
    if (deals.length > 0) {
      return res.status(409).json({ error: `Cannot delete stage — ${deals.length} deal(s) are in this stage. Move them first.` });
    }

    await adapter.deleteOne(COL_PIPELINE_STAGES, { id: req.params.id, tenant_id: tenantId });
    res.json({ deleted: true });
  } catch (err) {
    logger.error('CRM: delete pipeline stage error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete pipeline stage' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITIES
// ═══════════════════════════════════════════════════════════════════════════════

const COL_ACTIVITIES = 'crm_activities';
const COL_SEQUENCES  = 'crm_sequences';

router.get('/activities', async (req, res) => {
  try {
    const adapter  = await getAdapter();
    const tenantId = req.user.tenantId;
    const filter   = { tenant_id: tenantId };
    if (req.query.deal_id)    filter.deal_id    = req.query.deal_id;
    if (req.query.contact_id) filter.contact_id = req.query.contact_id;
    const activities = await adapter.findMany(COL_ACTIVITIES, filter);
    res.json({ activities, total: activities.length });
  } catch (err) {
    logger.error('CRM: list activities error', { error: err.message });
    res.status(500).json({ error: 'Failed to list activities' });
  }
});

router.post('/activities', async (req, res) => {
  try {
    const { type, subject, body, deal_id, contact_id, due_date, completed } = req.body;
    if (!subject) return res.status(400).json({ error: 'subject is required' });
    const adapter  = await getAdapter();
    const activity = {
      id: randomUUID(), tenant_id: req.user.tenantId, type: type || 'note', subject,
      body: body || null, deal_id: deal_id || null, contact_id: contact_id || null,
      due_date: due_date || null, completed: completed || false,
      created_by: req.user.userId, created_at: new Date(),
    };
    await adapter.insertOne(COL_ACTIVITIES, activity);
    res.status(201).json({ activity });
  } catch (err) {
    logger.error('CRM: create activity error', { error: err.message });
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

router.delete('/activities/:id', async (req, res) => {
  try {
    const adapter  = await getAdapter();
    const activity = await adapter.findOne(COL_ACTIVITIES, { id: req.params.id, tenant_id: req.user.tenantId });
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    await adapter.deleteOne(COL_ACTIVITIES, { id: req.params.id, tenant_id: req.user.tenantId });
    res.json({ deleted: true });
  } catch (err) {
    logger.error('CRM: delete activity error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const adapter  = await getAdapter();
    const tenantId = req.user.tenantId;
    const deals    = await adapter.findMany(COL_DEALS, { tenant_id: tenantId });
    const total_deals = deals.length;
    const total_value = deals.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const won_deals   = deals.filter(d => JSON.stringify(d).toLowerCase().includes('won')).length;
    const lost_deals  = deals.filter(d => {
      const s = (d.stage || d.stage_name || '').toLowerCase();
      return s.includes('lost');
    }).length;
    const avg_deal_size    = total_deals > 0 ? total_value / total_deals : 0;
    const conversion_rate  = total_deals > 0 ? (won_deals / total_deals) * 100 : 0;
    res.json({ total_deals, total_value, won_deals, lost_deals, avg_deal_size, conversion_rate });
  } catch (err) {
    logger.error('CRM: stats error', { error: err.message });
    res.status(500).json({ error: 'Failed to get CRM stats' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEQUENCES
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/sequences', async (req, res) => {
  try {
    const adapter   = await getAdapter();
    const sequences = await adapter.findMany(COL_SEQUENCES, { tenant_id: req.user.tenantId });
    res.json({ sequences, total: sequences.length });
  } catch (err) {
    logger.error('CRM: list sequences error', { error: err.message });
    res.status(500).json({ error: 'Failed to list sequences' });
  }
});

router.post('/sequences', async (req, res) => {
  try {
    const { name, steps, status } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const adapter  = await getAdapter();
    const sequence = {
      id: randomUUID(), tenant_id: req.user.tenantId, name, steps: steps || [],
      status: status || 'active', enrolled_count: 0,
      created_by: req.user.userId, created_at: new Date(),
    };
    await adapter.insertOne(COL_SEQUENCES, sequence);
    res.status(201).json({ sequence });
  } catch (err) {
    logger.error('CRM: create sequence error', { error: err.message });
    res.status(500).json({ error: 'Failed to create sequence' });
  }
});

router.put('/sequences/:id', async (req, res) => {
  try {
    const adapter  = await getAdapter();
    const sequence = await adapter.findOne(COL_SEQUENCES, { id: req.params.id, tenant_id: req.user.tenantId });
    if (!sequence) return res.status(404).json({ error: 'Sequence not found' });
    const allowed = ['name', 'steps', 'status'];
    const updates = {};
    for (const key of allowed) { if (key in req.body) updates[key] = req.body[key]; }
    await adapter.updateOne(COL_SEQUENCES, { id: req.params.id, tenant_id: req.user.tenantId }, updates);
    res.json({ sequence: { ...sequence, ...updates } });
  } catch (err) {
    logger.error('CRM: update sequence error', { error: err.message });
    res.status(500).json({ error: 'Failed to update sequence' });
  }
});

router.delete('/sequences/:id', async (req, res) => {
  try {
    const adapter  = await getAdapter();
    const sequence = await adapter.findOne(COL_SEQUENCES, { id: req.params.id, tenant_id: req.user.tenantId });
    if (!sequence) return res.status(404).json({ error: 'Sequence not found' });
    await adapter.deleteOne(COL_SEQUENCES, { id: req.params.id, tenant_id: req.user.tenantId });
    res.json({ deleted: true });
  } catch (err) {
    logger.error('CRM: delete sequence error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete sequence' });
  }
});

router.post('/sequences/:id/enroll', async (req, res) => {
  try {
    const { contact_id } = req.body;
    if (!contact_id) return res.status(400).json({ error: 'contact_id is required' });
    const adapter  = await getAdapter();
    const tenantId = req.user.tenantId;
    const sequence = await adapter.findOne(COL_SEQUENCES, { id: req.params.id, tenant_id: tenantId });
    if (!sequence) return res.status(404).json({ error: 'Sequence not found' });
    await adapter.updateOne(COL_SEQUENCES, { id: req.params.id, tenant_id: tenantId }, {
      enrolled_count: (sequence.enrolled_count || 0) + 1,
    });
    const firstActivity = {
      id: randomUUID(), tenant_id: tenantId, type: 'email',
      subject: 'Sequence: ' + sequence.name + ' Step 1',
      contact_id, deal_id: null, body: null, due_date: null, completed: false,
      created_by: req.user.userId, created_at: new Date(),
    };
    await adapter.insertOne(COL_ACTIVITIES, firstActivity);
    res.json({ enrolled: true, activity: firstActivity });
  } catch (err) {
    logger.error('CRM: enroll sequence error', { error: err.message });
    res.status(500).json({ error: 'Failed to enroll in sequence' });
  }
});

export default router;
