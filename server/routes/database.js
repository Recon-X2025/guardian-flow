import express from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { getUserTenantId } from '../middleware/rbac.js';
import { query, getOne, getMany } from '../db/query.js';

const router = express.Router();

/**
 * Generic database query endpoint
 * POST /api/db/query
 * Body: { table, select, where, orderBy, limit, offset }
 * Requires authentication for tenant isolation
 */
router.post('/query', authenticateToken, async (req, res) => {
  try {
    const { table, select = '*', where = {}, orderBy, limit, offset } = req.body;

    if (!table) {
      return res.status(400).json({ error: 'Table name is required' });
    }

    // Validate table name to prevent SQL injection (only allow alphanumeric and underscores)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    // Validate select columns (basic check)
    const selectColumns = select === '*' ? '*' : select.split(',').map(col => col.trim()).join(', ');
    
    let sql = `SELECT ${selectColumns} FROM ${table}`;
    const params = [];
    let paramIndex = 1;
    const whereConditions = [];

    // Apply tenant filtering for multi-tenant tables
    const multiTenantTables = [
      'work_orders', 'tickets', 'service_requests', 'customers', 
      'equipment', 'invoices', 'quotes', 'service_orders'
    ];
    
    if (multiTenantTables.includes(table) && req.user) {
      // Get user's tenant_id
      const tenantId = await getUserTenantId(req.user.id);
      
      // If user has a tenant_id, filter by it (unless explicitly overridden)
      // Sys admins can see all tenants
      const isAdmin = req.user.mappedRoles?.includes('sys_admin') || req.user.roles?.includes('admin');
      
      if (tenantId && !isAdmin && !where.tenant_id) {
        whereConditions.push(`tenant_id = $${paramIndex}`);
        params.push(tenantId);
        paramIndex++;
      }
    }

    // Build WHERE clause from provided conditions
    for (const [key, value] of Object.entries(where)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          whereConditions.push(`${key} = ANY($${paramIndex})`);
          params.push(value);
        } else if (typeof value === 'object' && value.operator) {
          // Support operators like { operator: '>', value: 10 }
          whereConditions.push(`${key} ${value.operator} $${paramIndex}`);
          params.push(value.value);
        } else {
          whereConditions.push(`${key} = $${paramIndex}`);
          params.push(value);
        }
        paramIndex++;
      }
    }

    if (whereConditions.length > 0) {
      sql += ' WHERE ' + whereConditions.join(' AND ');
    }

    // Add ORDER BY (validate column name)
    if (orderBy) {
      // Basic validation - only allow alphanumeric, underscores, and spaces for ORDER BY
      if (!/^[a-zA-Z_][a-zA-Z0-9_\s]*$/.test(orderBy)) {
        return res.status(400).json({ error: 'Invalid orderBy clause' });
      }
      sql += ` ORDER BY ${orderBy}`;
    }

    // Add LIMIT
    if (limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(limit);
      paramIndex++;
    }

    // Add OFFSET
    if (offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(offset);
    }

    const result = await query(sql, params);
    res.json({ data: result.rows, count: result.rowCount });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get single row by ID
 * GET /api/db/:table/:id
 */
router.get('/:table/:id', optionalAuth, async (req, res) => {
  try {
    const { table, id } = req.params;
    const result = await getOne(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    
    if (!result) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    res.json({ data: result });
  } catch (error) {
    console.error('Database get error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Insert row
 * POST /api/db/:table
 */
router.post('/:table', authenticateToken, async (req, res) => {
  try {
    const { table } = req.params;
    const data = req.body;

    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    const result = await query(sql, values);

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Database insert error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update row
 * PATCH /api/db/:table/:id
 */
router.patch('/:table/:id', authenticateToken, async (req, res) => {
  try {
    const { table, id } = req.params;
    const data = req.body;

    const updates = Object.keys(data).map((key, i) => `${key} = $${i + 2}`);
    const values = [id, ...Object.values(data)];

    const sql = `UPDATE ${table} SET ${updates.join(', ')}, updated_at = now() WHERE id = $1 RETURNING *`;
    const result = await query(sql, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Database update error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete row
 * DELETE /api/db/:table/:id
 */
router.delete('/:table/:id', authenticateToken, async (req, res) => {
  try {
    const { table, id } = req.params;
    const result = await query(`DELETE FROM ${table} WHERE id = $1 RETURNING *`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Database delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

