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
  // Use MongoDB Atlas $vectorSearch when ATLAS_VECTOR_SEARCH=true and a vector is available
  if (process.env.ATLAS_VECTOR_SEARCH === 'true' && queryVector && queryVector.length > 0) {
    try {
      const pipeline = [
        {
          $vectorSearch: {
            index: `${collectionName}_vector_index`,
            path: 'embedding',
            queryVector,
            numCandidates: limit * 10,
            limit,
            ...(Object.keys(filter).length > 0 ? { filter } : {}),
          },
        },
        {
          $addFields: {
            similarity: { $meta: 'vectorSearchScore' },
          },
        },
      ];
      const results = await aggregate(collectionName, pipeline);
      if (results && results.length > 0) return results;
      // Fall through to brute-force if no results (empty collection / index not ready)
    } catch (atlasError) {
      console.warn('Atlas $vectorSearch failed, falling back to cosine similarity:', atlasError.message);
    }
  }

  // Brute-force cosine similarity fallback (local dev / non-Atlas environments)
  try {
    const allDocs = await findMany(collectionName, filter, { limit: 500 });

    if (!queryVector || allDocs.length === 0) return allDocs.slice(0, limit);

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
