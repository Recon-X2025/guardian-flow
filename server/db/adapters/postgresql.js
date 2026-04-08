/**
 * @file server/db/adapters/postgresql.js
 * @description
 * PostgreSQL adapter — satisfies the DbAdapter interface defined in
 * server/db/interface.js using the `pg` Node.js driver.
 *
 * Key mapping decisions
 * ---------------------
 * | MongoDB concept        | PostgreSQL equivalent                           |
 * |------------------------|-------------------------------------------------|
 * | Collection name        | Table name (double-quoted)                      |
 * | _id (ObjectId)         | id (uuid, gen_random_uuid())                    |
 * | filter object          | WHERE clause built via parameterised queries    |
 * | aggregate pipeline     | Raw SQL via { $rawSQL, $values } stage          |
 * | transaction callback   | BEGIN / COMMIT / ROLLBACK via pg client         |
 *
 * For aggregate() the pipeline must contain exactly one stage:
 *   { $rawSQL: 'SELECT ...', $values: [...] }
 * Full MongoDB-to-SQL pipeline translation is a planned future enhancement.
 *
 * Exports
 * -------
 *   default — the validated DbAdapter object
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { validateAdapter } from '../interface.js';

dotenv.config();

// ── Pool ──────────────────────────────────────────────────────────────────────
const pool = new pg.Pool({
  connectionString: process.env.POSTGRES_URI,
  max:                  parseInt(process.env.DB_POOL_MAX              || '20',   10),
  idleTimeoutMillis:    30000,
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECT_TIMEOUT || '5000', 10),
});

let connected = false;

pool
  .connect()
  .then(client => {
    client.release();
    connected = true;
    console.log('✅ Connected to PostgreSQL database');
  })
  .catch(err => {
    console.error('❌ PostgreSQL connection failed:', err.message);
    if (process.env.NODE_ENV === 'production') process.exit(-1);
  });

pool.on('error', err => {
  console.error('❌ Unexpected PostgreSQL error', err.message);
  connected = false;
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';

function logQuery(label, meta) {
  if (!isProduction) {
    console.log(label, meta);
  } else if (meta.duration > 1000) {
    console.warn('Slow query', meta);
  }
}

/**
 * Build a parameterised WHERE clause from a plain filter object.
 * Supports simple equality and MongoDB-style { $in: [...] } operator.
 *
 * @param {object} filter
 * @param {number} [offset=0]  - Parameter index offset for multi-clause queries
 * @returns {{ text: string, values: any[] }}
 */
function buildWhere(filter, offset = 0) {
  const keys = Object.keys(filter);
  if (keys.length === 0) return { text: '', values: [] };

  const clauses = [];
  const values  = [];

  keys.forEach(k => {
    const v = filter[k];
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      // Handle MongoDB-style operators
      if (v.$in !== undefined) {
        const placeholders = v.$in.map((_, i) => `$${offset + values.length + i + 1}`);
        clauses.push(`"${k}" = ANY(ARRAY[${placeholders.join(', ')}])`);
        values.push(...v.$in);
        return;
      }
      if (v.$gt !== undefined) {
        clauses.push(`"${k}" > $${offset + values.length + 1}`);
        values.push(v.$gt);
        return;
      }
      if (v.$gte !== undefined) {
        clauses.push(`"${k}" >= $${offset + values.length + 1}`);
        values.push(v.$gte);
        return;
      }
      if (v.$lt !== undefined) {
        clauses.push(`"${k}" < $${offset + values.length + 1}`);
        values.push(v.$lt);
        return;
      }
      if (v.$lte !== undefined) {
        clauses.push(`"${k}" <= $${offset + values.length + 1}`);
        values.push(v.$lte);
        return;
      }
    }
    // Default: equality
    clauses.push(`"${k}" = $${offset + values.length + 1}`);
    values.push(v);
  });

  return { text: 'WHERE ' + clauses.join(' AND '), values };
}

// ── Adapter methods ───────────────────────────────────────────────────────────

function isConnected() {
  return connected;
}

async function ping() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}

async function close() {
  await pool.end();
}

async function ensureIndex(collection, { keys, options = {} }) {
  const cols   = Object.entries(keys).map(([col, dir]) => `"${col}" ${dir === -1 ? 'DESC' : 'ASC'}`).join(', ');
  const unique = options.unique ? 'UNIQUE ' : '';
  const name   = `idx_${collection}_${Object.keys(keys).join('_')}`;
  try {
    await pool.query(
      `CREATE ${unique}INDEX IF NOT EXISTS "${name}" ON "${collection}" (${cols})`
    );
  } catch {
    // Already exists — safe to ignore
  }
}

async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function findMany(table, filter = {}, opts = {}) {
  const start = Date.now();
  try {
    const { text: where, values } = buildWhere(filter);

    const orderParts = opts.sort
      ? Object.entries(opts.sort).map(([col, dir]) => `"${col}" ${dir === -1 ? 'DESC' : 'ASC'}`)
      : [];
    const order  = orderParts.length > 0 ? `ORDER BY ${orderParts.join(', ')}` : '';
    const limit  = opts.limit ? `LIMIT ${parseInt(opts.limit, 10)}`  : '';
    const offset = opts.skip  ? `OFFSET ${parseInt(opts.skip, 10)}`  : '';
    const cols   = opts.projection
      ? Object.keys(opts.projection).map(c => `"${c}"`).join(', ')
      : '*';

    const { rows } = await pool.query(
      `SELECT ${cols} FROM "${table}" ${where} ${order} ${limit} ${offset}`.trim(),
      values
    );
    logQuery('Executed query', { table, duration: Date.now() - start, rows: rows.length });
    return rows;
  } catch (error) {
    console.error('Query error', { table, error: error.message });
    throw error;
  }
}

async function findOne(table, filter = {}) {
  const start = Date.now();
  try {
    const { text: where, values } = buildWhere(filter);
    const { rows } = await pool.query(
      `SELECT * FROM "${table}" ${where} LIMIT 1`.trim(),
      values
    );
    logQuery('Executed query', { table, duration: Date.now() - start, rows: rows.length });
    return rows[0] || null;
  } catch (error) {
    console.error('Query error', { table, error: error.message });
    throw error;
  }
}

async function insertOne(table, doc) {
  const start = Date.now();
  try {
    const keys  = Object.keys(doc);
    const cols  = keys.map(k => `"${k}"`).join(', ');
    const vals  = keys.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await pool.query(
      `INSERT INTO "${table}" (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING RETURNING *`,
      Object.values(doc)
    );
    logQuery('Executed insert', { table, duration: Date.now() - start });
    return rows[0] || null;
  } catch (error) {
    console.error('Insert error', { table, error: error.message });
    throw error;
  }
}

async function insertMany(table, docs) {
  if (!docs || docs.length === 0) return [];
  const start = Date.now();
  try {
    const results = await Promise.all(docs.map(doc => insertOne(table, doc)));
    logQuery('Executed insertMany', { table, duration: Date.now() - start, count: results.filter(Boolean).length });
    return results.filter(Boolean);
  } catch (error) {
    console.error('InsertMany error', { table, error: error.message });
    throw error;
  }
}

async function updateOne(table, filter, update, opts = {}) {
  const start = Date.now();
  try {
    // Unwrap MongoDB-style operators into a plain set-data object
    const setData = (update.$set || update.$setOnInsert)
      ? { ...(update.$set || {}), ...(update.$setOnInsert || {}) }
      : update;

    const setKeys    = Object.keys(setData);
    const setClause  = setKeys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');

    const { text: where, values: whereVals } = buildWhere(filter, setKeys.length);

    let sql;
    if (opts.upsert) {
      // Upsert: try insert first, then update on conflict
      const colsList = [...setKeys, ...Object.keys(filter)];
      const uniqueColsList = [...new Set(colsList)].map(k => `"${k}"`).join(', ');
      const allVals = [...Object.values(setData), ...whereVals];
      const placeholders = [...Object.values(setData), ...Object.values(filter)]
        .map((_, i) => `$${i + 1}`)
        .join(', ');
      sql = `INSERT INTO "${table}" (${uniqueColsList}) VALUES (${placeholders})
             ON CONFLICT DO UPDATE SET ${setClause} RETURNING *`;
      const { rows } = await pool.query(sql, allVals);
      logQuery('Executed upsert', { table, duration: Date.now() - start });
      return rows[0] || null;
    }

    sql = `UPDATE "${table}" SET ${setClause} ${where} RETURNING *`.trim();
    const { rows } = await pool.query(sql, [...Object.values(setData), ...whereVals]);
    logQuery('Executed update', { table, duration: Date.now() - start });
    return rows[0] || null;
  } catch (error) {
    console.error('Update error', { table, error: error.message });
    throw error;
  }
}

async function deleteMany(table, filter = {}) {
  const start = Date.now();
  try {
    const { text: where, values } = buildWhere(filter);
    const { rowCount } = await pool.query(
      `DELETE FROM "${table}" ${where}`.trim(),
      values
    );
    logQuery('Executed delete', { table, duration: Date.now() - start, count: rowCount });
    return rowCount;
  } catch (error) {
    console.error('Delete error', { table, error: error.message });
    throw error;
  }
}

async function countDocuments(table, filter = {}) {
  try {
    const { text: where, values } = buildWhere(filter);
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS count FROM "${table}" ${where}`.trim(),
      values
    );
    return parseInt(rows[0].count, 10);
  } catch (error) {
    console.error('Count error', { table, error: error.message });
    throw error;
  }
}

/**
 * Execute an aggregation.
 *
 * Because SQL has no universal equivalent to MongoDB's aggregation pipeline,
 * the PostgreSQL adapter requires callers to provide a raw SQL stage:
 *
 *   await aggregate('orders', [{ $rawSQL: 'SELECT ...', $values: [...] }])
 *
 * A full MongoDB→SQL pipeline compiler is a planned future enhancement.
 * Route handlers that currently pass native MongoDB aggregation pipelines will
 * continue to work when DB_ADAPTER=mongodb; they will need migration to use
 * $rawSQL before they can run against PostgreSQL.
 *
 * @param {string}   table
 * @param {object[]} pipeline
 * @returns {Promise<any[]>}
 */
async function aggregate(table, pipeline) {
  const start = Date.now();
  try {
    if (pipeline.length === 1 && pipeline[0].$rawSQL) {
      const { rows } = await pool.query(pipeline[0].$rawSQL, pipeline[0].$values || []);
      logQuery('Executed aggregation', { table, duration: Date.now() - start, rows: rows.length });
      return rows;
    }
    throw new Error(
      `PostgreSQL adapter: aggregate() requires a { $rawSQL, $values } pipeline stage. ` +
      `MongoDB-style pipeline stages are not yet supported. ` +
      `Pass DB_ADAPTER=mongodb to use native MongoDB aggregation.`
    );
  } catch (error) {
    console.error('Aggregation error', { table, error: error.message });
    throw error;
  }
}

// ── Validated adapter export ──────────────────────────────────────────────────
const postgresAdapter = validateAdapter({
  findMany,
  findOne,
  insertOne,
  insertMany,
  updateOne,
  deleteMany,
  countDocuments,
  aggregate,
  transaction,
  isConnected,
  ping,
  ensureIndex,
  close,
});

export default postgresAdapter;
