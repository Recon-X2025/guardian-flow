/**
 * @file server/scripts/create-vector-index.js
 * @description Creates the MongoDB Atlas Vector Search index on `knowledge_base_chunks`.
 *
 * Prerequisites
 * -------------
 * 1. MongoDB Atlas cluster (M10+ tier supports Atlas Search / Vector Search)
 * 2. MONGODB_URI set to the Atlas connection string
 * 3. Atlas Data API or MongoDB driver ≥ 6.x
 *
 * Usage
 * -----
 *   node server/scripts/create-vector-index.js
 *
 * The script is idempotent — it checks for an existing index and skips creation
 * if one already exists with the same name.
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/';
const DB_NAME     = process.env.DB_NAME     || 'guardianflow';
const COLLECTION  = 'knowledge_base_chunks';
const INDEX_NAME  = `${COLLECTION}_vector_index`;

const INDEX_DEFINITION = {
  fields: [
    {
      type: 'vector',
      path: 'embedding',
      numDimensions: 1536,   // text-embedding-3-small dimension
      similarity: 'cosine',
    },
    {
      type: 'filter',
      path: 'article_id',
    },
    {
      type: 'filter',
      path: 'metadata.category_id',
    },
  ],
};

async function main() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db         = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    // Check if the index already exists
    const existingIndexes = await collection.listSearchIndexes().toArray().catch(() => []);
    const alreadyExists = existingIndexes.some(idx => idx.name === INDEX_NAME);

    if (alreadyExists) {
      console.log(`✅ Vector index "${INDEX_NAME}" already exists — skipping creation.`);
      return;
    }

    // Create the vector search index
    await collection.createSearchIndex({
      name: INDEX_NAME,
      type: 'vectorSearch',
      definition: INDEX_DEFINITION,
    });

    console.log(`✅ Created Atlas Vector Search index "${INDEX_NAME}" on ${DB_NAME}.${COLLECTION}`);
    console.log('   numDimensions: 1536 (text-embedding-3-small)');
    console.log('   similarity: cosine');
    console.log('   filter fields: article_id, metadata.category_id');
    console.log('\nNext steps:');
    console.log('  1. Wait for the index to become ACTIVE in the Atlas UI (usually 1–5 minutes)');
    console.log('  2. Set ATLAS_VECTOR_SEARCH=true in your .env');
    console.log('  3. Run: node server/scripts/phase0-migration.js (if not already done)');
    console.log('  4. Trigger a re-index: POST /api/ai/rag/reindex');
  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error('Failed to create vector index:', err.message);
  process.exit(1);
});
