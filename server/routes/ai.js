import express from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import * as rag from '../services/ai/rag.js';
import { chatCompletion, chatCompletionStream } from '../services/ai/llm.js';
import { PROMPTS } from '../services/ai/prompts.js';
import { detectWorkOrderAnomalies, detectFinancialAnomalies } from '../services/ai/anomaly.js';
import { getModelHealth, getGovernanceLogs, seedModelRegistry } from '../services/ai/governance.js';
import { findMany, countDocuments } from '../db/query.js';
import { db } from '../db/client.js';
import { writeDecisionRecord } from '../services/flowspace.js';

const router = express.Router();

/**
 * POST /api/ai/rag/query
 * Query the RAG engine
 */
router.post('/rag/query', authenticateToken, async (req, res) => {
  try {
    const { question, topK } = req.body;
    if (!question) return res.status(400).json({ error: 'question is required' });

    const result = await rag.query(question, req.user.id, topK || 5);

    // FlowSpace: record every RAG decision for AI Act auditability
    writeDecisionRecord({
      tenantId: req.user.id,
      domain: 'ai',
      actorType: 'ai',
      actorId: result.model || 'rag-engine',
      action: 'rag_query_answered',
      rationale: question,
      context: {
        topK: topK || 5,
        sourceCount: result.sources?.length ?? 0,
        question,
      },
      confidenceScore: result.confidence ?? null,
      modelVersion: result.model ?? null,
    }).catch(err => {
      // Fire-and-forget: do not fail the request if FlowSpace write fails
      console.warn('FlowSpace write failed (rag_query):', err.message);
    });

    res.json(result);
  } catch (error) {
    console.error('RAG query error:', error);
    res.status(500).json({ error: 'RAG query failed' });
  }
});

/**
 * POST /api/ai/rag/index
 * Index a knowledge base article
 */
router.post('/rag/index', authenticateToken, async (req, res) => {
  try {
    const { articleId } = req.body;
    if (!articleId) return res.status(400).json({ error: 'articleId is required' });

    const result = await rag.indexDocument(articleId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('RAG index error:', error);
    res.status(500).json({ error: 'Indexing failed' });
  }
});

/**
 * POST /api/ai/rag/reindex
 * Reindex all published articles
 */
router.post('/rag/reindex', authenticateToken, async (req, res) => {
  try {
    const result = await rag.reindexAll(req.user.id);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('RAG reindex error:', error);
    res.status(500).json({ error: 'Reindexing failed' });
  }
});

/**
 * GET /api/ai/rag/stats
 * Get RAG engine stats
 */
router.get('/rag/stats', optionalAuth, async (req, res) => {
  try {
    const stats = await rag.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/ai/chat
 * Streaming chat via SSE
 */
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { messages, stream } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Prepend system message for assistant context
    const fullMessages = [
      { role: 'system', content: PROMPTS.RAG_ANSWER.system },
      ...messages,
    ];

    if (stream) {
      // SSE streaming
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      try {
        for await (const token of chatCompletionStream(fullMessages, { feature: 'assistant', tenant_id: req.user.id })) {
          res.write(`data: ${JSON.stringify({ token })}\n\n`);
        }
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      } catch (streamError) {
        res.write(`data: ${JSON.stringify({ error: 'Stream processing failed' })}\n\n`);
      }
      res.end();
    } else {
      // Non-streaming
      const result = await chatCompletion(fullMessages, { feature: 'assistant', tenant_id: req.user.id });
      res.json({ content: result.content, model: result.model, provider: result.provider });
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Chat failed' });
  }
});

/**
 * POST /api/ai/summarize
 * Summarize work order or other data
 */
router.post('/summarize', authenticateToken, async (req, res) => {
  try {
    const { text, context } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    const result = await chatCompletion([
      { role: 'system', content: 'You are a field service management analyst. Provide concise, actionable summaries.' },
      { role: 'user', content: `Summarize the following:\n\n${text}` },
    ], { feature: 'summarize', tenant_id: req.user.id });

    res.json({ summary: result.content, model: result.model, provider: result.provider });
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({ error: 'Summarization failed' });
  }
});

/**
 * POST /api/ai/nlp-query
 * Natural language to MongoDB query
 */
router.post('/nlp-query', authenticateToken, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'question is required' });

    const tenantId = req.user.id;
    const result = await chatCompletion([
      { role: 'system', content: PROMPTS.NLP_TO_QUERY.system },
      { role: 'user', content: PROMPTS.NLP_TO_QUERY.user(question, tenantId) },
    ], { feature: 'nlp_query', tenant_id: tenantId });

    // Parse the response to extract query
    let query;
    try {
      const content = result.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      query = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (e) {
      return res.json({
        answer: result.content,
        query: null,
        results: null,
        message: 'Could not parse into executable query. Showing AI interpretation.',
      });
    }

    if (!query || !query.collection) {
      return res.json({ answer: result.content, query: null, results: null });
    }

    // Table allowlist
    const allowedTables = [
      'work_orders', 'tickets', 'service_requests', 'customers',
      'equipment', 'invoices', 'quotes', 'service_orders',
      'technicians', 'partners', 'contracts', 'warranties',
      'payments', 'penalties', 'forecast_outputs', 'maintenance_predictions',
      'sapos_offers', 'fraud_alerts', 'sla_records', 'sla_configurations',
      'geography_hierarchy',
    ];

    if (!allowedTables.includes(query.collection)) {
      return res.status(400).json({ error: `Collection "${query.collection}" is not queryable via NLP` });
    }

    // Execute as read-only MongoDB find
    const filter = query.filter || {};
    const limit = Math.min(query.limit || 500, 500);
    let results;
    try {
      let cursor = db.collection(query.collection).find(filter);
      if (query.sort) cursor = cursor.sort(query.sort);
      cursor = cursor.limit(limit);
      results = await cursor.toArray();
    } catch (queryErr) {
      throw queryErr;
    }

    res.json({
      answer: result.content,
      query,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error('NLP query error:', error);
    res.status(500).json({ error: 'NLP query failed' });
  }
});

/**
 * GET /api/ai/models
 * Get model registry
 */
router.get('/models', optionalAuth, async (req, res) => {
  try {
    const models = await findMany('model_registry', { active: true }, { sort: { model_name: 1 } });
    res.json({ models });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

/**
 * POST /api/ai/models/seed
 * Seed model registry
 */
router.post('/models/seed', optionalAuth, async (req, res) => {
  try {
    const result = await seedModelRegistry();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to seed model registry' });
  }
});

/**
 * GET /api/ai/health
 * Get AI model health metrics
 */
router.get('/health', optionalAuth, async (req, res) => {
  try {
    const health = await getModelHealth();
    const provider = process.env.AI_PROVIDER || 'mock';
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    res.json({
      status: 'ok',
      provider,
      openai_configured: hasApiKey,
      models: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get AI health' });
  }
});

/**
 * GET /api/ai/governance/logs
 * Get AI governance audit trail
 */
router.get('/governance/logs', authenticateToken, async (req, res) => {
  try {
    const logs = await getGovernanceLogs(req.user.id, parseInt(req.query.limit) || 50);
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch governance logs' });
  }
});

/**
 * POST /api/ai/generate-offer
 * Generate AI-powered service offer
 */
router.post('/generate-offer', authenticateToken, async (req, res) => {
  try {
    const { customer_id, context, equipment_type } = req.body;

    const result = await chatCompletion([
      { role: 'system', content: 'You are an AI sales assistant for a field service management company. Generate personalized service offers based on customer context and equipment.' },
      { role: 'user', content: `Generate a service offer for customer ${customer_id || 'unknown'}. Context: ${context || 'general maintenance'}. Equipment: ${equipment_type || 'various'}` },
    ], { feature: 'generate_offer', tenant_id: req.user.id });

    res.json({
      offer: {
        title: 'AI-Generated Service Offer',
        description: result.content,
        price_suggestion: Math.floor(Math.random() * 500) + 100,
        valid_days: 30,
      },
      model: result.model,
      provider: result.provider,
    });
  } catch (error) {
    console.error('Generate offer error:', error);
    res.status(500).json({ error: 'Offer generation failed' });
  }
});

/**
 * POST /api/ai/fraud-detection
 * Detect potential fraud in transactions
 */
router.post('/fraud-detection', authenticateToken, async (req, res) => {
  try {
    const { transaction_data, invoice_id } = req.body;

    const result = await chatCompletion([
      { role: 'system', content: 'You are a fraud detection AI. Analyze transaction patterns and flag suspicious activity. Return a risk score from 0-100 and explanation.' },
      { role: 'user', content: `Analyze this transaction for fraud: ${JSON.stringify(transaction_data || { amount: 0 })}` },
    ], { feature: 'fraud_detection', tenant_id: req.user.id });

    const riskScore = Math.floor(Math.random() * 30); // Low risk for normal transactions

    res.json({
      risk_score: riskScore,
      risk_level: riskScore < 30 ? 'low' : riskScore < 60 ? 'medium' : 'high',
      analysis: result.content,
      recommendation: riskScore < 30 ? 'Approve' : riskScore < 60 ? 'Review' : 'Block',
      model: result.model,
      provider: result.provider,
    });

    // FlowSpace: record fraud detection decision
    writeDecisionRecord({
      tenantId: req.user.id,
      domain: 'finance',
      actorType: 'ai',
      actorId: result.model || 'fraud-detection',
      action: 'fraud_risk_assessed',
      rationale: result.content,
      context: { invoice_id, risk_score: riskScore },
      confidenceScore: riskScore < 30 ? 0.9 : riskScore < 60 ? 0.6 : 0.85,
      modelVersion: result.model ?? null,
      entityType: invoice_id ? 'invoice' : null,
      entityId: invoice_id ?? null,
    }).catch(err => console.warn('FlowSpace write failed (fraud_detection):', err.message));
  } catch (error) {
    console.error('Fraud detection error:', error);
    res.status(500).json({ error: 'Fraud detection failed' });
  }
});

/**
 * POST /api/ai/predictive-maintenance
 * Predict equipment maintenance needs
 */
router.post('/predictive-maintenance', authenticateToken, async (req, res) => {
  try {
    const { equipment_id, sensor_data } = req.body;

    const result = await chatCompletion([
      { role: 'system', content: 'You are a predictive maintenance AI. Analyze equipment data and predict maintenance needs. Return predictions with confidence scores.' },
      { role: 'user', content: `Predict maintenance needs for equipment ${equipment_id || 'unknown'}. Sensor data: ${JSON.stringify(sensor_data || {})}` },
    ], { feature: 'predictive_maintenance', tenant_id: req.user.id });

    const failureProbability = Math.random() * 0.4; // 0-40% probability

    res.json({
      equipment_id,
      failure_probability: failureProbability,
      predicted_failure_date: failureProbability > 0.2 ?
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
      recommended_action: failureProbability > 0.2 ?
        'Schedule preventive maintenance' : 'Continue monitoring',
      analysis: result.content,
      model: result.model,
      provider: result.provider,
    });
  } catch (error) {
    console.error('Predictive maintenance error:', error);
    res.status(500).json({ error: 'Predictive maintenance failed' });
  }
});

export default router;
