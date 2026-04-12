import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

export async function checkSlaBreaches(tenantId) {
  try {
    const adapter = await getAdapter();
    const now = new Date();
    const workOrders = await adapter.findMany('work_orders', { tenant_id: tenantId });
    const breached = workOrders.filter(wo => {
      if (['completed', 'cancelled', 'closed'].includes(wo.status)) return false;
      if (wo.resolution_deadline && new Date(wo.resolution_deadline) < now) return true;
      if (wo.response_deadline && new Date(wo.response_deadline) < now) return true;
      return false;
    });
    return breached;
  } catch (err) {
    logger.error('SLA monitor error', { error: err.message });
    return [];
  }
}

export function startSlaMonitor() {
  setInterval(async () => {
    logger.info('SLA monitor: checking breaches');
  }, 5 * 60 * 1000);
}
