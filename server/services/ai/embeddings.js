import { embedding } from './llm.js';
import { findMany, insertOne, updateOne, deleteMany, countDocuments, aggregate } from '../../db/query.js';
import { randomUUID } from 'crypto';

export { embedding as generateEmbedding };

export function chunkText(text, maxChars = 2000, overlap = 200) {
  if (!text || text.length <= maxChars) return [text || ''];

  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    // Try to break at sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > start + maxChars / 2) end = breakPoint + 1;
    }
    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
    if (start >= text.length) break;
  }
  return chunks.filter(c => c.length > 0);
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export async function vectorSearch(collectionName, queryVector, limit = 5, filter = {}) {
  // Fetch documents in paginated batches to avoid the hard 500-document cap
  // that silently under-samples the corpus at enterprise scale.
  //
  // When the DB adapter is PostgreSQL + pgvector, the caller should bypass
  // this function and use native "<=> ORDER BY" SQL instead (see docs/QA_HARDENING_REPORT.md D3).
  // For the MongoDB adapter this brute-force approach is correct for corpora
  // up to ~50k documents; above that, migrate to pgvector + HNSW indexing.
  try {
    const PAGE_SIZE = 2_000;
    let allDocs = [];
    let page = 0;

    while (true) {
      const batch = await findMany(collectionName, filter, {
        limit: PAGE_SIZE,
        skip:  page * PAGE_SIZE,
      });
      if (!batch || batch.length === 0) break;
      allDocs = allDocs.concat(batch);
      if (batch.length < PAGE_SIZE) break;  // last page
      page++;
    }

    if (!queryVector || allDocs.length === 0) return allDocs.slice(0, limit);

    // Score by cosine similarity — O(n × d); acceptable up to ~50k docs
    const scored = allDocs
      .filter(doc => doc.embedding && doc.embedding.length > 0)
      .map(doc => ({
        ...doc,
        similarity: cosineSimilarity(queryVector, doc.embedding),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return scored;
  } catch (error) {
    console.error('Vector search error:', error.message);
    return [];
  }
}

export async function indexDocument(articleId, content, metadata = {}) {
  const chunks = chunkText(content);

  // Delete existing chunks for this article
  try {
    await deleteMany('knowledge_base_chunks', { article_id: articleId });
  } catch (e) { /* collection may not exist yet */ }

  const chunkDocs = [];
  for (let i = 0; i < chunks.length; i++) {
    const vector = await embedding(chunks[i]);
    chunkDocs.push({
      id: randomUUID(),
      article_id: articleId,
      chunk_index: i,
      content: chunks[i],
      embedding: vector,
      metadata: {
        ...metadata,
        chunk_length: chunks[i].length,
        total_chunks: chunks.length,
      },
      created_at: new Date(),
    });
  }

  for (const doc of chunkDocs) {
    try {
      await insertOne('knowledge_base_chunks', doc);
    } catch (e) {
      console.warn('Error inserting chunk:', e.message);
    }
  }

  return { chunks_created: chunkDocs.length, article_id: articleId };
}
