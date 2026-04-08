import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

/**
 * Track an application event into the analytics_events collection.
 * Fire-and-forget: errors are logged but never propagate to callers.
 */
export async function trackEvent({
  tenantId,
  eventType,
  eventCategory,
  entityType,
  entityId,
  userId,
  metadata = {},
}) {
  try {
    const adapter = await getAdapter();
    await adapter.insertOne('analytics_events', {
      id: randomUUID(),
      tenant_id: tenantId,
      event_type: eventType,
      event_category: eventCategory,
      entity_type: entityType,
      entity_id: entityId,
      user_id: userId,
      metadata,
      created_at: new Date(),
    });
  } catch (err) {
    logger.error('trackEvent failed', { eventType, tenantId, error: err.message });
  }
}

/**
 * Flush hourly aggregate for a specific tenant+hour+eventType bucket.
 * Called internally — upserts into analytics_hourly_aggregates.
 */
export async function flushHourlyAggregate({ tenantId, hourStart, eventType }) {
  try {
    const adapter = await getAdapter();
    await adapter.updateOne(
      'analytics_hourly_aggregates',
      { tenant_id: tenantId, hour_start: hourStart, event_type: eventType },
      { $inc: { event_count: 1 } },
      { upsert: true },
    );
  } catch (err) {
    logger.error('flushHourlyAggregate failed', { eventType, tenantId, error: err.message });
  }
}
