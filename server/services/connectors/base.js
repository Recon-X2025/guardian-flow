/**
 * @file server/services/connectors/base.js
 * @description BaseConnector — abstract base class for all ERP/CRM connectors.
 *
 * Subclasses must implement:
 *   - sync(direction, entity, options)
 *   - webhookReceive(payload)
 */

import { getAdapter } from '../../db/factory.js';
import logger from '../../utils/logger.js';

export class BaseConnector {
  /**
   * @param {object} config  - persisted connector_configs document
   */
  constructor(config) {
    this.config      = config;
    this.tenantId    = config.tenant_id;
    this.connectorId = config.id;
    this.type        = config.connector_type;
  }

  /**
   * Sync data in the specified direction.
   *
   * @param {'inbound'|'outbound'} direction
   * @param {string}               entity     — e.g. 'customers', 'invoices'
   * @param {object}               [options]
   * @returns {Promise<object>}  sync result summary
   */
  // eslint-disable-next-line no-unused-vars
  async sync(direction, entity, options = {}) {
    throw new Error(`${this.type}: sync() not implemented`);
  }

  /**
   * Process an inbound webhook payload from the external system.
   *
   * @param {object} payload
   * @returns {Promise<object>}
   */
  // eslint-disable-next-line no-unused-vars
  async webhookReceive(payload) {
    throw new Error(`${this.type}: webhookReceive() not implemented`);
  }

  /**
   * Return the timestamp of the last successful sync for this connector.
   *
   * @returns {Promise<string|null>}  ISO timestamp or null
   */
  async getLastSyncTime() {
    try {
      const adapter = await getAdapter();
      const logs    = await adapter.findMany(
        'connector_sync_log',
        { tenant_id: this.tenantId, connector_id: this.connectorId, status: 'success' },
        { limit: 1, sort: { synced_at: -1 } },
      );
      return logs[0]?.synced_at ?? null;
    } catch (err) {
      logger.warn('BaseConnector: getLastSyncTime error', { error: err.message });
      return null;
    }
  }

  /**
   * Write a sync log entry.
   *
   * @param {string} entity
   * @param {'success'|'error'} status
   * @param {object} [meta]
   * @returns {Promise<void>}
   */
  async _writeSyncLog(entity, status, meta = {}) {
    try {
      const { randomUUID } = await import('crypto');
      const adapter        = await getAdapter();
      await adapter.insertOne('connector_sync_log', {
        id:           randomUUID(),
        tenant_id:    this.tenantId,
        connector_id: this.connectorId,
        entity,
        status,
        synced_at:    new Date().toISOString(),
        ...meta,
      });
    } catch (err) {
      logger.warn('BaseConnector: _writeSyncLog error', { error: err.message });
    }
  }
}
