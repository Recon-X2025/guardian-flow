import { db, client } from './client.js';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Get a collection by name (for direct MongoDB operations)
 */
export function getCollection(name) {
  return db.collection(name);
}

/**
 * Execute a transaction
 */
export async function transaction(callback) {
  const session = client.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await callback(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

/**
 * Find multiple documents from a collection.
 * @param {string} table - collection name
 * @param {object} filter - MongoDB filter object
 * @param {object} opts - { sort, limit, skip, projection }
 */
export async function findMany(table, filter = {}, opts = {}) {
  const start = Date.now();
  try {
    let cursor = db.collection(table).find(filter);
    if (opts.projection) cursor = cursor.project(opts.projection);
    if (opts.sort) cursor = cursor.sort(opts.sort);
    if (opts.skip) cursor = cursor.skip(opts.skip);
    if (opts.limit) cursor = cursor.limit(opts.limit);
    const results = await cursor.toArray();
    const duration = Date.now() - start;
    if (!isProduction) {
      console.log('Executed query', { collection: table, duration, rows: results.length });
    } else if (duration > 1000) {
      console.warn('Slow query', { collection: table, duration, rows: results.length });
    }
    return results;
  } catch (error) {
    if (isProduction) {
      console.error('Query error', { collection: table, duration: Date.now() - start, error: error.message });
    } else {
      console.error('Query error', { collection: table, error: error.message });
    }
    throw error;
  }
}

/**
 * Find a single document from a collection.
 */
export async function findOne(table, filter = {}) {
  const start = Date.now();
  try {
    const result = await db.collection(table).findOne(filter);
    const duration = Date.now() - start;
    if (!isProduction) {
      console.log('Executed query', { collection: table, duration, rows: result ? 1 : 0 });
    }
    return result || null;
  } catch (error) {
    console.error('Query error', { collection: table, error: error.message });
    throw error;
  }
}

/**
 * Insert a single document. Returns the inserted doc with _id.
 */
export async function insertOne(table, doc) {
  const start = Date.now();
  try {
    const result = await db.collection(table).insertOne({ ...doc });
    const duration = Date.now() - start;
    if (!isProduction) {
      console.log('Executed insert', { collection: table, duration });
    }
    return { ...doc, _id: result.insertedId };
  } catch (error) {
    // Duplicate key — return null (matches previous ON CONFLICT DO NOTHING behavior)
    if (error.code === 11000) {
      return null;
    }
    console.error('Insert error', { collection: table, error: error.message });
    throw error;
  }
}

/**
 * Insert multiple documents.
 */
export async function insertMany(table, docs) {
  if (!docs || docs.length === 0) return [];
  const start = Date.now();
  try {
    const result = await db.collection(table).insertMany(docs, { ordered: false });
    const duration = Date.now() - start;
    if (!isProduction) {
      console.log('Executed insertMany', { collection: table, duration, count: result.insertedCount });
    }
    return docs.map((doc, i) => ({ ...doc, _id: result.insertedIds[i] }));
  } catch (error) {
    // Partial insert with duplicates
    if (error.code === 11000) {
      return docs;
    }
    console.error('InsertMany error', { collection: table, error: error.message });
    throw error;
  }
}

/**
 * Update a single document matching filter.
 * Supports $set, $setOnInsert, or direct field updates.
 * The upsert option inserts if no matching document exists.
 */
export async function updateOne(table, filter, update, opts = {}) {
  const start = Date.now();
  try {
    // Build update operation
    let updateOp = {};
    if (update.$set || update.$setOnInsert || update.$inc || update.$push || update.$unset) {
      updateOp = { ...update };
    } else {
      // Treat entire update object as $set
      updateOp = { $set: { ...update } };
    }

    const result = await db.collection(table).findOneAndUpdate(
      filter,
      updateOp,
      {
        upsert: opts.upsert || false,
        returnDocument: 'after',
      }
    );

    const duration = Date.now() - start;
    if (!isProduction) {
      console.log('Executed update', { collection: table, duration });
    }
    return result || null;
  } catch (error) {
    console.error('Update error', { collection: table, error: error.message });
    throw error;
  }
}

/**
 * Delete documents matching a filter.
 */
export async function deleteMany(table, filter = {}) {
  const start = Date.now();
  try {
    const result = await db.collection(table).deleteMany(filter);
    const duration = Date.now() - start;
    if (!isProduction) {
      console.log('Executed delete', { collection: table, duration, count: result.deletedCount });
    }
    return result.deletedCount;
  } catch (error) {
    console.error('Delete error', { collection: table, error: error.message });
    throw error;
  }
}

/**
 * Count documents matching a filter.
 */
export async function countDocuments(table, filter = {}) {
  try {
    return await db.collection(table).countDocuments(filter);
  } catch (error) {
    console.error('Count error', { collection: table, error: error.message });
    throw error;
  }
}

/**
 * Run an aggregation pipeline on a collection.
 */
export async function aggregate(table, pipeline) {
  const start = Date.now();
  try {
    const results = await db.collection(table).aggregate(pipeline).toArray();
    const duration = Date.now() - start;
    if (!isProduction) {
      console.log('Executed aggregation', { collection: table, duration, rows: results.length });
    }
    return results;
  } catch (error) {
    console.error('Aggregation error', { collection: table, error: error.message });
    throw error;
  }
}
