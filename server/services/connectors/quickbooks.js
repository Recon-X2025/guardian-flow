/**
 * @file server/services/connectors/quickbooks.js
 * @description QuickBooksConnector — syncs QuickBooks Online accounting data.
 *
 * Supported entities
 * ------------------
 * - invoices
 * - payments
 * - chart_of_accounts
 *
 * Note: This is a stub implementation; API calls are logged rather than made.
 */

import { BaseConnector } from './base.js';
import logger from '../../utils/logger.js';

export class QuickBooksConnector extends BaseConnector {
  constructor(config) {
    super(config);
    this.realmId = config.credentials?.realm_id ?? null;
  }

  async sync(direction, entity, options = {}) {
    const supported = ['invoices', 'payments', 'chart_of_accounts'];
    if (!supported.includes(entity)) {
      return { status: 'skipped', reason: `Unsupported entity: ${entity}` };
    }

    logger.info('QuickBooksConnector: sync', {
      direction,
      entity,
      tenantId: this.tenantId,
      realmId: this.realmId,
      options,
    });

    // Stub — in production this would call the QuickBooks Online REST API
    const result = {
      connector: 'quickbooks',
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
    logger.info('QuickBooksConnector: webhookReceive', {
      tenantId: this.tenantId,
      eventNotifications: payload?.eventNotifications,
    });

    return { received: true, connector: 'quickbooks' };
  }
}
