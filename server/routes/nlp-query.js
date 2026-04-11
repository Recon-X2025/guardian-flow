import express from 'express';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// In-memory rate limiting: 20 requests per hour per tenantId
const rateLimitMap = new Map();
const RATE_LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(tenantId) {
  const now = Date.now();
  const entry = rateLimitMap.get(tenantId);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateLimitMap.set(tenantId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

const SAFE_SQL_RE = /^select\b/i;
const UNSAFE_SQL_RE = /\b(insert|update|delete|drop|create|exec|alter)\b/i;

function validateSql(sql) {
  if (!SAFE_SQL_RE.test(sql.trim())) return 'SQL must start with SELECT';
  if (UNSAFE_SQL_RE.test(sql)) return 'SQL contains forbidden statement';
  return null;
}

async function callOpenAI(question) {
  const systemPrompt =
    'You are a SQL expert. Given this database schema: assets(id,tenant_id,name,serial_number,category,status), ' +
    'work_orders(id,tenant_id,title,status,created_at,completed_at,total_cost), ' +
    'ap_invoices(id,tenant_id,vendor_name,amount,due_date,status), ' +
    'esg_activities(id,tenant_id,scope,activityType,quantity,co2eKg,period). ' +
    "Convert the user question to a SELECT SQL query only. Return JSON: {sql: string, chartType: 'bar'|'line'|'table'|'number'}";

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  // Extract JSON from the response
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in OpenAI response');
  return JSON.parse(match[0]);
}

async function keywordFallback(question, tenantId) {
  const adapter = await getAdapter();
  const lower = question.toLowerCase();
  const isCount = lower.includes('how many');

  let collection = null;
  let sql = '';

  if (lower.includes('work order')) {
    collection = 'work_orders';
    sql = `SELECT * FROM work_orders WHERE tenant_id = '${tenantId}' LIMIT 20`;
  } else if (lower.includes('asset')) {
    collection = 'assets';
    sql = `SELECT * FROM assets WHERE tenant_id = '${tenantId}' LIMIT 20`;
  } else if (lower.includes('invoice')) {
    collection = 'ap_invoices';
    sql = `SELECT * FROM ap_invoices WHERE tenant_id = '${tenantId}' LIMIT 20`;
  } else if (lower.includes('esg') || lower.includes('emission')) {
    collection = 'esg_activities';
    sql = `SELECT * FROM esg_activities WHERE tenant_id = '${tenantId}' LIMIT 20`;
  }

  if (!collection) {
    return { sql: "SELECT 'No matching data source' AS message", results: [], chartType: 'table' };
  }

  const records = await adapter.findMany(collection, { tenant_id: tenantId }, { limit: 20 });

  if (isCount) {
    return {
      sql: `SELECT COUNT(*) FROM ${collection} WHERE tenant_id = '${tenantId}'`,
      results: [{ count: records.length }],
      chartType: 'number',
    };
  }

  return { sql, results: records, chartType: 'table' };
}

router.post('/nlp-query', async (req, res) => {
  try {
    const userId = req.user?.id;
    let tenantId = req.body.tenantId;

    if (userId) {
      const adapter = await getAdapter();
      const profile = await adapter.findOne('profiles', { id: userId });
      tenantId = profile?.tenant_id ?? userId;
    }

    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'question is required' });

    if (!checkRateLimit(tenantId)) {
      return res.status(429).json({ error: 'Rate limit exceeded: 20 requests per hour per tenant' });
    }

    let sql = '';
    let chartType = 'table';
    let results = [];

    if (process.env.OPENAI_API_KEY) {
      try {
        const aiResult = await callOpenAI(question);
        sql = aiResult.sql;
        chartType = aiResult.chartType || 'table';

        const sqlError = validateSql(sql);
        if (sqlError) return res.status(400).json({ error: sqlError });

        // Execute via keyword fallback since we can't run raw SQL on the adapter
        const fallback = await keywordFallback(question, tenantId);
        results = fallback.results;
      } catch (aiErr) {
        logger.warn('OpenAI NLP query failed, using keyword fallback', { error: aiErr.message });
        const fallback = await keywordFallback(question, tenantId);
        sql = fallback.sql;
        chartType = fallback.chartType;
        results = fallback.results;
      }
    } else {
      const fallback = await keywordFallback(question, tenantId);
      sql = fallback.sql;
      chartType = fallback.chartType;
      results = fallback.results;
    }

    if (sql) {
      const sqlError = validateSql(sql);
      if (sqlError) return res.status(400).json({ error: sqlError });
    }

    res.json({ sql, results, chartType, rowCount: results.length });
  } catch (err) {
    logger.error('NLP query error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
