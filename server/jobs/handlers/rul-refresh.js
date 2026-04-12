import { getAdapter } from '../../db/factory.js';
import { estimateRUL } from '../../services/ai/rul-model.js';
import logger from '../../utils/logger.js';

export async function runRulRefresh() {
  const adapter = await getAdapter();
  const assets = await adapter.findMany('assets', {}, { limit: 500 });

  let processed = 0;
  let flagged = 0;
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  for (const asset of assets) {
    try {
      const allReadings = await adapter.findMany('iot_readings', { tenant_id: asset.tenant_id, device_id: asset.id }, { limit: 1000 });
      const readings = allReadings.filter(r => r.timestamp >= cutoff).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      if (readings.length < 2) continue;

      const mean = readings.reduce((s, r) => s + r.value, 0) / readings.length;
      const failureThreshold = mean * 0.2;
      const rul = estimateRUL(readings, failureThreshold);

      const updates = {
        rul_estimate: rul,
        rul_days_remaining: rul.estimatedRULDays,
        rul_computed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (rul.estimatedRULDays !== null && rul.estimatedRULDays < 30) {
        updates.maintenance_priority = 'critical';
        flagged++;
      }

      await adapter.updateOne('assets', { id: asset.id }, updates);
      processed++;
    } catch (err) {
      logger.error('RUL refresh error for asset', { assetId: asset.id, error: err.message });
    }
  }

  logger.info('RUL refresh complete', { processed, flagged });
  return { processed, flagged };
}
