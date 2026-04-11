/**
 * @file server/scripts/sprint1-migration.js
 * @description Sprint 1 (Gap Bridge) — FSM Work Order Depth collections.
 *   Collections: wo_attachments, wo_signatures, wo_templates, wo_steps, wo_parts, dispatch_audit
 *
 * Run: node server/scripts/sprint1-migration.js
 * Idempotent via schema_migrations collection.
 */

import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

async function run() {
  const db = getAdapter();

  const migrations = [
    {
      version: 'sprint1_fsm_depth',
      description: 'Sprint 1 – WO attachments, signatures, templates, steps, parts, dispatch_audit',
      async up(adapter) {
        const raw = adapter.client || adapter._client;

        if (!raw) {
          logger.warn('No raw client available — index creation skipped (in-memory adapter)');
          return;
        }

        // wo_attachments
        await raw.collection('wo_attachments').createIndex({ tenant_id: 1, work_order_id: 1 }).catch(() => {});
        await raw.collection('wo_attachments').createIndex({ tenant_id: 1, category: 1 }).catch(() => {});

        // wo_signatures
        await raw.collection('wo_signatures').createIndex({ tenant_id: 1, work_order_id: 1 }).catch(() => {});
        await raw.collection('wo_signatures').createIndex({ tenant_id: 1, work_order_id: 1, signer_role: 1 }, { unique: true }).catch(() => {});

        // wo_templates
        await raw.collection('wo_templates').createIndex({ tenant_id: 1, category: 1 }).catch(() => {});
        await raw.collection('wo_templates').createIndex({ tenant_id: 1, name: 1 }).catch(() => {});

        // wo_steps
        await raw.collection('wo_steps').createIndex({ tenant_id: 1, work_order_id: 1 }).catch(() => {});
        await raw.collection('wo_steps').createIndex({ tenant_id: 1, work_order_id: 1, order: 1 }).catch(() => {});

        // wo_parts
        await raw.collection('wo_parts').createIndex({ tenant_id: 1, work_order_id: 1 }).catch(() => {});
        await raw.collection('wo_parts').createIndex({ tenant_id: 1, sku: 1 }).catch(() => {});

        // dispatch_audit
        await raw.collection('dispatch_audit').createIndex({ tenant_id: 1, work_order_id: 1 }).catch(() => {});
        await raw.collection('dispatch_audit').createIndex({ tenant_id: 1, created_at: -1 }).catch(() => {});

        logger.info('Sprint 1 indexes created');
      },
    },
  ];

  // Idempotent migration runner
  for (const mig of migrations) {
    const existing = await db.findOne('schema_migrations', { version: mig.version }).catch(() => null);
    if (existing) {
      logger.info({ version: mig.version }, 'Already applied — skipping');
      continue;
    }

    logger.info({ version: mig.version }, `Applying migration: ${mig.description}`);
    await mig.up(db);
    await db.insert('schema_migrations', {
      version: mig.version,
      description: mig.description,
      applied_at: new Date().toISOString(),
    });
    logger.info({ version: mig.version }, 'Migration applied ✓');
  }

  logger.info('Sprint 1 migration complete');
}

run().catch(err => {
  logger.error(err, 'Sprint 1 migration failed');
  process.exit(1);
});
