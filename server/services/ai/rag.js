import { randomUUID } from 'crypto';
import { chatCompletion } from './llm.js';
import { generateEmbedding, chunkText, vectorSearch, indexDocument as indexChunks } from './embeddings.js';
import { PROMPTS } from './prompts.js';
import { findOne, findMany, countDocuments } from '../../db/query.js';

export async function indexDocument(articleId) {
  const article = await findOne('knowledge_base_articles', { id: articleId });
  if (!article) throw new Error(`Article ${articleId} not found`);

  const content = `${article.title}\n\n${article.content}`;
  const metadata = {
    title: article.title,
    category_id: article.category_id,
    source: article.title,
  };

  return indexChunks(articleId, content, metadata);
}

export async function query(question, tenantId, topK = 5) {
  // Generate embedding for the question
  const questionVector = await generateEmbedding(question);

  // Search for relevant chunks
  const filter = {};
  const chunks = await vectorSearch('knowledge_base_chunks', questionVector, topK, filter);

  if (chunks.length === 0) {
    return {
      answer: 'I could not find relevant information in the knowledge base to answer your question. Please try rephrasing or check that relevant articles have been indexed.',
      sources: [],
      chunks_searched: 0,
    };
  }

  // Build contexts for the prompt
  const contexts = chunks.map(chunk => ({
    content: chunk.content,
    source: chunk.metadata?.source || chunk.metadata?.title || 'Knowledge Base',
    article_id: chunk.article_id,
    similarity: chunk.similarity || 0,
  }));

  // Call LLM with RAG prompt
  const messages = [
    { role: 'system', content: PROMPTS.RAG_ANSWER.system },
    { role: 'user', content: PROMPTS.RAG_ANSWER.user(question, contexts) },
  ];

  const result = await chatCompletion(messages, { feature: 'rag', tenant_id: tenantId });

  return {
    answer: result.content,
    sources: contexts.map(c => ({ source: c.source, article_id: c.article_id, relevance: c.similarity })),
    chunks_searched: chunks.length,
    model: result.model,
    provider: result.provider,
  };
}

export async function reindexAll(tenantId) {
  const articles = await findMany('knowledge_base_articles', { status: 'published' }, { limit: 1000 });

  let indexed = 0;
  let errors = 0;
  for (const article of articles) {
    try {
      await indexDocument(article.id);
      indexed++;
    } catch (e) {
      console.warn(`Error indexing article ${article.id}:`, e.message);
      errors++;
    }
  }

  return { indexed, errors, total: articles.length };
}

export async function getStats() {
  const totalChunks = await countDocuments('knowledge_base_chunks', {});
  const totalArticles = await countDocuments('knowledge_base_articles', { status: 'published' });

  return {
    totalDocuments: totalArticles,
    totalChunks,
    vectorDimension: 1536,
    lastIndexed: new Date().toISOString(),
  };
}
