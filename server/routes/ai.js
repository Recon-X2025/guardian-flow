import express from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import * as rag from '../services/ai/rag.js';
import { chatCompletion, chatCompletionStream } from '../services/ai/llm.js';
import { PROMPTS } from '../services/ai/prompts.js';
import { detectWorkOrderAnomalies, detectFinancialAnomalies } from '../services/ai/anomaly.js';
import { getModelHealth, getGovernanceLogs, seedModelRegistry } from '../services/ai/governance.js';
import { findMany, countDocuments } from '../db/query.js';

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
    res.json(result);
  } catch (error) {
    console.error('RAG query error:', error);
    res.status(500).json({ error: error.message || 'RAG query failed' });
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
    res.status(500).json({ error: error.message || 'Indexing failed' });
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
    res.status(500).json({ error: error.message || 'Reindexing failed' });
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
    res.status(500).json({ error: error.message });
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
        res.write(`data: ${JSON.stringify({ error: streamError.message })}\n\n`);
      }
      res.end();
    } else {
      // Non-streaming
      const result = await chatCompletion(fullMessages, { feature: 'assistant', tenant_id: req.user.id });
      res.json({ content: result.content, model: result.model, provider: result.provider });
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message || 'Chat failed' });
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
    res.status(500).json({ error: error.message || 'Summarization failed' });
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

    if (!query || !query.collection || !query.pipeline) {
      return res.json({ answer: result.content, query: null, results: null });
    }

    // Safety: disallow dangerous stages
    const dangerous = ['$out', '$merge'];
    const hasDangerous = query.pipeline.some(stage =>
      Object.keys(stage).some(k => dangerous.includes(k))
    );
    if (hasDangerous) {
      return res.status(400).json({ error: 'Query contains disallowed operations ($out/$merge)' });
    }

    // Inject tenant_id filter and $limit
    const hasLimit = query.pipeline.some(s => s.$limit);
    if (!hasLimit) query.pipeline.push({ $limit: 1000 });

    // Inject tenant_id into first $match
    const firstMatch = query.pipeline.find(s => s.$match);
    if (firstMatch) {
      firstMatch.$match.tenant_id = tenantId;
    } else {
      query.pipeline.unshift({ $match: { tenant_id: tenantId } });
    }

    // Execute
    const { aggregate } = await import('../db/query.js');
    const results = await aggregate(query.collection, query.pipeline);

    res.json({
      answer: result.content,
      query,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error('NLP query error:', error);
    res.status(500).json({ error: error.message || 'NLP query failed' });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
});

export default router;
