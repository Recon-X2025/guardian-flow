/**
 * Sprint 40 idempotent migration.
 * Creates: esg_activities, esg_emission_factors, webhook_deliveries collections.
 * Seeds esg_emission_factors with default factors.
 *
 * Usage: node server/scripts/sprint40-migration.js
 */

import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const COLLECTIONS = ['esg_activities', 'esg_emission_factors', 'webhook_deliveries'];

const EMISSION_FACTORS = [
  { activityType: 'natural_gas', unit: 'cubic_meters', factor: 2.03 },
  { activityType: 'electricity', unit: 'kwh', factor: 0.233 },
  { activityType: 'diesel', unit: 'litres', factor: 2.68 },
  { activityType: 'petrol', unit: 'litres', factor: 2.31 },
  { activityType: 'air_travel', unit: 'km', factor: 0.255 },
  { activityType: 'supply_chain', unit: 'usd_spent', factor: 0.35 },
];

async function run() {
  logger.info('Sprint 40 migration: starting');
  const adapter = await getAdapter();

  for (const col of COLLECTIONS) {
    try {
      await adapter.findMany(col, {}, { limit: 1 });
      logger.info(`Sprint 40 migration: collection "${col}" ready`);
    } catch (err) {
      logger.error(`Sprint 40 migration: error checking "${col}"`, { error: err.message });
    }
  }

  logger.info('Sprint 40 migration: schema documentation');
  logger.info('esg_activities: { tenantId, period, scope (1/2/3), activityType, quantity, unit, emissionFactor, co2eKg, createdAt }');
  logger.info('webhook_deliveries: { tenantId, webhookId, event, payload, status (pending/delivered/failed/dead_letter), attempts, lastAttemptAt, nextRetryAt, errorLog[], createdAt }');

  // Seed emission factors
  for (const ef of EMISSION_FACTORS) {
    try {
      const existing = await adapter.findOne('esg_emission_factors', { activityType: ef.activityType });
      if (existing) {
        logger.info(`Sprint 40 migration: emission factor "${ef.activityType}" already exists — skipping`);
      } else {
        await adapter.insertOne('esg_emission_factors', {
          ...ef,
          createdAt: new Date().toISOString(),
        });
        logger.info(`Sprint 40 migration: seeded emission factor "${ef.activityType}"`);
      }
    } catch (err) {
      logger.error(`Sprint 40 migration: error seeding "${ef.activityType}"`, { error: err.message });
    }
  }

  logger.info('Sprint 40 migration: complete');
}

run().catch(err => {
  logger.error('Sprint 40 migration failed', { error: err.message });
  process.exit(1);
});
