/**
 * Sprint 41 idempotent migration.
 * Documents collections: iot_devices, iot_readings, iot_rules, digital_twins, sandbox_tenants.
 *
 * Usage: node server/scripts/sprint41-migration.js
 */

import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const COLLECTIONS = ['iot_devices', 'iot_readings', 'iot_rules', 'digital_twins', 'sandbox_tenants'];

async function run() {
  logger.info('Sprint 41 migration: starting');
  const adapter = await getAdapter();

  for (const col of COLLECTIONS) {
    try {
      await adapter.findMany(col, {}, { limit: 1 });
      logger.info(`Sprint 41 migration: collection "${col}" ready`);
    } catch (err) {
      logger.error(`Sprint 41 migration: error checking "${col}"`, { error: err.message });
    }
  }

  logger.info('Sprint 41 migration: schema documentation');
  logger.info('iot_devices: { tenantId, deviceId, name, expectedMetrics: [{name, unit, min, max}], status (online/offline/unknown), lastSeenAt, credentials: {clientId, password_hash} }');
  logger.info('iot_readings: { tenantId, deviceId, metric, value, unit, timestamp, createdAt }');
  logger.info('iot_rules: { tenantId, deviceId, metric, condition (gt/lt/eq/gte/lte), threshold, action (create_work_order/send_alert), active, lastTriggeredAt }');
  logger.info('digital_twins: { tenantId, assetId, schema: {metrics: [], relationships: []}, currentState: {}, simulationHistory: [], updatedAt }');
  logger.info('sandbox_tenants: { tenantId, provisionedAt, resetAt, apiCallCount, apiCallResetAt }');

  logger.info('Sprint 41 migration: complete');
}

run().catch(err => {
  logger.error('Sprint 41 migration: fatal error', { error: err.message });
  process.exit(1);
});
