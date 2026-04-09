/**
 * @file server/services/connectors/sap.js
 * @description SAPConnector — syncs SAP ERP data.
 *
 * Supported entities
 * ------------------
 * - gl_accounts
 * - cost_centres
 * - vendor_master
 *
 * Note: This is a stub implementation; API calls are logged rather than made.
 */

import { BaseConnector } from './base.js';
import logger from '../../utils/logger.js';

export class SAPConnector extends BaseConnector {
  constructor(config) {
    super(config);
    this.systemId = config.credentials?.system_id ?? null;
    this.client   = config.credentials?.client    ?? null;
  }

  async sync(direction, entity, options = {}) {
    const supported = ['gl_accounts', 'cost_centres', 'vendor_master'];
    if (!supported.includes(entity)) {
      return { status: 'skipped', reason: `Unsupported entity: ${entity}` };
    }

    logger.info('SAPConnector: sync', {
      direction,
      entity,
      tenantId: this.tenantId,
      systemId: this.systemId,
      client:   this.client,
      options,
    });

    // Stub — in production this would call SAP OData or RFC APIs
    const result = {
      connector: 'sap',
      direction,
      entity,
      records_processed: 0,
      status: 'success',
      synced_at: new Date().toISOString(),
    };

    await this._writeSyncLog(entity, 'success', { records_processed: result.records_processed });
    return result;
  }

  async webhookReceive(payload) {
    logger.info('SAPConnector: webhookReceive', {
      tenantId: this.tenantId,
      documentType: payload?.DocumentType,
    });

    return { received: true, connector: 'sap' };
  }
}
