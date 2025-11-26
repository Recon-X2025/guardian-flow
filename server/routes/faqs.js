import express from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { query, getOne, getMany } from '../db/query.js';
import { randomUUID } from 'crypto';

const router = express.Router();

/**
 * Get all FAQs (published by default, or all for admin)
 * GET /api/faqs
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, search, published_only = 'true' } = req.query;
    const userId = req.user?.id;

    let sql = `
      SELECT 
        f.id,
        f.question,
        f.answer,
        f.display_order,
        f.views_count,
        f.helpful_count,
        f.not_helpful_count,
        f.category_id,
        fc.name as category_name,
        f.created_at,
        f.updated_at
      FROM faqs f
      LEFT JOIN faq_categories fc ON f.category_id = fc.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    // Filter by published status (admin can see all)
    if (published_only === 'true') {
      sql += ` AND f.is_published = true`;
    }

    if (category) {
      sql += ` AND fc.name = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (search) {
      sql += ` AND (
        f.question ILIKE $${paramIndex} OR 
        f.answer ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY fc.display_order, f.display_order, f.created_at DESC`;

    const faqs = await getMany(sql, params);

    // Track views for authenticated users
    if (userId && faqs.length > 0) {
      for (const faq of faqs) {
        await query(
          `INSERT INTO faq_views (faq_id, user_id, viewed_at)
           VALUES ($1, $2, now())`,
          [faq.id, userId]
        ).catch(() => {}); // Ignore errors
      }
    }

    res.json({ faqs });
  } catch (error) {
    console.error('Get FAQs error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch FAQs' });
  }
});

/**
 * Get FAQ categories
 * GET /api/faqs/categories
 * NOTE: Must be before /:id route to avoid route conflict
 */
router.get('/categories', optionalAuth, async (req, res) => {
  try {
    const categories = await getMany(
      `SELECT 
        fc.*,
        COUNT(f.id) FILTER (WHERE f.is_published = true) as faq_count
      FROM faq_categories fc
      LEFT JOIN faqs f ON fc.id = f.category_id
      GROUP BY fc.id
      ORDER BY fc.display_order, fc.name`
    );

    res.json({ categories });
  } catch (error) {
    console.error('Get FAQ categories error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch categories' });
  }
});

/**
 * Get single FAQ by ID
 * GET /api/faqs/:id
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const faq = await getOne(
      `SELECT 
        f.*,
        fc.name as category_name
      FROM faqs f
      LEFT JOIN faq_categories fc ON f.category_id = fc.id
      WHERE f.id = $1`,
      [id]
    );

    if (!faq) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    // Increment view count
    await query(
      `UPDATE faqs SET views_count = views_count + 1 WHERE id = $1`,
      [id]
    ).catch(() => {});

    // Track view for authenticated users
    if (userId) {
      await query(
        `INSERT INTO faq_views (faq_id, user_id, viewed_at)
         VALUES ($1, $2, now())`,
        [id, userId]
      ).catch(() => {});
    }

    res.json({ faq });
  } catch (error) {
    console.error('Get FAQ error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch FAQ' });
  }
});

/**
 * Create new FAQ (admin only)
 * POST /api/faqs
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { question, answer, category_id, display_order = 0, is_published = true } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required' });
    }

    const faqId = randomUUID();
    const publishedAt = is_published ? new Date().toISOString() : null;

    const faq = await query(
      `INSERT INTO faqs (
        id, question, answer, category_id, display_order, 
        is_published, created_by, published_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
      RETURNING *`,
      [faqId, question, answer, category_id || null, display_order, is_published, req.user.id, publishedAt]
    );

    res.status(201).json({ faq: faq.rows[0] });
  } catch (error) {
    console.error('Create FAQ error:', error);
    res.status(500).json({ error: error.message || 'Failed to create FAQ' });
  }
});

/**
 * Update FAQ (admin only)
 * PATCH /api/faqs/:id
 */
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, category_id, display_order, is_published } = req.body;

    // Get existing FAQ
    const existing = await getOne('SELECT * FROM faqs WHERE id = $1', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    // Build update query
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (question !== undefined) {
      updates.push(`question = $${paramIndex++}`);
      params.push(question);
    }
    if (answer !== undefined) {
      updates.push(`answer = $${paramIndex++}`);
      params.push(answer);
    }
    if (category_id !== undefined) {
      updates.push(`category_id = $${paramIndex++}`);
      params.push(category_id);
    }
    if (display_order !== undefined) {
      updates.push(`display_order = $${paramIndex++}`);
      params.push(display_order);
    }
    if (is_published !== undefined) {
      updates.push(`is_published = $${paramIndex++}`);
      params.push(is_published);
      if (is_published && !existing.is_published) {
        updates.push(`published_at = $${paramIndex++}`);
        params.push(new Date().toISOString());
      }
    }

    updates.push(`updated_by = $${paramIndex++}`);
    params.push(req.user.id);
    updates.push(`updated_at = now()`);
    params.push(id);

    const faq = await query(
      `UPDATE faqs 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );

    res.json({ faq: faq.rows[0] });
  } catch (error) {
    console.error('Update FAQ error:', error);
    res.status(500).json({ error: error.message || 'Failed to update FAQ' });
  }
});

/**
 * Delete FAQ (admin only)
 * DELETE /api/faqs/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const faq = await getOne('SELECT id FROM faqs WHERE id = $1', [id]);
    if (!faq) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    await query('DELETE FROM faqs WHERE id = $1', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete FAQ error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete FAQ' });
  }
});

/**
 * Submit FAQ feedback
 * POST /api/faqs/:id/feedback
 */
router.post('/:id/feedback', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_helpful, feedback_text } = req.body;

    if (typeof is_helpful !== 'boolean') {
      return res.status(400).json({ error: 'is_helpful must be a boolean' });
    }

    // Check if FAQ exists
    const faq = await getOne('SELECT id FROM faqs WHERE id = $1', [id]);
    if (!faq) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    // Upsert feedback
    await query(
      `INSERT INTO faq_feedback (faq_id, user_id, is_helpful, feedback_text)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (faq_id, user_id) 
       DO UPDATE SET is_helpful = $3, feedback_text = $4`,
      [id, req.user?.id || null, is_helpful, feedback_text || null]
    );

    // Update FAQ helpful/not helpful counts
    const helpfulCount = await query(
      `SELECT COUNT(*) as count FROM faq_feedback 
       WHERE faq_id = $1 AND is_helpful = true`,
      [id]
    );
    const notHelpfulCount = await query(
      `SELECT COUNT(*) as count FROM faq_feedback 
       WHERE faq_id = $1 AND is_helpful = false`,
      [id]
    );

    await query(
      `UPDATE faqs 
       SET helpful_count = $1, not_helpful_count = $2
       WHERE id = $3`,
      [
        parseInt(helpfulCount.rows[0].count),
        parseInt(notHelpfulCount.rows[0].count),
        id,
      ]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Submit FAQ feedback error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit feedback' });
  }
});

export default router;

