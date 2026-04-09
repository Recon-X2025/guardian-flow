/**
 * @file server/services/comms.js
 * @description Unified outbound communications adapter — Sprint 11.
 *
 * Channels: Email, SMS, WhatsApp
 * Tenant config is loaded from org settings.
 * Sending is stubbed (logs instead of live dispatch).
 */

import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

/**
 * Fetch tenant-specific channel config from org settings.
 * Returns an empty object if no config is found.
 */
async function getTenantChannelConfig(tenantId) {
  try {
    const adapter = await getAdapter();
    const settings = await adapter.findOne('org_settings', { tenant_id: tenantId });
    return settings?.comms_config || {};
  } catch {
    return {};
  }
}

// ── Individual channel senders ────────────────────────────────────────────────

export async function sendEmail(to, subject, body, tenantId) {
  const config = await getTenantChannelConfig(tenantId);
  const fromAddress = config.email?.fromAddress || 'noreply@guardianflow.app';

  logger.info('[comms:email] STUB — would send email', {
    tenantId,
    from: fromAddress,
    to,
    subject,
    bodyLength: body?.length,
  });

  return {
    channel: 'email',
    to,
    subject,
    status: 'sent',
    timestamp: new Date().toISOString(),
    messageId: `stub-email-${Date.now()}`,
  };
}

export async function sendSMS(to, message, tenantId) {
  const config = await getTenantChannelConfig(tenantId);
  const fromNumber = config.sms?.fromNumber || '+10000000000';

  logger.info('[comms:sms] STUB — would send SMS', {
    tenantId,
    from: fromNumber,
    to,
    messageLength: message?.length,
  });

  return {
    channel: 'sms',
    to,
    status: 'sent',
    timestamp: new Date().toISOString(),
    messageId: `stub-sms-${Date.now()}`,
  };
}

export async function sendWhatsApp(to, message, tenantId) {
  const config = await getTenantChannelConfig(tenantId);
  const fromNumber = config.whatsapp?.fromNumber || '+10000000000';

  logger.info('[comms:whatsapp] STUB — would send WhatsApp message', {
    tenantId,
    from: fromNumber,
    to,
    messageLength: message?.length,
  });

  return {
    channel: 'whatsapp',
    to,
    status: 'sent',
    timestamp: new Date().toISOString(),
    messageId: `stub-wa-${Date.now()}`,
  };
}

// ── Unified dispatcher ────────────────────────────────────────────────────────

/**
 * Send a notification via the specified channel.
 *
 * @param {'email'|'sms'|'whatsapp'} channel
 * @param {string} recipient  — email address or phone number
 * @param {string} message    — message body
 * @param {object} options    — { tenantId, subject (email only) }
 */
export async function sendNotification(channel, recipient, message, options = {}) {
  const { tenantId, subject } = options;

  if (!tenantId) {
    throw new Error('tenantId is required for sendNotification');
  }

  switch (channel) {
    case 'email':
      return sendEmail(recipient, subject || 'Notification from GuardianFlow', message, tenantId);
    case 'sms':
      return sendSMS(recipient, message, tenantId);
    case 'whatsapp':
      return sendWhatsApp(recipient, message, tenantId);
    default:
      throw new Error(`Unsupported channel: ${channel}. Use email, sms, or whatsapp`);
  }
}
