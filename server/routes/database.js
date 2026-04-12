import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getUserTenantId } from '../middleware/rbac.js';
import { db } from '../db/client.js';
import { findOne, findMany } from '../db/query.js';

const router = express.Router();

// --- Identifier validation (unchanged) ---

/** Valid identifier: letter/underscore start, alphanumeric/underscore body, max 63 chars */
const IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/;

function isValidIdentifier(name) {
  return typeof name === 'string' && IDENTIFIER_RE.test(name);
}

/** Collections the generic DB routes are allowed to access */
const ALLOWED_TABLES = new Set([
  'work_orders', 'tickets', 'service_requests', 'customers',
  'equipment', 'invoices', 'quotes', 'service_orders',
  'technicians', 'partners', 'contracts', 'warranties',
  'payments', 'penalties', 'penalty_rules', 'disputes',
  'knowledge_articles', 'faqs', 'photos', 'documents',
  'notifications', 'user_roles', 'audit_log',
  'forecast_outputs', 'maintenance_predictions',
  'sapos_offers', 'fraud_alerts', 'forgery_detections', 'forgery_batch_jobs',
  'forgery_monitoring_alerts', 'forgery_model_metrics',
  'marketplace_items', 'templates', 'webhooks', 'ab_tests',
  'geography_hierarchy', 'sla_configurations', 'sla_records',
  'purchase_orders', 'stock_adjustments', 'inventory_items',
  'training_modules', 'training_progress',
  'profiles',
  // Additional tables
  'service_contracts',
  'training_courses', 'training_enrollments', 'training_certifications',
  'marketplace_extensions', 'marketplace_installations',
  'analytics_quality_rules', 'analytics_workspaces',
  'workflow_templates',
  'supplier_invoices',
]);

/** Collections that enforce tenant_id isolation */
const MULTI_TENANT_TABLES = new Set([
  'work_orders', 'tickets', 'service_requests', 'customers',
  'equipment', 'invoices', 'quotes', 'service_orders',
]);

function validateTable(table) {
  if (!table || !isValidIdentifier(table)) {
    return 'Invalid table name';
  }
  if (!ALLOWED_TABLES.has(table)) {
    return `Table "${table}" is not accessible via this endpoint`;
  }
  return null;
}

function validateColumns(columns) {
  for (const col of columns) {
    if (!isValidIdentifier(col)) {
      return `Invalid column name: ${col}`;
    }
  }
  return null;
}

// --- MongoDB operator translation ---

/**
 * Translate a single where-clause value into a MongoDB filter condition.
 *
 * Supported formats:
 *   - primitive value  → exact match
 *   - Array            → $in
 *   - { operator, value } → comparison / regex
 */
function translateCondition(value) {
  if (Array.isArray(value)) {
    return { $in: value };
  }

  if (typeof value === 'object' && value !== null && value.operator) {
    const op = String(value.operator).toUpperCase().trim();
    const v = value.value;

    switch (op) {
      case '=':
        return v;
      case '!=':
      case '<>':
        return { $ne: v };
      case '<':
        return { $lt: v };
      case '>':
        return { $gt: v };
      case '<=':
        return { $lte: v };
      case '>=':
        return { $gte: v };
      case 'LIKE':
      case 'ILIKE':
        // Convert SQL LIKE pattern (% → .*, _ → .) to regex
        // eslint-disable-next-line no-case-declarations
        const pattern = String(v)
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')  // escape regex meta-chars first
          .replace(/%/g, '.*')                        // SQL % → regex .*
          .replace(/_/g, '.');                        // SQL _ → regex .
        return { $regex: pattern, $options: 'i' };
      default:
        return null; // disallowed operator — handled by caller
    }
  }

  // Primitive value → exact match
  return value;
}

/** Allowed SQL-style operators (used for validation before translating) */
const ALLOWED_OPERATORS = new Set([
  '=', '!=', '<>', '<', '>', '<=', '>=',
  'LIKE', 'ILIKE',
]);

/**
 * Generic database query endpoint
 * POST /api/db/query
 * Body: { table, select, where, orderBy, limit, offset }
 */
router.post('/query', authenticateToken, async (req, res) => {
  try {
    const { table, select = '*', where = {}, orderBy, limit, offset } = req.body;

    const tableErr = validateTable(table);
    if (tableErr) return res.status(400).json({ error: tableErr });

    // --- Build projection ---
    let projection = undefined;
    if (select && select !== '*') {
      const cols = select.split(',').map(c => c.trim()).filter(Boolean);
      const colErr = validateColumns(cols);
      if (colErr) return res.status(400).json({ error: colErr });
      projection = {};
      for (const col of cols) {
        projection[col] = 1;
      }
    }

    // --- Build MongoDB filter ---
    const filter = {};

    // Tenant isolation
    if (MULTI_TENANT_TABLES.has(table) && req.user) {
      const tenantId = await getUserTenantId(req.user.id);
      const isAdmin = req.user.mappedRoles?.includes('sys_admin') || req.user.roles?.includes('admin');

      if (tenantId && !isAdmin && !where.tenant_id) {
        filter.tenant_id = tenantId;
      }
    }

    // Translate each where condition
    for (const [key, value] of Object.entries(where)) {
      if (value === undefined || value === null) continue;

      if (!isValidIdentifier(key)) {
        return res.status(400).json({ error: `Invalid column name in where: ${key}` });
      }

      // Validate operator if present
      if (typeof value === 'object' && !Array.isArray(value) && value.operator) {
        const op = String(value.operator).toUpperCase().trim();
        if (!ALLOWED_OPERATORS.has(op)) {
          return res.status(400).json({ error: `Disallowed operator: ${value.operator}` });
        }
      }

      const condition = translateCondition(value);
      if (condition === null) {
        return res.status(400).json({ error: `Unsupported operator for field: ${key}` });
      }
      filter[key] = condition;
    }

    // --- Build sort ---
    let sort = undefined;
    if (orderBy) {
      const orderParts = String(orderBy).split(',').map(p => p.trim());
      sort = {};
      for (const part of orderParts) {
        const tokens = part.split(/\s+/);
        if (!isValidIdentifier(tokens[0])) {
          return res.status(400).json({ error: `Invalid orderBy column: ${tokens[0]}` });
        }
        let direction = 1; // default ASC
        if (tokens[1]) {
          const dir = tokens[1].toUpperCase();
          if (dir !== 'ASC' && dir !== 'DESC') {
            return res.status(400).json({ error: `Invalid orderBy direction: ${tokens[1]}` });
          }
          direction = dir === 'DESC' ? -1 : 1;
        }
        sort[tokens[0]] = direction;
      }
    }

    // --- Parse limit / offset ---
    let parsedLimit = undefined;
    let parsedSkip = undefined;

    if (limit) {
      const lim = parseInt(limit, 10);
      if (isNaN(lim) || lim < 0) return res.status(400).json({ error: 'Invalid limit' });
      parsedLimit = lim;
    }

    if (offset) {
      const off = parseInt(offset, 10);
      if (isNaN(off) || off < 0) return res.status(400).json({ error: 'Invalid offset' });
      parsedSkip = off;
    }

    // --- Execute query via findMany helper ---
    const results = await findMany(table, filter, {
      projection,
      sort,
      limit: parsedLimit,
      skip: parsedSkip,
    });

    res.json({ data: results, count: results.length });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

/**
 * Get single row by ID
 * GET /api/db/:table/:id
 */
router.get('/:table/:id', authenticateToken, async (req, res) => {
  try {
    const { table, id } = req.params;
    const tableErr = validateTable(table);
    if (tableErr) return res.status(400).json({ error: tableErr });

    const result = await findOne(table, { id });

    if (!result) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json({ data: result });
  } catch (error) {
    console.error('Database get error:', error);
    res.status(500).json({ error: 'Get failed' });
  }
});

/**
 * Insert document
 * POST /api/db/:table
 */
router.post('/:table', authenticateToken, async (req, res) => {
  try {
    const { table } = req.params;
    const tableErr = validateTable(table);
    if (tableErr) return res.status(400).json({ error: tableErr });

    const data = req.body;
    const columns = Object.keys(data);
    if (columns.length === 0) return res.status(400).json({ error: 'No data provided' });

    const colErr = validateColumns(columns);
    if (colErr) return res.status(400).json({ error: colErr });

    const doc = { ...data, created_at: new Date(), updated_at: new Date() };
    const result = await db.collection(table).insertOne(doc);

    res.json({ data: { ...doc, _id: result.insertedId } });
  } catch (error) {
    console.error('Database insert error:', error);
    res.status(500).json({ error: 'Insert failed' });
  }
});

/**
 * Update document
 * PATCH /api/db/:table/:id
 */
router.patch('/:table/:id', authenticateToken, async (req, res) => {
  try {
    const { table, id } = req.params;
    const tableErr = validateTable(table);
    if (tableErr) return res.status(400).json({ error: tableErr });

    const data = req.body;
    const columns = Object.keys(data);
    if (columns.length === 0) return res.status(400).json({ error: 'No data provided' });

    const colErr = validateColumns(columns);
    if (colErr) return res.status(400).json({ error: colErr });

    const result = await db.collection(table).findOneAndUpdate(
      { id },
      { $set: { ...data, updated_at: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json({ data: result });
  } catch (error) {
    console.error('Database update error:', error);
    res.status(500).json({ error: 'Update failed' });
  }
});

/**
 * Delete document
 * DELETE /api/db/:table/:id
 */
router.delete('/:table/:id', authenticateToken, async (req, res) => {
  try {
    const { table, id } = req.params;
    const tableErr = validateTable(table);
    if (tableErr) return res.status(400).json({ error: tableErr });

    const result = await db.collection(table).findOneAndDelete({ id });

    if (!result) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json({ data: result });
  } catch (error) {
    console.error('Database delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;
