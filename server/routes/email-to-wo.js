/**
 * @file server/routes/email-to-wo.js
 * @description Email → Work Order AI import — Sprint 35.
 *
 * Routes
 * ------
 * POST /api/work-orders/from-email
 *   body: { subject, body, senderEmail, tenantId }
 *   Returns: { workOrderId, extracted: { title, description, priority, customerRef, siteAddress, requiredSkills }, confidence }
 *
 * Uses OpenAI if OPENAI_API_KEY is set, otherwise uses keyword-extraction fallback.
 * If confidence < 0.6 the WO is created with status 'pending_review'.
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';
import { chatCompletion } from '../services/ai/llm.js';

const router = express.Router();
const WO_COL = 'work_orders';

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

/** Keyword-extraction fallback — no LLM required */
function keywordExtract(subject, body) {
  const text     = `${subject} ${body}`.toLowerCase();
  const fullText = `${subject}\n${body}`;

  let priority = 'medium';
  if (/urgent|emergency|critical|asap|immediately/.test(text)) priority = 'high';
  else if (/low\s+priority|when\s+possible|no\s+rush/.test(text))          priority = 'low';

  const requiredSkills = [];
  const skillKeywords  = ['electrical', 'plumbing', 'hvac', 'mechanical', 'it', 'network', 'cleaning', 'inspection'];
  for (const skill of skillKeywords) {
    if (text.includes(skill)) requiredSkills.push(skill);
  }

  // First non-empty line of the subject or body as title
  const title = (subject?.trim() || fullText.split('\n').find(l => l.trim()) || 'Email Work Order').slice(0, 120);

  // Address-like pattern: e.g. "123 Main St" or "at 45 Park Avenue"
  const addressMatch = fullText.match(/(?:at|@|address[:\s]+)([0-9]+[^,\n]{5,50}(?:st|street|ave|avenue|rd|road|blvd|drive|dr|lane|ln)[^,\n]*)/i);
  const siteAddress  = addressMatch ? addressMatch[1].trim() : null;

  // Customer ref: look for "ref:", "order:", "ticket:", "account:"
  const refMatch    = fullText.match(/(?:ref|order|ticket|account|customer)[:\s#]+([A-Z0-9\-]{3,20})/i);
  const customerRef = refMatch ? refMatch[1].trim() : null;

  return {
    extracted: { title, description: body?.slice(0, 500) || '', priority, customerRef, siteAddress, requiredSkills },
    confidence: 0.5,
  };
}

/** LLM-based extraction via OpenAI */
async function llmExtract(subject, body, senderEmail) {
  const prompt = `You are an assistant that extracts work order details from incoming emails.

Email subject: ${subject}
Sender: ${senderEmail || 'unknown'}
Email body:
${body}

Extract the following fields and return ONLY valid JSON with no markdown:
{
  "title": "short title (max 120 chars)",
  "description": "full description",
  "priority": "low|medium|high|critical",
  "customerRef": "customer reference or null",
  "siteAddress": "site address or null",
  "requiredSkills": ["skill1", "skill2"],
  "confidence": 0.0 to 1.0
}`;

  const result = await chatCompletion([{ role: 'user', content: prompt }], { temperature: 0.2, maxTokens: 400 });
  const raw = result.content || '';

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('LLM did not return JSON');

  const parsed = JSON.parse(jsonMatch[0]);
  const confidence = typeof parsed.confidence === 'number' ? Math.min(Math.max(parsed.confidence, 0), 1) : 0.75;
  return {
    extracted: {
      title:          parsed.title          || subject?.slice(0, 120) || 'Email Work Order',
      description:    parsed.description    || body?.slice(0, 500)    || '',
      priority:       parsed.priority       || 'medium',
      customerRef:    parsed.customerRef    || null,
      siteAddress:    parsed.siteAddress    || null,
      requiredSkills: Array.isArray(parsed.requiredSkills) ? parsed.requiredSkills : [],
    },
    confidence,
  };
}

// ── POST /api/work-orders/from-email ──────────────────────────────────────────

router.post('/from-email', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { subject, body, senderEmail } = req.body;

    if (!subject && !body) {
      return res.status(400).json({ error: 'subject or body is required' });
    }

    // Try LLM if key is available, fall back to keyword extraction
    let result;
    if (process.env.OPENAI_API_KEY) {
      try {
        result = await llmExtract(subject, body, senderEmail);
      } catch (llmErr) {
        logger.warn('Email→WO: LLM extraction failed, using keyword fallback', { error: llmErr.message });
        result = keywordExtract(subject, body);
      }
    } else {
      result = keywordExtract(subject, body);
    }

    const { extracted, confidence } = result;
    const status = confidence < 0.6 ? 'pending_review' : 'draft';

    const adapter   = await getAdapter();
    const woNumber  = `WO-${Date.now().toString(36).toUpperCase()}`;
    const workOrder = {
      id:           randomUUID(),
      tenant_id:    tenantId,
      wo_number:    woNumber,
      status,
      title:        extracted.title,
      description:  extracted.description,
      priority:     extracted.priority,
      customer_ref: extracted.customerRef,
      site_address: extracted.siteAddress,
      required_skills: extracted.requiredSkills,
      source:       'email',
      source_email: senderEmail || null,
      import_confidence: confidence,
      crowd_partner_id:  null,
      crowd_status:      null,
      multi_day:         false,
      planned_start_date: null,
      planned_end_date:   null,
      daily_schedule:    [],
      created_at:   new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    };

    await adapter.insertOne(WO_COL, workOrder);

    logger.info('Email→WO: work order created', { workOrderId: workOrder.id, status, confidence, tenantId });
    res.status(201).json({ workOrderId: workOrder.id, extracted, confidence });
  } catch (error) {
    logger.error('Email→WO: error', { error: error.message });
    res.status(500).json({ error: 'Failed to create work order from email' });
  }
});

export default router;
