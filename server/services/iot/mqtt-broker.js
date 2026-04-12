// server/services/iot/mqtt-broker.js
import logger from '../../utils/logger.js';
import { getAdapter } from '../../db/factory.js';
import { randomUUID } from 'crypto';

class MQTTBrokerService {
  constructor() {
    this.connected = false;
    this.brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
  }

  connect() {
    logger.info('MQTT not configured — broker stub active. Set MQTT_BROKER_URL to enable real MQTT.');
  }

  async processMessage(tenantId, deviceId, payload) {
    try {
      const adapter = await getAdapter();
      const now = new Date().toISOString();
      // Upsert readings for each metric in payload
      for (const [metric, value] of Object.entries(payload)) {
        if (typeof value !== 'number') continue;
        const reading = { id: randomUUID(), tenant_id: tenantId, device_id: deviceId, metric, value, unit: '', timestamp: now, created_at: now };
        await adapter.insertOne('iot_readings', reading);
      }
      // Update device lastSeenAt
      const existing = await adapter.findOne('iot_devices', { tenant_id: tenantId, device_id: deviceId });
      if (existing) {
        await adapter.updateOne('iot_devices', { id: existing.id }, { last_seen_at: now, status: 'online', updated_at: now });
      }
      // Evaluate threshold rules
      const rules = await adapter.findMany('iot_rules', { tenant_id: tenantId, device_id: deviceId, active: true }, { limit: 50 });
      for (const rule of rules) {
        const val = payload[rule.metric];
        if (val === undefined) continue;
        let triggered = false;
        if (rule.condition === 'gt' && val > rule.threshold) triggered = true;
        if (rule.condition === 'lt' && val < rule.threshold) triggered = true;
        if (rule.condition === 'gte' && val >= rule.threshold) triggered = true;
        if (rule.condition === 'lte' && val <= rule.threshold) triggered = true;
        if (rule.condition === 'eq' && val === rule.threshold) triggered = true;
        if (!triggered) continue;
        await adapter.updateOne('iot_rules', { id: rule.id }, { last_triggered_at: now });
        if (rule.action === 'create_work_order') {
          await adapter.insertOne('work_orders', {
            id: randomUUID(), tenant_id: tenantId,
            title: `Auto: ${rule.metric} ${rule.condition} ${rule.threshold} on ${deviceId}`,
            status: 'open', priority: 'high', source: 'iot_rule',
            iot_rule_id: rule.id, device_id: deviceId,
            created_at: now, updated_at: now,
          });
        } else {
          logger.warn('IoT rule alert triggered', { tenantId, deviceId, metric: rule.metric, value: val, threshold: rule.threshold });
        }
      }
    } catch (err) {
      logger.error('MQTT processMessage error', { error: err.message });
    }
  }

  getStatus() {
    return { connected: this.connected, broker: this.brokerUrl };
  }
}

const mqttBroker = new MQTTBrokerService();
if (process.env.MQTT_BROKER_URL) {
  mqttBroker.connect();
}
export default mqttBroker;
