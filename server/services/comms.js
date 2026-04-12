/**
 * @file server/services/comms.js
 * @description Unified outbound communications adapter — Sprint 11.
 *
 * Channels: Email, SMS, WhatsApp
 * Tenant config is loaded from org settings.
 *
 * Live dispatch is enabled when the appropriate environment variables are set:
 *   Email  → SMTP_HOST + SMTP_PORT + SMTP_USER + SMTP_PASS  (Nodemailer / any SMTP)
 *            OR SENDGRID_API_KEY  (SendGrid HTTP API)
 *   SMS    → TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER
 *
 * When the required env vars are absent (CI / dev) the service falls back to
 * a safe stub that logs the message and returns a mock messageId.
 */

import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

// ── Provider availability flags ───────────────────────────────────────────────

const HAS_SMTP = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const HAS_SENDGRID = !!process.env.SENDGRID_API_KEY;
const HAS_TWILIO = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);

// ── Lazy provider initialisation ─────────────────────────────────────────────

let _nodemailerTransport = null;

async function getNodemailerTransport() {
  if (_nodemailerTransport) return _nodemailerTransport;
  const nodemailer = await import('nodemailer');
  _nodemailerTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return _nodemailerTransport;
}

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
  const fromAddress = config.email?.fromAddress || process.env.SMTP_FROM || 'noreply@guardianflow.app';

  // ── SendGrid ────────────────────────────────────────────────────────────────
  if (HAS_SENDGRID) {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromAddress },
        subject,
        content: [{ type: 'text/plain', value: body }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`SendGrid error ${response.status}: ${err}`);
    }

    const messageId = response.headers.get('x-message-id') || `sg-${Date.now()}`;
    logger.info('[comms:email] sent via SendGrid', { tenantId, to, subject, messageId });
    return { channel: 'email', to, subject, status: 'sent', timestamp: new Date().toISOString(), messageId };
  }

  // ── Nodemailer (SMTP) ───────────────────────────────────────────────────────
  if (HAS_SMTP) {
    const transport = await getNodemailerTransport();
    const info = await transport.sendMail({ from: fromAddress, to, subject, text: body });
    logger.info('[comms:email] sent via SMTP', { tenantId, to, subject, messageId: info.messageId });
    return { channel: 'email', to, subject, status: 'sent', timestamp: new Date().toISOString(), messageId: info.messageId };
  }

  // ── Stub fallback ───────────────────────────────────────────────────────────
  logger.info('[comms:email] STUB (no SMTP/SendGrid configured) — would send email', {
    tenantId, from: fromAddress, to, subject, bodyLength: body?.length,
  });
  return {
    channel: 'email', to, subject, status: 'sent',
    timestamp: new Date().toISOString(), messageId: `stub-email-${Date.now()}`,
  };
}

export async function sendSMS(to, message, tenantId) {
  const config = await getTenantChannelConfig(tenantId);
  const fromNumber = config.sms?.fromNumber || process.env.TWILIO_FROM_NUMBER || '+10000000000';

  // ── Twilio ──────────────────────────────────────────────────────────────────
  if (HAS_TWILIO) {
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ From: fromNumber, To: to, Body: message }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Twilio error ${response.status}: ${data.message || JSON.stringify(data)}`);
    }

    logger.info('[comms:sms] sent via Twilio', { tenantId, to, sid: data.sid });
    return { channel: 'sms', to, status: 'sent', timestamp: new Date().toISOString(), messageId: data.sid };
  }

  // ── Stub fallback ───────────────────────────────────────────────────────────
  logger.info('[comms:sms] STUB (no Twilio configured) — would send SMS', {
    tenantId, from: fromNumber, to, messageLength: message?.length,
  });
  return {
    channel: 'sms', to, status: 'sent',
    timestamp: new Date().toISOString(), messageId: `stub-sms-${Date.now()}`,
  };
}

export async function sendWhatsApp(to, message, tenantId) {
  const config = await getTenantChannelConfig(tenantId);
  const fromNumber = config.whatsapp?.fromNumber || process.env.TWILIO_FROM_NUMBER || '+10000000000';

  // ── Twilio WhatsApp ─────────────────────────────────────────────────────────
  if (HAS_TWILIO) {
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    const whatsappFrom = `whatsapp:${fromNumber}`;
    const whatsappTo   = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ From: whatsappFrom, To: whatsappTo, Body: message }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Twilio WhatsApp error ${response.status}: ${data.message || JSON.stringify(data)}`);
    }

    logger.info('[comms:whatsapp] sent via Twilio', { tenantId, to, sid: data.sid });
    return { channel: 'whatsapp', to, status: 'sent', timestamp: new Date().toISOString(), messageId: data.sid };
  }

  // ── Stub fallback ───────────────────────────────────────────────────────────
  logger.info('[comms:whatsapp] STUB (no Twilio configured) — would send WhatsApp message', {
    tenantId, from: fromNumber, to, messageLength: message?.length,
  });
  return {
    channel: 'whatsapp', to, status: 'sent',
    timestamp: new Date().toISOString(), messageId: `stub-wa-${Date.now()}`,
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
