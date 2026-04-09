/**
 * @file server/services/iot.js
 * @description IoT telemetry ingestion service — Sprint 29.
 * Handles device registration, telemetry ingestion, and time-series queries.
 */
import { getAdapter } from '../db/factory.js';
import { randomUUID } from 'crypto';
import logger from '../utils/logger.js';

/**
 * Ingest a telemetry reading and upsert the device last-seen record.
 */
export async function ingestReading(tenantId, { device_id, metric, value, unit, timestamp }) {
  const adapter = await getAdapter();
  const ts = timestamp ? new Date(timestamp) : new Date();

  // Upsert device record
  const existing = await adapter.findOne('iot_devices', { tenant_id: tenantId, device_id });
  if (existing) {
    await adapter.updateOne('iot_devices', { tenant_id: tenantId, device_id }, {
      last_seen: ts,
      last_metric: metric,
      last_value: value,
      last_unit: unit,
      status: 'online',
    });
  } else {
    await adapter.insertOne('iot_devices', {
      id: randomUUID(),
      tenant_id: tenantId,
      device_id,
      status: 'online',
      last_seen: ts,
      last_metric: metric,
      last_value: value,
      last_unit: unit,
      registered_at: new Date(),
    });
  }

  // Store reading
  const reading = {
    id: randomUUID(),
    tenant_id: tenantId,
    device_id,
    metric,
    value,
    unit: unit || '',
    timestamp: ts,
    ingested_at: new Date(),
  };
  await adapter.insertOne('iot_readings', reading);
  logger.info('IoT: reading ingested', { tenant: tenantId, device_id, metric, value });
  return reading;
}

/**
 * List all devices for a tenant with their latest telemetry.
 */
export async function listDevices(tenantId, { limit = 50, status } = {}) {
  const adapter = await getAdapter();
  const filter = { tenant_id: tenantId };
  if (status) filter.status = status;
  return adapter.findMany('iot_devices', filter, { limit, sort: { last_seen: -1 } });
}

/**
 * List telemetry readings with optional filters.
 */
export async function listReadings(tenantId, { device_id, metric, from, to, limit = 100 } = {}) {
  const adapter = await getAdapter();
  const filter = { tenant_id: tenantId };
  if (device_id) filter.device_id = device_id;
  if (metric) filter.metric = metric;
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) filter.timestamp.$lte = new Date(to);
  }
  return adapter.findMany('iot_readings', filter, { limit, sort: { timestamp: -1 } });
}
