/**
 * @file server/services/connectors/salesforce.js
 * @description SalesforceConnector — syncs Salesforce CRM data.
 *
 * Supported entities
 * ------------------
 * - accounts    → customers
 * - contacts
 * - opportunities
 *
 * Note: This is a stub implementation; API calls are logged rather than made.
 */

import { BaseConnector } from './base.js';
import logger from '../../utils/logger.js';

export class SalesforceConnector extends BaseConnector {
  constructor(config) {
    super(config);
    this.instanceUrl = config.credentials?.instance_url ?? 'https://na1.salesforce.com';
  }

  async sync(direction, entity, options = {}) {
    const supported = ['accounts', 'contacts', 'opportunities'];
    if (!supported.includes(entity)) {
      return { status: 'skipped', reason: `Unsupported entity: ${entity}` };
    }

    logger.info('SalesforceConnector: sync', {
      direction,
      entity,
      tenantId: this.tenantId,
      instanceUrl: this.instanceUrl,
      options,
    });

    // Stub — in production this would call the Salesforce REST/Bulk API
    const result = {
      connector: 'salesforce',
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
    logger.info('SalesforceConnector: webhookReceive', {
      tenantId: this.tenantId,
      eventType: payload?.event?.type,
    });

    // Stub — parse and upsert records in production
    return { received: true, connector: 'salesforce' };
  }
}
