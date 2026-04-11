import logger from '../utils/logger.js';

let connected = false;

export function connectMqttBroker(brokerUrl, onMessage) {
  const url = brokerUrl || process.env.MQTT_BROKER_URL;
  if (!url) { logger.info('MQTT: no broker URL configured, using stub'); return null; }
  logger.info('MQTT: broker configured at ' + url);
  connected = true;
  return { connected, publish: (topic, msg) => logger.info('MQTT publish: ' + topic) };
}

export function isMqttConnected() { return connected; }
