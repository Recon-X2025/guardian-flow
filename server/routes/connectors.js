/**
 * @file server/routes/connectors.js
 * @description ERP/CRM Connector Management API — Sprint 15.
 *
 * Routes
 * ------
 * GET    /api/connectors                    — list configured connectors
 * POST   /api/connectors                    — configure a connector
 * POST   /api/connectors/:id/sync           — trigger manual sync
 * GET    /api/connectors/:id/sync-log       — get sync history
 * POST   /api/connectors/:type/webhook      — receive inbound webhooks
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import { getAdapter } from '../db/factory.js';
import { SalesforceConnector } from '../services/connectors/salesforce.js';
import { QuickBooksConnector } from '../services/connectors/quickbooks.js';
import { SAPConnector } from '../services/connectors/sap.js';
import { NetSuiteConnector } from '../services/connectors/netsuite.js';
import logger from '../utils/logger.js';

const router = express.Router();
const CONFIGS_COL  = 'connector_configs';
const SYNC_LOG_COL = 'connector_sync_log';

const CONNECTOR_TYPES = ['salesforce', 'quickbooks', 'sap', 'netsuite', 'xero'];

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

function buildConnector(config) {
  switch (config.connector_type) {
    case 'salesforce': return new SalesforceConnector(config);
    case 'quickbooks': return new QuickBooksConnector(config);
    case 'sap':        return new SAPConnector(config);
    case 'netsuite':   return new NetSuiteConnector(config);
    default:           return null;
  }
}

// ── GET /api/connectors ───────────────────────────────────────────────────────

router.get('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const configs  = await adapter.findMany(CONFIGS_COL, { tenant_id: tenantId });
    res.json({ connectors: configs });
  } catch (error) {
    logger.error('Connectors: list error', { error: error.message });
    res.status(500).json({ error: 'Failed to list connectors' });
  }
});

// ── POST /api/connectors ──────────────────────────────────────────────────────

router.post('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { connector_type, credentials, field_mappings } = req.body;

    if (!connector_type) return res.status(400).json({ error: 'connector_type is required' });
    if (!CONNECTOR_TYPES.includes(connector_type)) {
      return res.status(400).json({ error: `connector_type must be one of: ${CONNECTOR_TYPES.join(', ')}` });
    }

    const adapter = await getAdapter();
    const existing = await adapter.findOne(CONFIGS_COL, { tenant_id: tenantId, connector_type });
    if (existing) return res.status(409).json({ error: 'Connector of this type already configured' });

    const config = {
      id:             randomUUID(),
      tenant_id:      tenantId,
      connector_type,
      credentials:    credentials    || {},
      field_mappings: field_mappings || {},
      status:         'configured',
      created_at:     new Date().toISOString(),
      updated_at:     new Date().toISOString(),
    };

    await adapter.insertOne(CONFIGS_COL, config);
    res.status(201).json({ connector: config });
  } catch (error) {
    logger.error('Connectors: create error', { error: error.message });
    res.status(500).json({ error: 'Failed to configure connector' });
  }
});

// ── POST /api/connectors/:id/sync ─────────────────────────────────────────────

router.post('/:id/sync', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const config   = await adapter.findOne(CONFIGS_COL, { id: req.params.id, tenant_id: tenantId });

    if (!config) return res.status(404).json({ error: 'Connector not found' });

    const { direction = 'inbound', entity } = req.body;
    if (!entity) return res.status(400).json({ error: 'entity is required' });

    const connector = buildConnector(config);
    if (!connector) {
      return res.status(400).json({ error: `No connector implementation for type: ${config.connector_type}` });
    }

    const result = await connector.sync(direction, entity, req.body.options || {});
    res.json({ result });
  } catch (error) {
    logger.error('Connectors: sync error', { error: error.message });
    res.status(500).json({ error: 'Failed to trigger sync' });
  }
});

// ── GET /api/connectors/:id/sync-log ─────────────────────────────────────────

router.get('/:id/sync-log', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const config   = await adapter.findOne(CONFIGS_COL, { id: req.params.id, tenant_id: tenantId });

    if (!config) return res.status(404).json({ error: 'Connector not found' });

    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 200);
    const skip  = Math.max(parseInt(req.query.skip || '0', 10), 0);

    const logs = await adapter.findMany(
      SYNC_LOG_COL,
      { tenant_id: tenantId, connector_id: req.params.id },
      { limit, skip },
    );

    res.json({ logs, limit, skip });
  } catch (error) {
    logger.error('Connectors: sync-log error', { error: error.message });
    res.status(500).json({ error: 'Failed to get sync log' });
  }
});

// ── POST /api/connectors/:type/webhook ───────────────────────────────────────

router.post('/:type/webhook', async (req, res) => {
  try {
    if (!CONNECTOR_TYPES.includes(req.params.type)) {
      return res.status(400).json({ error: 'Unknown connector type' });
    }

    // Webhook receipts are tenant-resolved via payload or header
    const tenantId = req.headers['x-tenant-id'] || req.body?.tenant_id;
    if (!tenantId) return res.status(400).json({ error: 'x-tenant-id header or tenant_id body field required' });

    const adapter = await getAdapter();
    const config  = await adapter.findOne(CONFIGS_COL, {
      tenant_id:      tenantId,
      connector_type: req.params.type,
    });

    if (!config) {
      logger.warn('Connectors: webhook for unconfigured connector', { type: req.params.type, tenantId });
      return res.status(200).json({ received: true }); // return 200 to prevent retries
    }

    const connector = buildConnector(config);
    if (connector) {
      await connector.webhookReceive(req.body);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Connectors: webhook error', { error: error.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
