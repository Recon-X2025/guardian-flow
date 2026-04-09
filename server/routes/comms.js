/**
 * @file server/routes/comms.js
 * @description Omnichannel Communications Hub API — Sprint 11.
 *
 * Routes
 * ------
 * POST /api/comms/send                          — send a message via channel
 * GET  /api/comms/threads/:customerId           — list threads for a customer
 * POST /api/comms/threads/:threadId/reply       — reply in a thread
 * POST /api/comms/webhooks/sms                  — inbound SMS webhook
 * POST /api/comms/webhooks/whatsapp             — inbound WhatsApp webhook
 *
 * Security
 * --------
 * - Send and thread routes require authentication.
 * - Webhook routes are unauthenticated (verified by payload signature in production).
 * - tenantId is sourced from the authenticated user's profile.
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import { getAdapter } from '../db/factory.js';
import { sendNotification } from '../services/comms.js';
import logger from '../utils/logger.js';

const router = express.Router();

const THREADS_COLLECTION = 'communication_threads';
const MESSAGES_COLLECTION = 'communication_messages';
const VALID_CHANNELS = ['email', 'sms', 'whatsapp'];

// ── POST /api/comms/send ─────────────────────────────────────────────────────

router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { channel, recipient, message, subject, customerId, workOrderId, templateId } = req.body;
    const tenantId = req.user.tenantId;

    if (!channel || !recipient || !message) {
      return res.status(400).json({ error: 'channel, recipient, and message are required' });
    }
    if (!VALID_CHANNELS.includes(channel)) {
      return res.status(400).json({
        error: `channel must be one of: ${VALID_CHANNELS.join(', ')}`,
      });
    }

    // Send via the unified adapter
    const result = await sendNotification(channel, recipient, message, {
      tenantId,
      subject,
    });

    // Persist in comms thread
    const adapter = await getAdapter();
    const now = new Date().toISOString();

    // Upsert thread (find existing open thread for this customer/channel or create one)
    let thread = customerId
      ? await adapter.findOne(THREADS_COLLECTION, {
          tenant_id: tenantId,
          customer_id: customerId,
          channel,
          status: 'open',
        })
      : null;

    if (!thread) {
      thread = {
        id: randomUUID(),
        tenant_id: tenantId,
        customer_id: customerId || null,
        work_order_id: workOrderId || null,
        channel,
        subject: subject || null,
        status: 'open',
        last_message_at: now,
        message_count: 0,
        created_at: now,
        updated_at: now,
      };
      await adapter.insertOne(THREADS_COLLECTION, thread);
    }

    // Persist message in thread
    const msgRecord = {
      id: randomUUID(),
      tenant_id: tenantId,
      thread_id: thread.id,
      direction: 'outbound',
      channel,
      recipient,
      body: message,
      subject: subject || null,
      template_id: templateId || null,
      external_message_id: result.messageId,
      status: result.status,
      sent_by: req.user.id,
      created_at: now,
    };
    await adapter.insertOne(MESSAGES_COLLECTION, msgRecord);

    // Update thread metadata
    await adapter.updateOne(
      THREADS_COLLECTION,
      { id: thread.id, tenant_id: tenantId },
      { $set: { last_message_at: now, updated_at: now }, $inc: { message_count: 1 } },
    );

    res.status(201).json({
      messageId: msgRecord.id,
      threadId: thread.id,
      channel,
      status: result.status,
      timestamp: result.timestamp,
    });
  } catch (err) {
    logger.error('comms send error', { error: err.message });
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ── GET /api/comms/threads/:customerId ───────────────────────────────────────

router.get('/threads/:customerId', authenticateToken, async (req, res) => {
  try {
    const { customerId } = req.params;
    const tenantId = req.user.tenantId;
    const { channel, status } = req.query;

    const adapter = await getAdapter();

    const filter = { tenant_id: tenantId, customer_id: customerId };
    if (channel) filter.channel = channel;
    if (status) filter.status = status;

    const threads = await adapter.find(THREADS_COLLECTION, filter);

    // For each thread, fetch recent messages
    const threadsWithMessages = await Promise.all(
      threads.map(async (thread) => {
        const messages = await adapter.find(MESSAGES_COLLECTION, {
          tenant_id: tenantId,
          thread_id: thread.id,
        });
        // Sort by created_at ascending
        messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        return { ...thread, messages };
      }),
    );

    // Sort threads by last_message_at descending
    threadsWithMessages.sort(
      (a, b) => new Date(b.last_message_at || b.created_at) - new Date(a.last_message_at || a.created_at),
    );

    res.json({ customerId, threads: threadsWithMessages });
  } catch (err) {
    logger.error('comms threads list error', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve communication threads' });
  }
});

// ── POST /api/comms/threads/:threadId/reply ───────────────────────────────────

router.post('/threads/:threadId/reply', authenticateToken, async (req, res) => {
  try {
    const { threadId } = req.params;
    const { message, subject } = req.body;
    const tenantId = req.user.tenantId;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const adapter = await getAdapter();
    const thread = await adapter.findOne(THREADS_COLLECTION, {
      id: threadId,
      tenant_id: tenantId,
    });

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Determine recipient from thread context
    const recipient = thread.customer_phone || thread.customer_email || 'unknown';

    const result = await sendNotification(thread.channel, recipient, message, {
      tenantId,
      subject,
    });

    const now = new Date().toISOString();
    const msgRecord = {
      id: randomUUID(),
      tenant_id: tenantId,
      thread_id: thread.id,
      direction: 'outbound',
      channel: thread.channel,
      recipient,
      body: message,
      subject: subject || null,
      external_message_id: result.messageId,
      status: result.status,
      sent_by: req.user.id,
      created_at: now,
    };

    await adapter.insertOne(MESSAGES_COLLECTION, msgRecord);
    await adapter.updateOne(
      THREADS_COLLECTION,
      { id: thread.id, tenant_id: tenantId },
      { $set: { last_message_at: now, updated_at: now }, $inc: { message_count: 1 } },
    );

    res.status(201).json({
      messageId: msgRecord.id,
      threadId: thread.id,
      status: result.status,
      timestamp: result.timestamp,
    });
  } catch (err) {
    logger.error('comms thread reply error', { error: err.message });
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// ── Webhook: POST /api/comms/webhooks/sms ─────────────────────────────────────

router.post('/webhooks/sms', async (req, res) => {
  try {
    logger.info('[comms:webhook:sms] Received inbound SMS', { body: req.body });

    const { From, Body, To } = req.body;
    if (!From || !Body) {
      return res.status(400).json({ error: 'From and Body are required' });
    }

    // Stub: In production, look up tenant by To number and route to matching thread
    const now = new Date().toISOString();
    logger.info('[comms:webhook:sms] Inbound message queued for processing', {
      from: From,
      to: To,
      bodyLength: Body?.length,
      receivedAt: now,
    });

    // Respond 200 immediately (Twilio/provider expects fast ACK)
    res.status(200).json({ received: true });
  } catch (err) {
    logger.error('comms sms webhook error', { error: err.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ── Webhook: POST /api/comms/webhooks/whatsapp ────────────────────────────────

router.post('/webhooks/whatsapp', async (req, res) => {
  try {
    logger.info('[comms:webhook:whatsapp] Received inbound WhatsApp message', { body: req.body });

    const { entry } = req.body;
    if (!entry) {
      // WhatsApp verification challenge
      if (req.query['hub.challenge']) {
        return res.status(200).send(req.query['hub.challenge']);
      }
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    const now = new Date().toISOString();
    logger.info('[comms:webhook:whatsapp] Inbound WA message queued for processing', {
      receivedAt: now,
    });

    res.status(200).json({ received: true });
  } catch (err) {
    logger.error('comms whatsapp webhook error', { error: err.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
