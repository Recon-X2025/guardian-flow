/**
 * @file server/services/connectors/netsuite.js
 * @description NetSuiteConnector — syncs data with NetSuite via the REST API.
 *
 * Supported entities (inbound sync)
 * ----------------------------------
 * - vendors          → /vendor
 * - customers        → /customer
 * - invoices         → /invoice
 * - purchase_orders  → /purchaseOrder
 *
 * Credentials (stored in connector_configs.credentials)
 * -------------------------------------------------------
 * {
 *   account_id:      "1234567",
 *   consumer_key:    "...",
 *   consumer_secret: "...",
 *   token_id:        "...",
 *   token_secret:    "..."
 * }
 *
 * Authentication uses NetSuite TBA (Token-Based Authentication) which signs
 * each request with HMAC-SHA256.  When credentials are absent the connector
 * falls back to stub mode so the connector framework works in development.
 */

import { BaseConnector } from './base.js';
import { insertOne, updateOne, findOne } from '../../db/query.js';
import { randomUUID, createHmac } from 'crypto';
import logger from '../../utils/logger.js';

const ENTITY_CONFIG = {
  vendors: {
    recordType: 'vendor',
    localCollection: 'netsuite_vendors',
    keyField: 'id',
  },
  customers: {
    recordType: 'customer',
    localCollection: 'netsuite_customers',
    keyField: 'id',
  },
  invoices: {
    recordType: 'invoice',
    localCollection: 'netsuite_invoices',
    keyField: 'id',
  },
  purchase_orders: {
    recordType: 'purchaseOrder',
    localCollection: 'netsuite_purchase_orders',
    keyField: 'id',
  },
};

export class NetSuiteConnector extends BaseConnector {
  constructor(config) {
    super(config);
    this.accountId      = config.credentials?.account_id      ?? null;
    this.consumerKey    = config.credentials?.consumer_key    ?? null;
    this.consumerSecret = config.credentials?.consumer_secret ?? null;
    this.tokenId        = config.credentials?.token_id        ?? null;
    this.tokenSecret    = config.credentials?.token_secret    ?? null;
  }

  /** Base REST URL for this NetSuite account. */
  get _baseUrl() {
    return `https://${this.accountId}.suitetalk.api.netsuite.com/services/rest/record/v1`;
  }

  /**
   * Build NetSuite TBA Authorization header (OAuth 1.0a).
   * https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4393523616.html
   */
  _tbaHeader(method, url) {
    const timestamp   = Math.floor(Date.now() / 1000).toString();
    const nonce       = randomUUID().replace(/-/g, '');
    const realm       = this.accountId?.replace(/-/g, '_').toUpperCase() ?? '';

    const baseParams = [
      ['oauth_consumer_key',     this.consumerKey],
      ['oauth_nonce',            nonce],
      ['oauth_signature_method', 'HMAC-SHA256'],
      ['oauth_timestamp',        timestamp],
      ['oauth_token',            this.tokenId],
      ['oauth_version',          '1.0'],
    ].sort((a, b) => a[0].localeCompare(b[0]));

    const paramStr = baseParams.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    const baseStr  = [method.toUpperCase(), encodeURIComponent(url), encodeURIComponent(paramStr)].join('&');
    const sigKey   = `${encodeURIComponent(this.consumerSecret)}&${encodeURIComponent(this.tokenSecret)}`;
    const signature = createHmac('sha256', sigKey).update(baseStr).digest('base64');

    const authParts = [
      `realm="${realm}"`,
      ...baseParams.map(([k, v]) => `${k}="${encodeURIComponent(v)}"`),
      `oauth_signature="${encodeURIComponent(signature)}"`,
    ];

    return { Authorization: `OAuth ${authParts.join(', ')}` };
  }

  /**
   * Fetch a page of records using NetSuite REST API cursor-based pagination.
   * @returns {{ records: object[], nextPageUrl: string|null }}
   */
  async _fetchPage(url) {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...this._tbaHeader('GET', url),
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`NetSuite API HTTP ${response.status}: ${body.slice(0, 200)}`);
    }
    const json = await response.json();
    // NetSuite returns { items: [...], links: [{ rel: "next", href: "..." }] }
    const records     = json.items ?? [];
    const nextLink    = (json.links ?? []).find(l => l.rel === 'next');
    const nextPageUrl = nextLink?.href ?? null;
    return { records, nextPageUrl };
  }

  async sync(direction, entity, options = {}) {
    const cfg = ENTITY_CONFIG[entity];
    if (!cfg) {
      return { status: 'skipped', reason: `Unsupported entity: ${entity}` };
    }

    logger.info('NetSuiteConnector: sync started', {
      direction, entity, tenantId: this.tenantId, accountId: this.accountId,
    });

    // Stub mode when credentials are not configured
    if (!this.accountId || !this.consumerKey) {
      logger.warn('NetSuiteConnector: credentials not configured, running in stub mode', { entity });
      await this._writeSyncLog(entity, 'success', { records_processed: 0, mode: 'stub' });
      return { connector: 'netsuite', direction, entity, records_processed: 0, status: 'success', mode: 'stub' };
    }

    if (direction !== 'inbound') {
      return { status: 'skipped', reason: 'Only inbound sync is supported for NetSuite' };
    }

    let totalProcessed = 0;
    let pageUrl = `${this._baseUrl}/${cfg.recordType}?limit=${options.pageSize || 200}`;

    try {
      while (pageUrl) {
        const { records, nextPageUrl } = await this._fetchPage(pageUrl);
        if (records.length === 0) break;

        for (const record of records) {
          const externalId = String(record[cfg.keyField] ?? record.id ?? '');
          if (!externalId) continue;

          const existing = await findOne(cfg.localCollection, {
            tenant_id: this.tenantId,
            external_id: externalId,
          }).catch(() => null);

          const doc = {
            tenant_id: this.tenantId,
            external_id: externalId,
            connector_id: this.connectorId,
            data: record,
            synced_at: new Date().toISOString(),
          };

          if (existing) {
            await updateOne(cfg.localCollection, { id: existing.id }, doc).catch(e =>
              logger.warn('NetSuiteConnector: upsert failed', { error: e.message, externalId }),
            );
          } else {
            await insertOne(cfg.localCollection, { id: randomUUID(), ...doc }).catch(e =>
              logger.warn('NetSuiteConnector: insert failed', { error: e.message, externalId }),
            );
          }
          totalProcessed++;
        }

        pageUrl = nextPageUrl;
      }

      await this._writeSyncLog(entity, 'success', { records_processed: totalProcessed });
      return { connector: 'netsuite', direction, entity, records_processed: totalProcessed, status: 'success' };
    } catch (err) {
      logger.error('NetSuiteConnector: sync error', { entity, error: err.message });
      await this._writeSyncLog(entity, 'error', { error: err.message, records_processed: totalProcessed });
      return { connector: 'netsuite', direction, entity, records_processed: totalProcessed, status: 'error', error: err.message };
    }
  }

  async webhookReceive(payload) {
    logger.info('NetSuiteConnector: webhookReceive', {
      tenantId: this.tenantId,
      type: payload?.type,
      recordType: payload?.recordType,
    });

    // NetSuite SuiteScript can POST change events; trigger incremental sync
    const typeMap = {
      vendor:        'vendors',
      customer:      'customers',
      invoice:       'invoices',
      purchaseOrder: 'purchase_orders',
    };
    const entity = typeMap[payload?.recordType];
    if (entity) {
      this.sync('inbound', entity).catch(e =>
        logger.warn('NetSuiteConnector: webhook-triggered sync error', { error: e.message }),
      );
    }

    return { received: true, connector: 'netsuite', entity: entity ?? 'unknown' };
  }
}
