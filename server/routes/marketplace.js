/**
 * Marketplace Extension Manager Routes
 *
 * Public / tenant-facing:
 * GET    /api/marketplace/extensions              — list approved extensions
 * GET    /api/marketplace/extensions/:id          — get single extension
 * POST   /api/marketplace/extensions/:id/install  — install extension for tenant
 * DELETE /api/marketplace/extensions/:id/install  — uninstall extension
 * GET    /api/marketplace/installed               — list installed extensions for tenant
 *
 * Extension developer:
 * POST   /api/marketplace/submit                  — submit new extension for review
 * GET    /api/marketplace/submissions             — list own submissions
 *
 * Admin (sys_admin):
 * GET    /api/marketplace/admin/queue             — review queue
 * PUT    /api/marketplace/admin/:id/approve       — approve extension
 * PUT    /api/marketplace/admin/:id/reject        — reject extension
 * GET    /api/marketplace/admin/stats             — marketplace stats
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

// ── Seed default extensions if none exist ────────────────────────────────────

async function ensureSeedExtensions(adapter) {
  const existing = await adapter.findMany('marketplace_extensions', { status: 'approved' });
  if (existing.length > 0) return;

  const seeds = [
    {
      id: randomUUID(), extension_name: 'Slack Integration',
      slug: 'slack-integration', version: '1.2.0',
      description: 'Send alerts, notifications and work order updates to Slack channels.',
      category: 'communication', developer_name: 'Guardian Apps',
      icon_url: null, rating: 4.8, install_count: 312, price_type: 'free',
      price_monthly: 0, status: 'approved', revenue_share_pct: 20,
      created_at: new Date(),
    },
    {
      id: randomUUID(), extension_name: 'QuickBooks Sync',
      slug: 'quickbooks-sync', version: '2.1.3',
      description: 'Bi-directional sync of invoices and purchase orders with QuickBooks Online.',
      category: 'finance', developer_name: 'FinBridge Labs',
      icon_url: null, rating: 4.6, install_count: 198, price_type: 'paid',
      price_monthly: 29, status: 'approved', revenue_share_pct: 30,
      created_at: new Date(),
    },
    {
      id: randomUUID(), extension_name: 'IoT Bridge',
      slug: 'iot-bridge', version: '1.0.5',
      description: 'Connect 50+ industrial sensor protocols (Modbus, OPC-UA, MQTT) to the IoT telemetry pipeline.',
      category: 'iot', developer_name: 'SensorWorks',
      icon_url: null, rating: 4.4, install_count: 87, price_type: 'paid',
      price_monthly: 49, status: 'approved', revenue_share_pct: 30,
      created_at: new Date(),
    },
    {
      id: randomUUID(), extension_name: 'SMS Notifications',
      slug: 'sms-notifications', version: '1.3.0',
      description: 'Send SMS alerts via Twilio for critical work order events and SLA breaches.',
      category: 'communication', developer_name: 'TwilioBridge',
      icon_url: null, rating: 4.7, install_count: 245, price_type: 'free',
      price_monthly: 0, status: 'approved', revenue_share_pct: 20,
      created_at: new Date(),
    },
    {
      id: randomUUID(), extension_name: 'Jira Connector',
      slug: 'jira-connector', version: '3.0.1',
      description: 'Sync work orders with Jira issues. Bi-directional status updates and comment mirroring.',
      category: 'project_management', developer_name: 'AtlassianBridge',
      icon_url: null, rating: 4.5, install_count: 156, price_type: 'paid',
      price_monthly: 19, status: 'approved', revenue_share_pct: 25,
      created_at: new Date(),
    },
  ];

  for (const seed of seeds) {
    try { await adapter.insertOne('marketplace_extensions', seed); } catch (_) { /* skip */ }
  }
}

// ── GET /extensions ──────────────────────────────────────────────────────────

router.get('/extensions', async (req, res) => {
  try {
    const adapter = await getAdapter();
    await ensureSeedExtensions(adapter);
    const { category, search, limit: rawLimit = '50' } = req.query;
    const limit = Math.min(parseInt(rawLimit, 10) || 50, 200);

    let extensions = await adapter.findMany('marketplace_extensions', { status: 'approved' }, { limit });

    if (category) extensions = extensions.filter(e => e.category === category);
    if (search) {
      const q = search.toLowerCase();
      extensions = extensions.filter(e =>
        e.extension_name?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.developer_name?.toLowerCase().includes(q),
      );
    }

    extensions.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    res.json({ extensions, total: extensions.length });
  } catch (err) {
    logger.error('Marketplace: list extensions error', { error: err.message });
    res.status(500).json({ error: 'Failed to list extensions' });
  }
});

router.get('/extensions/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const ext = await adapter.findOne('marketplace_extensions', { id: req.params.id });
    if (!ext) return res.status(404).json({ error: 'Extension not found' });
    res.json({ extension: ext });
  } catch (err) {
    logger.error('Marketplace: get extension error', { error: err.message });
    res.status(500).json({ error: 'Failed to get extension' });
  }
});

// ── Install / Uninstall ───────────────────────────────────────────────────────

router.post('/extensions/:id/install', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const tenantId = req.user.tenantId;
    const ext = await adapter.findOne('marketplace_extensions', { id: req.params.id, status: 'approved' });
    if (!ext) return res.status(404).json({ error: 'Extension not found or not approved' });

    const existing = await adapter.findOne('extension_installations', {
      extension_id: req.params.id, tenant_id: tenantId,
    });
    if (existing) return res.status(409).json({ error: 'Extension already installed', installation: existing });

    const installation = {
      id: randomUUID(),
      tenant_id: tenantId,
      extension_id: req.params.id,
      extension_name: ext.extension_name,
      version: ext.version,
      installed_by: req.user.userId,
      installed_at: new Date(),
      status: 'active',
      config: req.body.config ?? {},
    };

    await adapter.insertOne('extension_installations', installation);

    // Increment install_count
    const updated = { install_count: (ext.install_count ?? 0) + 1 };
    await adapter.updateOne('marketplace_extensions', { id: ext.id }, updated);

    // Log billing event if paid extension
    if (ext.price_type === 'paid' && ext.price_monthly > 0) {
      await adapter.insertOne('marketplace_transactions', {
        id: randomUUID(),
        tenant_id: tenantId,
        extension_id: ext.id,
        transaction_type: 'subscription_start',
        amount: ext.price_monthly,
        currency: 'USD',
        developer_share: +(ext.price_monthly * (1 - (ext.revenue_share_pct ?? 30) / 100)).toFixed(2),
        platform_share: +(ext.price_monthly * ((ext.revenue_share_pct ?? 30) / 100)).toFixed(2),
        created_at: new Date(),
      });
    }

    logger.info('Marketplace: extension installed', { extensionId: ext.id, tenantId });
    res.status(201).json({ installation, extension: ext });
  } catch (err) {
    logger.error('Marketplace: install error', { error: err.message });
    res.status(500).json({ error: 'Failed to install extension' });
  }
});

router.delete('/extensions/:id/install', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const tenantId = req.user.tenantId;
    const inst = await adapter.findOne('extension_installations', {
      extension_id: req.params.id, tenant_id: tenantId,
    });
    if (!inst) return res.status(404).json({ error: 'Installation not found' });
    await adapter.updateOne('extension_installations', { id: inst.id, tenant_id: tenantId }, { status: 'uninstalled', uninstalled_at: new Date() });
    res.json({ uninstalled: true });
  } catch (err) {
    logger.error('Marketplace: uninstall error', { error: err.message });
    res.status(500).json({ error: 'Failed to uninstall extension' });
  }
});

router.get('/installed', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const insts = await adapter.findMany('extension_installations', {
      tenant_id: req.user.tenantId, status: 'active',
    });
    res.json({ extensions: insts, total: insts.length });
  } catch (err) {
    logger.error('Marketplace: list installed error', { error: err.message });
    res.status(500).json({ error: 'Failed to list installed extensions' });
  }
});

// ── Extension Submission ──────────────────────────────────────────────────────

router.post('/submit', async (req, res) => {
  try {
    const { extension_name, version, description, category, repo_url, price_type, price_monthly } = req.body;
    if (!extension_name || !version || !description || !category) {
      return res.status(400).json({ error: 'extension_name, version, description, and category are required' });
    }

    const adapter = await getAdapter();
    const submission = {
      id: randomUUID(),
      extension_name,
      slug: extension_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      version,
      description,
      category,
      repo_url: repo_url || null,
      price_type: price_type || 'free',
      price_monthly: price_monthly || 0,
      developer_id: req.user.userId,
      developer_name: req.user.email ?? req.user.userId,
      tenant_id: req.user.tenantId,
      status: 'pending_review',
      rating: null,
      install_count: 0,
      revenue_share_pct: 30,
      submitted_at: new Date(),
      created_at: new Date(),
    };

    await adapter.insertOne('marketplace_extensions', submission);

    logger.info('Marketplace: extension submitted', { id: submission.id, extension_name, userId: req.user.userId });
    res.status(201).json({ submission });
  } catch (err) {
    logger.error('Marketplace: submit error', { error: err.message });
    res.status(500).json({ error: 'Failed to submit extension' });
  }
});

router.get('/submissions', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const submissions = await adapter.findMany('marketplace_extensions', { developer_id: req.user.userId });
    res.json({ submissions, total: submissions.length });
  } catch (err) {
    logger.error('Marketplace: list submissions error', { error: err.message });
    res.status(500).json({ error: 'Failed to list submissions' });
  }
});

// ── Admin Routes ──────────────────────────────────────────────────────────────

function isAdmin(req, res, next) {
  const roles = req.user?.user_roles ?? req.user?.roles ?? [];
  if (!roles.includes('sys_admin') && !roles.includes('admin') && !roles.includes('tenant_admin')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

router.get('/admin/queue', isAdmin, async (req, res) => {
  try {
    const adapter = await getAdapter();
    const queue = await adapter.findMany('marketplace_extensions', { status: 'pending_review' });
    res.json({ queue, total: queue.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list review queue' });
  }
});

router.put('/admin/:id/approve', isAdmin, async (req, res) => {
  try {
    const adapter = await getAdapter();
    const ext = await adapter.findOne('marketplace_extensions', { id: req.params.id });
    if (!ext) return res.status(404).json({ error: 'Extension not found' });
    await adapter.updateOne('marketplace_extensions', { id: req.params.id }, {
      status: 'approved', approved_by: req.user.userId, approved_at: new Date(),
    });
    res.json({ approved: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve extension' });
  }
});

router.put('/admin/:id/reject', isAdmin, async (req, res) => {
  try {
    const adapter = await getAdapter();
    const ext = await adapter.findOne('marketplace_extensions', { id: req.params.id });
    if (!ext) return res.status(404).json({ error: 'Extension not found' });
    await adapter.updateOne('marketplace_extensions', { id: req.params.id }, {
      status: 'rejected', rejected_reason: req.body.reason ?? null, rejected_by: req.user.userId,
    });
    res.json({ rejected: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject extension' });
  }
});

router.get('/admin/stats', isAdmin, async (req, res) => {
  try {
    const adapter = await getAdapter();
    const [all, insts, txns] = await Promise.all([
      adapter.findMany('marketplace_extensions', {}),
      adapter.findMany('extension_installations', {}),
      adapter.findMany('marketplace_transactions', {}),
    ]);

    const approved = all.filter(e => e.status === 'approved');
    const pending = all.filter(e => e.status === 'pending_review');
    const activeInsts = insts.filter(i => i.status === 'active');
    const revenue = txns.reduce((s, t) => s + (Number(t.platform_share) || 0), 0);

    res.json({
      total_extensions: approved.length,
      pending_review: pending.length,
      total_installations: activeInsts.length,
      total_platform_revenue: +revenue.toFixed(2),
      by_category: approved.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] ?? 0) + 1;
        return acc;
      }, {}),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
