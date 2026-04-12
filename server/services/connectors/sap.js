/**
 * @file server/services/connectors/sap.js
 * @description SAPConnector — syncs data with SAP S/4HANA via OData v4 REST APIs.
 *
 * Supported entities (inbound sync)
 * ----------------------------------
 * - gl_accounts       → API_GLACCOUNTS_SRV
 * - cost_centres      → API_COSTCENTER_SRV
 * - vendor_master     → API_BUSINESS_PARTNER
 * - purchase_orders   → API_PURCHASEORDER_PROCESS_SRV
 *
 * Credentials (stored in connector_configs.credentials)
 * -------------------------------------------------------
 * {
 *   base_url:   "https://<tenant>.s4hana.ondemand.com",
 *   system_id:  "PRD",
 *   client:     "100",
 *   username:   "...",
 *   password:   "..."
 * }
 *
 * When credentials are absent the connector falls back to stub logging so that
 * the connector framework continues to work in development environments.
 */

import { BaseConnector } from './base.js';
import { insertOne, updateOne, findOne } from '../../db/query.js';
import { randomUUID } from 'crypto';
import logger from '../../utils/logger.js';

// Map entity names → SAP OData service paths and entity sets
const ENTITY_CONFIG = {
  gl_accounts: {
    service: '/sap/opu/odata4/sap/api_glaccounts_srv/srvd_a2x/sap/glaccounts/0001',
    entitySet: 'GLAccount',
    localCollection: 'sap_gl_accounts',
    keyField: 'GLAccount',
  },
  cost_centres: {
    service: '/sap/opu/odata4/sap/api_costcenter_srv/srvd_a2x/sap/costcenter/0001',
    entitySet: 'CostCenter',
    localCollection: 'sap_cost_centres',
    keyField: 'CostCenter',
  },
  vendor_master: {
    service: '/sap/opu/odata4/sap/api_business_partner/srvd_a2x/sap/business_partner/0001',
    entitySet: 'A_Supplier',
    localCollection: 'sap_vendors',
    keyField: 'Supplier',
  },
  purchase_orders: {
    service: '/sap/opu/odata4/sap/api_purchaseorder_process_srv/srvd_a2x/sap/purchaseorder/0001',
    entitySet: 'PurchaseOrder',
    localCollection: 'sap_purchase_orders',
    keyField: 'PurchaseOrder',
  },
};

export class SAPConnector extends BaseConnector {
  constructor(config) {
    super(config);
    this.baseUrl  = config.credentials?.base_url  ?? null;
    this.username = config.credentials?.username   ?? null;
    this.password = config.credentials?.password   ?? null;
    this.systemId = config.credentials?.system_id  ?? null;
    this.client   = config.credentials?.client     ?? null;
  }

  /** Build Basic Auth header */
  _authHeader() {
    if (!this.username || !this.password) return {};
    const encoded = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    return { Authorization: `Basic ${encoded}` };
  }

  /**
   * Fetch a page of OData records.
   * @returns {Promise<object[]>}
   */
  async _fetchODataPage(serviceUrl, entitySet, top = 500, skip = 0) {
    const url = `${this.baseUrl}${serviceUrl}/${entitySet}?$format=json&$top=${top}&$skip=${skip}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'sap-client': this.client || '100',
        ...this._authHeader(),
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`SAP OData HTTP ${response.status}: ${body.slice(0, 200)}`);
    }
    const json = await response.json();
    // OData v4 wraps results in { value: [...] }
    return json.value ?? [];
  }

  async sync(direction, entity, options = {}) {
    const cfg = ENTITY_CONFIG[entity];
    if (!cfg) {
      return { status: 'skipped', reason: `Unsupported entity: ${entity}` };
    }

    logger.info('SAPConnector: sync started', {
      direction, entity, tenantId: this.tenantId, systemId: this.systemId,
    });

    // Stub mode: credentials not configured — log and return success
    if (!this.baseUrl || !this.username) {
      logger.warn('SAPConnector: credentials not configured, running in stub mode', { entity });
      await this._writeSyncLog(entity, 'success', { records_processed: 0, mode: 'stub' });
      return { connector: 'sap', direction, entity, records_processed: 0, status: 'success', mode: 'stub' };
    }

    if (direction !== 'inbound') {
      return { status: 'skipped', reason: 'Only inbound sync is supported for SAP' };
    }

    let totalProcessed = 0;
    let skip = 0;
    const pageSize = options.pageSize || 500;

    try {
      while (true) {
        const records = await this._fetchODataPage(cfg.service, cfg.entitySet, pageSize, skip);
        if (records.length === 0) break;

        for (const record of records) {
          const externalId = record[cfg.keyField];
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
              logger.warn('SAPConnector: upsert failed', { error: e.message, externalId }),
            );
          } else {
            await insertOne(cfg.localCollection, { id: randomUUID(), ...doc }).catch(e =>
              logger.warn('SAPConnector: insert failed', { error: e.message, externalId }),
            );
          }
          totalProcessed++;
        }

        skip += pageSize;
        if (records.length < pageSize) break; // last page
      }

      await this._writeSyncLog(entity, 'success', { records_processed: totalProcessed });
      return { connector: 'sap', direction, entity, records_processed: totalProcessed, status: 'success' };
    } catch (err) {
      logger.error('SAPConnector: sync error', { entity, error: err.message });
      await this._writeSyncLog(entity, 'error', { error: err.message, records_processed: totalProcessed });
      return { connector: 'sap', direction, entity, records_processed: totalProcessed, status: 'error', error: err.message };
    }
  }

  async webhookReceive(payload) {
    logger.info('SAPConnector: webhookReceive', {
      tenantId: this.tenantId,
      documentType: payload?.DocumentType,
      changeType: payload?.ChangeType,
    });

    // Trigger a re-sync for the affected entity when SAP sends an IDoc/OData change notification
    const entityMap = {
      GLMASTER: 'gl_accounts',
      COSTCTR:  'cost_centres',
      CREMAS:   'vendor_master',
      PORDER:   'purchase_orders',
    };
    const entity = entityMap[payload?.DocumentType];
    if (entity) {
      // Fire-and-forget incremental sync
      this.sync('inbound', entity).catch(e =>
        logger.warn('SAPConnector: webhook-triggered sync error', { error: e.message }),
      );
    }

    return { received: true, connector: 'sap', entity: entity ?? 'unknown' };
  }
}
