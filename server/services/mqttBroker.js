/**
 * @file server/services/mqttBroker.js
 * @description MQTT broker integration for IoT sensor telemetry ingestion.
 *
 * When MQTT_BROKER_URL is set, connects to the broker using the `mqtt` npm package
 * and subscribes to `guardian-flow/telemetry/+` (one level wildcard — one topic
 * per device ID). Incoming messages are forwarded to the registered onMessage callback.
 *
 * Topic format:  guardian-flow/telemetry/{device_id}
 * Payload format: JSON { property, value, unit?, timestamp? }
 *
 * Without MQTT_BROKER_URL the service uses a stub that logs and no-ops.
 * The stub is safe to call — all functions return without error.
 */

import logger from '../utils/logger.js';

const TOPIC_PREFIX = 'guardian-flow/telemetry/';
let mqttClient = null;
let _connected = false;

/**
 * Connect to MQTT broker and subscribe to telemetry topics.
 *
 * @param {string} [brokerUrl] — overrides MQTT_BROKER_URL env var
 * @param {function} [onMessage] — called with (deviceId, payload) for each message
 * @returns {object|null} client handle or null if not configured
 */
export async function connectMqttBroker(brokerUrl, onMessage) {
  const url = brokerUrl || process.env.MQTT_BROKER_URL;
  if (!url) {
    logger.info('MQTT: no broker URL configured — using stub');
    return null;
  }

  try {
    // Dynamic import: only load mqtt package when a broker URL is present
    const mqtt = await import('mqtt').catch(() => null);
    if (!mqtt) {
      logger.warn('MQTT: mqtt package not installed — using stub. Run: npm install mqtt');
      return null;
    }

    const client = mqtt.default.connect(url, {
      clientId: `guardian-flow-server-${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
    });

    client.on('connect', () => {
      _connected = true;
      const topic = `${TOPIC_PREFIX}+`;
      client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          logger.error('MQTT: subscribe error', { topic, error: err.message });
        } else {
          logger.info('MQTT: connected and subscribed', { broker: url, topic });
        }
      });
    });

    client.on('message', (topic, rawPayload) => {
      try {
        const deviceId = topic.replace(TOPIC_PREFIX, '');
        const payload = JSON.parse(rawPayload.toString());
        if (!payload.property) {
          logger.warn('MQTT: message missing property field', { topic });
          return;
        }
        if (typeof onMessage === 'function') {
          onMessage(deviceId, {
            property: payload.property,
            value: payload.value,
            unit: payload.unit ?? null,
            timestamp: payload.timestamp ?? new Date().toISOString(),
          });
        }
      } catch (err) {
        logger.warn('MQTT: message parse error', { topic, error: err.message });
      }
    });

    client.on('error', (err) => {
      logger.error('MQTT: connection error', { error: err.message });
      _connected = false;
    });

    client.on('offline', () => {
      _connected = false;
      logger.warn('MQTT: client offline — will reconnect');
    });

    client.on('reconnect', () => logger.info('MQTT: reconnecting…'));

    mqttClient = client;
    return client;
  } catch (err) {
    logger.error('MQTT: setup failed', { error: err.message });
    return null;
  }
}

/**
 * Publish a message to a device topic.
 * No-ops gracefully when not connected.
 *
 * @param {string} deviceId
 * @param {object} payload
 */
export function publishTelemetry(deviceId, payload) {
  const topic = `${TOPIC_PREFIX}${deviceId}`;
  if (!mqttClient || !_connected) {
    logger.debug('MQTT: publish skipped (not connected)', { topic });
    return;
  }
  mqttClient.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
    if (err) logger.warn('MQTT: publish error', { topic, error: err.message });
  });
}

export function isMqttConnected() { return _connected; }

export function getMqttStatus() {
  return {
    connected: _connected,
    broker: process.env.MQTT_BROKER_URL ?? null,
    topic_prefix: TOPIC_PREFIX,
  };
}

