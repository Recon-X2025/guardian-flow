/**
 * @file server/scripts/sprint38-migration.js
 * @description Idempotent DB migration for Sprint 38 collections.
 */

import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

async function ensureCollection(adapter, name) {
  try {
    await adapter.findMany(name, {}, { limit: 1 });
    logger.info(`Collection exists: ${name}`);
  } catch {
    logger.info(`Creating collection: ${name}`);
  }
}

async function run() {
  const adapter = await getAdapter();

  await ensureCollection(adapter, 'fixed_assets');
  await ensureCollection(adapter, 'depreciation_entries');
  await ensureCollection(adapter, 'intercompany_transactions');
  await ensureCollection(adapter, 'expense_claims');
  await ensureCollection(adapter, 'expense_policies');

  // Seed default expense policies if none exist
  const existing = await adapter.findMany('expense_policies', {}, { limit: 1 });
  if (existing.length === 0) {
    const defaults = [
      { id: 'pol-meals',         category: 'meals',         dailyLimit: 50,   currency: 'USD' },
      { id: 'pol-accommodation', category: 'accommodation', dailyLimit: 200,  currency: 'USD' },
      { id: 'pol-mileage',       category: 'mileage',       dailyLimit: 0.67, currency: 'USD' },
      { id: 'pol-tools',         category: 'tools',         dailyLimit: 500,  currency: 'USD' },
      { id: 'pol-other',         category: 'other',         dailyLimit: 500,  currency: 'USD' },
    ];
    for (const p of defaults) {
      await adapter.insertOne('expense_policies', { ...p, tenantId: '__default__', createdAt: new Date().toISOString() });
    }
    logger.info('Seeded default expense policies');
  }

  logger.info('Sprint 38 migration complete');
  process.exit(0);
}

run().catch(err => {
  logger.error('Sprint 38 migration failed', { error: err.message });
  process.exit(1);
});
