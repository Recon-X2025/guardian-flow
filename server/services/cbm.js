/**
 * @file server/services/cbm.js
 * @description Condition-Based Maintenance (CBM) rule engine — Sprint 30.
 * Evaluates IoT telemetry against defined rules and triggers maintenance actions.
 */
import { getAdapter } from '../db/factory.js';
import { randomUUID } from 'crypto';
import logger from '../utils/logger.js';

const OPERATORS = {
  '>':  (a, b) => a > b,
  '<':  (a, b) => a < b,
  '>=': (a, b) => a >= b,
  '<=': (a, b) => a <= b,
  '==': (a, b) => a === b,
};

/**
 * Create a CBM rule.
 */
export async function createRule(tenantId, { asset_id, condition, action, name }) {
  const adapter = await getAdapter();
  const rule = {
    id: randomUUID(),
    tenant_id: tenantId,
    name: name || `Rule-${Date.now()}`,
    asset_id,
    condition,   // { metric, operator, threshold }
    action,      // { type, priority, description }
    active: true,
    created_at: new Date(),
  };
  await adapter.insertOne('cbm_rules', rule);
  return rule;
}

/**
 * List CBM rules for a tenant.
 */
export async function listRules(tenantId, { asset_id } = {}) {
  const adapter = await getAdapter();
  const filter = { tenant_id: tenantId };
  if (asset_id) filter.asset_id = asset_id;
  return adapter.findMany('cbm_rules', filter, { limit: 200 });
}

/**
 * Evaluate all active rules against latest IoT readings.
 * Returns triggered rules with their readings.
 */
export async function evaluateRules(tenantId) {
  const adapter = await getAdapter();
  const rules = await adapter.findMany('cbm_rules', { tenant_id: tenantId, active: true }, { limit: 200 });

  const triggered = [];
  for (const rule of rules) {
    const { metric, operator, threshold } = rule.condition || {};
    if (!metric || !operator || threshold === undefined) continue;

    const readings = await adapter.findMany('iot_readings', {
      tenant_id: tenantId,
      device_id: rule.asset_id,
      metric,
    }, { limit: 1, sort: { timestamp: -1 } });

    if (!readings.length) continue;
    const reading = readings[0];
    const fn = OPERATORS[operator];
    if (fn && fn(reading.value, threshold)) {
      triggered.push({ rule, reading });
      await recordTriggerEvent(tenantId, rule, reading);
    }
  }
  return triggered;
}

async function recordTriggerEvent(tenantId, rule, reading) {
  const adapter = await getAdapter();
  await adapter.insertOne('cbm_trigger_history', {
    id: randomUUID(),
    tenant_id: tenantId,
    rule_id: rule.id,
    asset_id: rule.asset_id,
    metric: reading.metric,
    value: reading.value,
    threshold: rule.condition.threshold,
    action_type: rule.action?.type,
    triggered_at: new Date(),
  });
  logger.info('CBM: rule triggered', { rule_id: rule.id, asset: rule.asset_id });
}
