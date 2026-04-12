/**
 * CRM Email/Calendar Sync Routes
 *
 * POST   /api/crm-calendar/connect            — store OAuth2 provider token
 * DELETE /api/crm-calendar/connect/:provider  — revoke connection
 * GET    /api/crm-calendar/connections         — list active connections
 * POST   /api/crm-calendar/sync/calendar       — pull calendar events → CRM activities
 * POST   /api/crm-calendar/sync/email          — log email activity against CRM contacts
 * GET    /api/crm-calendar/activities          — list synced CRM activities (?contact_id=&account_id=)
 * GET    /api/crm-calendar/events              — list upcoming calendar events
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

// ── OAuth Connection Store ────────────────────────────────────────────────────

/**
 * POST /api/crm-calendar/connect
 * Body: { provider: 'google'|'microsoft', access_token, refresh_token, expires_at, email }
 * Stores the OAuth token for the user's tenant. In production, access_token should be
 * encrypted at rest. Here we store it in the db_adapter with a clear marker.
 */
router.post('/connect', async (req, res) => {
  try {
    const { provider, access_token, refresh_token, expires_at, email } = req.body;
    if (!provider || !access_token) {
      return res.status(400).json({ error: 'provider and access_token are required' });
    }
    if (!['google', 'microsoft'].includes(provider)) {
      return res.status(400).json({ error: 'provider must be google or microsoft' });
    }

    const adapter = await getAdapter();
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    // Upsert — one connection per provider per user
    const existing = await adapter.findOne('crm_calendar_connections', {
      tenant_id: tenantId, user_id: userId, provider,
    });

    const record = {
      id: existing?.id ?? randomUUID(),
      tenant_id: tenantId,
      user_id: userId,
      provider,
      account_email: email ?? null,
      access_token,
      refresh_token: refresh_token ?? null,
      expires_at: expires_at ? new Date(expires_at) : null,
      connected_at: existing?.connected_at ?? new Date(),
      last_synced_at: existing?.last_synced_at ?? null,
      status: 'active',
    };

    if (existing) {
      await adapter.updateOne('crm_calendar_connections',
        { id: existing.id, tenant_id: tenantId },
        { access_token, refresh_token: record.refresh_token, expires_at: record.expires_at, status: 'active' },
      );
    } else {
      await adapter.insertOne('crm_calendar_connections', record);
    }

    logger.info('CRM calendar: connected', { provider, userId, tenantId });
    res.status(201).json({ connection: { ...record, access_token: '[redacted]', refresh_token: '[redacted]' } });
  } catch (err) {
    logger.error('CRM calendar: connect error', { error: err.message });
    res.status(500).json({ error: 'Failed to connect calendar' });
  }
});

router.delete('/connect/:provider', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const { provider } = req.params;
    const conn = await adapter.findOne('crm_calendar_connections', {
      tenant_id: req.user.tenantId, user_id: req.user.userId, provider,
    });
    if (!conn) return res.status(404).json({ error: 'Connection not found' });
    await adapter.updateOne('crm_calendar_connections',
      { id: conn.id, tenant_id: req.user.tenantId },
      { status: 'revoked', access_token: null, refresh_token: null },
    );
    res.json({ revoked: true });
  } catch (err) {
    logger.error('CRM calendar: revoke error', { error: err.message });
    res.status(500).json({ error: 'Failed to revoke connection' });
  }
});

router.get('/connections', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const conns = await adapter.findMany('crm_calendar_connections', {
      tenant_id: req.user.tenantId, user_id: req.user.userId,
    });
    const safe = conns.map(c => ({ ...c, access_token: '[redacted]', refresh_token: '[redacted]' }));
    res.json({ connections: safe, total: safe.length });
  } catch (err) {
    logger.error('CRM calendar: list connections error', { error: err.message });
    res.status(500).json({ error: 'Failed to list connections' });
  }
});

// ── Calendar Sync ─────────────────────────────────────────────────────────────

/**
 * POST /api/crm-calendar/sync/calendar
 * Body: { provider: 'google'|'microsoft', events: [...] }
 *
 * Accepts a batch of calendar events from the client (after the client completes
 * the OAuth flow and fetches events from Google/Microsoft). Converts them into
 * CRM activity records linked to matching contacts by email.
 */
router.post('/sync/calendar', async (req, res) => {
  try {
    const { provider, events } = req.body;
    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'events array is required' });
    }

    const adapter = await getAdapter();
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    // Verify the connection exists
    const conn = await adapter.findOne('crm_calendar_connections', {
      tenant_id: tenantId, user_id: userId, provider: provider ?? 'google', status: 'active',
    });
    if (!conn) {
      return res.status(400).json({ error: `No active ${provider} connection found. Please connect first.` });
    }

    const contacts = await adapter.findMany('crm_contacts', { tenant_id: tenantId });
    const contactsByEmail = {};
    for (const c of contacts) {
      if (c.email) contactsByEmail[c.email.toLowerCase()] = c;
    }

    const created = [];
    for (const ev of events) {
      // Map attendee emails → contact IDs
      const attendees = (ev.attendees ?? []).map(a => a.email ?? a).filter(Boolean);
      const matchedContacts = attendees
        .map(e => contactsByEmail[e.toLowerCase()])
        .filter(Boolean)
        .map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name}`.trim(), email: c.email }));

      const activity = {
        id: randomUUID(),
        tenant_id: tenantId,
        user_id: userId,
        source: provider ?? 'calendar',
        activity_type: 'meeting',
        subject: ev.summary ?? ev.title ?? 'Calendar Event',
        description: ev.description ?? null,
        start_time: ev.start ? new Date(ev.start.dateTime ?? ev.start.date ?? ev.start) : null,
        end_time: ev.end ? new Date(ev.end.dateTime ?? ev.end.date ?? ev.end) : null,
        external_id: ev.id ?? null,
        contact_ids: matchedContacts.map(c => c.id),
        contacts_matched: matchedContacts,
        attendees,
        location: ev.location ?? null,
        synced_at: new Date(),
      };

      await adapter.insertOne('crm_activities', activity);
      created.push(activity);
    }

    // Update last_synced_at on connection
    await adapter.updateOne('crm_calendar_connections', { id: conn.id, tenant_id: tenantId }, { last_synced_at: new Date() });

    logger.info('CRM calendar: synced calendar events', { count: created.length, provider, tenantId });
    res.status(201).json({ synced: created.length, activities: created });
  } catch (err) {
    logger.error('CRM calendar: sync calendar error', { error: err.message });
    res.status(500).json({ error: 'Failed to sync calendar events' });
  }
});

/**
 * POST /api/crm-calendar/sync/email
 * Body: { provider: 'google'|'microsoft', emails: [...] }
 *
 * Accepts a batch of email metadata (from, to, subject, body_snippet, sent_at).
 * Creates CRM email activity records linked to matching contacts.
 */
router.post('/sync/email', async (req, res) => {
  try {
    const { provider, emails } = req.body;
    if (!Array.isArray(emails)) {
      return res.status(400).json({ error: 'emails array is required' });
    }

    const adapter = await getAdapter();
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    const conn = await adapter.findOne('crm_calendar_connections', {
      tenant_id: tenantId, user_id: userId, provider: provider ?? 'google', status: 'active',
    });
    if (!conn) {
      return res.status(400).json({ error: `No active ${provider} connection found. Please connect first.` });
    }

    const contacts = await adapter.findMany('crm_contacts', { tenant_id: tenantId });
    const contactsByEmail = {};
    for (const c of contacts) {
      if (c.email) contactsByEmail[c.email.toLowerCase()] = c;
    }

    const created = [];
    for (const em of emails) {
      // Resolve sender and recipient emails to CRM contacts
      const allEmails = [
        ...(Array.isArray(em.from) ? em.from : [em.from]),
        ...(Array.isArray(em.to) ? em.to : [em.to ?? []].flat()),
      ].filter(Boolean).map(e => (typeof e === 'string' ? e : e.email)).filter(Boolean);

      const matchedContacts = allEmails
        .map(e => contactsByEmail[e.toLowerCase()])
        .filter(Boolean)
        .filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i)
        .map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name}`.trim(), email: c.email }));

      // Also try to link to accounts
      const accountId = matchedContacts[0]
        ? (await adapter.findOne('crm_contacts', { id: matchedContacts[0].id, tenant_id: tenantId }))?.account_id ?? null
        : null;

      const activity = {
        id: randomUUID(),
        tenant_id: tenantId,
        user_id: userId,
        source: provider ?? 'email',
        activity_type: 'email',
        subject: em.subject ?? '(No subject)',
        description: em.body_snippet ?? em.snippet ?? null,
        start_time: em.sent_at ? new Date(em.sent_at) : new Date(),
        end_time: null,
        external_id: em.id ?? null,
        contact_ids: matchedContacts.map(c => c.id),
        contacts_matched: matchedContacts,
        account_id: accountId,
        direction: em.direction ?? 'inbound',
        synced_at: new Date(),
      };

      await adapter.insertOne('crm_activities', activity);
      created.push(activity);
    }

    await adapter.updateOne('crm_calendar_connections', { id: conn.id, tenant_id: tenantId }, { last_synced_at: new Date() });

    logger.info('CRM calendar: synced emails', { count: created.length, provider, tenantId });
    res.status(201).json({ synced: created.length, activities: created });
  } catch (err) {
    logger.error('CRM calendar: sync email error', { error: err.message });
    res.status(500).json({ error: 'Failed to sync email activities' });
  }
});

// ── Activity & Event Queries ──────────────────────────────────────────────────

router.get('/activities', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const tenantId = req.user.tenantId;
    const { contact_id, account_id, activity_type, limit: rawLimit = '100' } = req.query;
    const limit = Math.min(parseInt(rawLimit, 10) || 100, 500);

    const filter = { tenant_id: tenantId };
    if (activity_type) filter.activity_type = activity_type;

    let activities = await adapter.findMany('crm_activities', filter, { limit, sort: { start_time: -1 } });

    // Filter by contact/account if provided (post-query, since adapter may not support array field queries)
    if (contact_id) {
      activities = activities.filter(a => Array.isArray(a.contact_ids) && a.contact_ids.includes(contact_id));
    }
    if (account_id) {
      activities = activities.filter(a => a.account_id === account_id);
    }

    res.json({ activities, total: activities.length });
  } catch (err) {
    logger.error('CRM calendar: list activities error', { error: err.message });
    res.status(500).json({ error: 'Failed to list activities' });
  }
});

router.get('/events', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const tenantId = req.user.tenantId;
    const { days = '7', limit: rawLimit = '50' } = req.query;
    const limit = Math.min(parseInt(rawLimit, 10) || 50, 200);
    const from = new Date();
    const to = new Date(Date.now() + parseInt(days, 10) * 86400_000);

    const activities = await adapter.findMany('crm_activities', {
      tenant_id: tenantId, activity_type: 'meeting',
    }, { limit, sort: { start_time: 1 } });

    const upcoming = activities.filter(a => {
      if (!a.start_time) return false;
      const t = new Date(a.start_time);
      return t >= from && t <= to;
    });

    res.json({ events: upcoming, total: upcoming.length });
  } catch (err) {
    logger.error('CRM calendar: list events error', { error: err.message });
    res.status(500).json({ error: 'Failed to list events' });
  }
});

export default router;
