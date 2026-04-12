import { getAdapter } from '../db/factory.js';
import { randomUUID } from 'crypto';

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/;
const SSN_RE = /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/;
const PROFANITY = ['badword1','badword2','shit','fuck','damn','crap','ass','bitch','bastard','hell'];

function contentSafetyCheck(text) {
  if (!text) return { flagged: false, reason: null };
  if (EMAIL_RE.test(text)) return { flagged: true, reason: 'PII: email detected' };
  if (PHONE_RE.test(text)) return { flagged: true, reason: 'PII: phone number detected' };
  if (SSN_RE.test(text)) return { flagged: true, reason: 'PII: SSN pattern detected' };
  const lower = text.toLowerCase();
  for (const word of PROFANITY) {
    if (lower.includes(word)) return { flagged: true, reason: `profanity: "${word}"` };
  }
  return { flagged: false, reason: null };
}

export async function wrapLLMCall(tenantId, endpoint, fn) {
  const adapter = await getAdapter();

  // Check token budget
  let budget = null;
  try {
    budget = await adapter.findOne('tenant_token_budgets', { tenantId });
    if (!budget) {
      budget = { id: randomUUID(), tenantId, monthly_limit: 1000000, current_month_usage: 0, reset_date: new Date() };
      await adapter.insertOne('tenant_token_budgets', budget);
    }
    if (budget.current_month_usage >= budget.monthly_limit) {
      const err = new Error('Token budget exceeded for this month');
      err.code = 'token_budget_exceeded';
      err.status = 429;
      throw err;
    }
  } catch (e) {
    if (e.code === 'token_budget_exceeded') throw e;
    // non-critical budget check failure — proceed
  }

  const start = Date.now();
  const result = await fn();
  const latency_ms = Date.now() - start;

  const completionText = result?.content || '';
  const { flagged, reason } = contentSafetyCheck(completionText);

  const promptTokens = Math.round(result?.usage?.prompt_tokens || 0);
  const completionTokens = Math.round(result?.usage?.completion_tokens || 0);

  try {
    await adapter.insertOne('llm_usage_logs', {
      id: randomUUID(),
      tenantId,
      model: result?.model || 'unknown',
      endpoint,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      latency_ms,
      content_flagged: flagged,
      flag_reason: reason || null,
      timestamp: new Date(),
    });
  } catch { /* non-critical */ }

  try {
    if (budget) {
      await adapter.updateOne('tenant_token_budgets', { tenantId }, {
        $set: { current_month_usage: (budget.current_month_usage || 0) + promptTokens + completionTokens },
      });
    }
  } catch { /* non-critical */ }

  if (flagged) {
    return { ...result, content: '[Content removed due to safety policy]', content_flagged: true, flag_reason: reason };
  }
  return result;
}
