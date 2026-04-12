/**
 * @file server/services/revenuerec.js
 * @description Revenue recognition service (ASC 606 / IFRS 15) — Sprint 31.
 * Handles obligation allocation and recognition schedule generation.
 */
import { getAdapter } from '../db/factory.js';
import { randomUUID } from 'crypto';
import logger from '../utils/logger.js';

/**
 * Allocate transaction price across performance obligations using SSA percentages.
 * Returns obligations with allocated_amount populated.
 */
export function allocateObligations(total_value, obligations) {
  const totalPct = obligations.reduce((s, o) => s + (o.ssa_pct || 0), 0);
  return obligations.map(o => ({
    ...o,
    allocated_amount: totalPct > 0 ? (o.ssa_pct / totalPct) * total_value : total_value / obligations.length,
  }));
}

/**
 * Generate a monthly recognition schedule for a contract.
 * @param {Object} contract - { id, total_value, obligations, start_date, end_date }
 * @returns {Array} recognition schedule entries
 */
export function buildRecognitionSchedule(contract) {
  const { obligations, start_date, end_date } = contract;
  const start = new Date(start_date);
  const end = new Date(end_date);

  // Calculate months
  const months = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    months.push(new Date(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  if (months.length === 0) return [];

  const allocated = allocateObligations(contract.total_value, obligations || []);
  const schedule = [];

  for (const ob of allocated) {
    const monthlyAmt = ob.allocated_amount / months.length;
    for (const month of months) {
      schedule.push({
        id: randomUUID(),
        contract_id: contract.id,
        obligation_name: ob.name,
        period: month.toISOString().slice(0, 7), // YYYY-MM
        amount: Math.round(monthlyAmt * 100) / 100,
        status: 'scheduled',
      });
    }
  }
  return schedule;
}

/**
 * Persist a recognition schedule to the DB.
 */
export async function saveSchedule(tenantId, contract) {
  const adapter = await getAdapter();
  const entries = buildRecognitionSchedule(contract);
  for (const entry of entries) {
    await adapter.insertOne('rev_rec_schedules', { ...entry, tenant_id: tenantId });
  }
  logger.info('RevRec: schedule saved', { contract_id: contract.id, entries: entries.length });
  return entries;
}

/**
 * Mark scheduled periods as recognized up to period_end.
 */
export async function recogniseUpTo(tenantId, contractId, { period_start, period_end }) {
  const adapter = await getAdapter();
  const filter = { tenant_id: tenantId, contract_id: contractId, status: 'scheduled' };
  if (period_start) filter.period = { $gte: period_start };
  const entries = await adapter.findMany('rev_rec_schedules', filter, { limit: 1000 });

  let recognized = 0;
  for (const entry of entries) {
    if (period_end && entry.period > period_end) continue;
    await adapter.updateOne('rev_rec_schedules', { id: entry.id }, { status: 'recognized', recognized_at: new Date() });
    await adapter.insertOne('recognition_events', {
      id: randomUUID(),
      tenant_id: tenantId,
      contract_id: contractId,
      schedule_id: entry.id,
      period: entry.period,
      amount: entry.amount,
      recognized_at: new Date(),
    });
    recognized += entry.amount;
  }
  return { recognized_amount: recognized, entries_processed: entries.length };
}
