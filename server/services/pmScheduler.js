import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';
import { randomUUID } from 'crypto';

export async function generatePMWorkOrders(tenantId) {
  try {
    const adapter = await getAdapter();
    const now = new Date();
    const pmSchedules = await adapter.findMany('pm_schedules', { tenant_id: tenantId });
    const due = pmSchedules.filter(s => s.next_due_date && new Date(s.next_due_date) <= now);
    for (const schedule of due) {
      const wo = {
        id: randomUUID(), tenant_id: tenantId, title: 'PM: ' + (schedule.name || schedule.id),
        type: 'preventive', status: 'open', priority: 'medium',
        asset_id: schedule.asset_id, pm_schedule_id: schedule.id, created_at: new Date(),
      };
      await adapter.insertOne('work_orders', wo);
      const nextDue = new Date(schedule.next_due_date);
      nextDue.setDate(nextDue.getDate() + (schedule.frequency_days || 30));
      await adapter.updateOne('pm_schedules', { id: schedule.id }, { next_due_date: nextDue });
    }
    return due.length;
  } catch (err) {
    logger.error('PM scheduler error', { error: err.message });
    return 0;
  }
}

export function startPmScheduler() {
  setInterval(async () => {
    logger.info('PM scheduler: checking due PM schedules');
  }, 60 * 60 * 1000);
}
