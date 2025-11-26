import express from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { query, getOne, getMany } from '../db/query.js';
import { randomUUID } from 'crypto';

const router = express.Router();

/**
 * Get all articles (with optional filters)
 * GET /api/knowledge-base/articles
 */
router.get('/articles', optionalAuth, async (req, res) => {
  try {
    const { category, status = 'published', search, tag, limit = 50, offset = 0 } = req.query;
    const userId = req.user?.id;

    let sql = `
      SELECT 
        kb.id,
        kb.title,
        kb.summary,
        kb.content,
        kb.status,
        kb.views_count,
        kb.helpful_count,
        kb.not_helpful_count,
        kb.category_id,
        kbc.name as category_name,
        kb.created_at,
        kb.updated_at,
        kb.published_at,
        u1.full_name as created_by_name,
        array_agg(DISTINCT kbt.name) FILTER (WHERE kbt.name IS NOT NULL) as tags
      FROM knowledge_base_articles kb
      LEFT JOIN knowledge_base_categories kbc ON kb.category_id = kbc.id
      LEFT JOIN users u1 ON kb.created_by = u1.id
      LEFT JOIN knowledge_base_article_tags kbat ON kb.id = kbat.article_id
      LEFT JOIN knowledge_base_tags kbt ON kbat.tag_id = kbt.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    // Handle status filter - 'all' shows all statuses
    if (status && status !== 'all') {
      sql += ` AND kb.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (category) {
      sql += ` AND kbc.name = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (search) {
      sql += ` AND (
        kb.title ILIKE $${paramIndex} OR 
        kb.content ILIKE $${paramIndex} OR 
        kb.summary ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ` GROUP BY kb.id, kbc.name, u1.full_name`;

    if (tag) {
      sql += ` HAVING $${paramIndex} = ANY(array_agg(kbt.name))`;
      params.push(tag);
      paramIndex++;
    }

    sql += ` ORDER BY kb.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const articles = await getMany(sql, params);

    // Track view for authenticated users (if viewing published articles)
    if (userId && status === 'published') {
      // This could be done asynchronously in production
      for (const article of articles) {
        await query(
          `INSERT INTO knowledge_base_article_views (article_id, user_id, viewed_at)
           VALUES ($1, $2, now())
           ON CONFLICT DO NOTHING`,
          [article.id, userId]
        ).catch(() => {}); // Ignore errors
      }
    }

    res.json({ articles });
  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch articles' });
  }
});

/**
 * Get single article by ID
 * GET /api/knowledge-base/articles/:id
 */
router.get('/articles/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const article = await getOne(
      `SELECT 
        kb.*,
        kbc.name as category_name,
        u1.full_name as created_by_name,
        u2.full_name as updated_by_name,
        array_agg(DISTINCT kbt.name) FILTER (WHERE kbt.name IS NOT NULL) as tags,
        array_agg(DISTINCT jsonb_build_object(
          'id', kba.id,
          'file_name', kba.file_name,
          'file_url', kba.file_url,
          'file_type', kba.file_type
        )) FILTER (WHERE kba.id IS NOT NULL) as attachments
      FROM knowledge_base_articles kb
      LEFT JOIN knowledge_base_categories kbc ON kb.category_id = kbc.id
      LEFT JOIN users u1 ON kb.created_by = u1.id
      LEFT JOIN users u2 ON kb.updated_by = u2.id
      LEFT JOIN knowledge_base_article_tags kbat ON kb.id = kbat.article_id
      LEFT JOIN knowledge_base_tags kbt ON kbat.tag_id = kbt.id
      LEFT JOIN knowledge_base_attachments kba ON kb.id = kba.article_id
      WHERE kb.id = $1
      GROUP BY kb.id, kbc.name, u1.full_name, u2.full_name`,
      [id]
    );

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Increment view count
    await query(
      `UPDATE knowledge_base_articles 
       SET views_count = views_count + 1 
       WHERE id = $1`,
      [id]
    ).catch(() => {});

    // Track view for authenticated users (allow multiple views per user)
    if (userId) {
      await query(
        `INSERT INTO knowledge_base_article_views (article_id, user_id, viewed_at)
         VALUES ($1, $2, now())`,
        [id, userId]
      ).catch(() => {}); // Ignore errors if insertion fails
    }

    res.json({ article });
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch article' });
  }
});

/**
 * Create new article
 * POST /api/knowledge-base/articles
 */
router.post('/articles', authenticateToken, async (req, res) => {
  try {
    const { title, content, summary, category_id, status = 'draft', tag_names = [] } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const articleId = randomUUID();
    const publishedAt = status === 'published' ? new Date().toISOString() : null;

    // Create article
    const article = await query(
      `INSERT INTO knowledge_base_articles (
        id, title, content, summary, category_id, status, 
        created_by, published_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
      RETURNING *`,
      [articleId, title, content, summary || null, category_id || null, status, req.user.id, publishedAt]
    );

    // Add tags
    if (tag_names && tag_names.length > 0) {
      for (const tagName of tag_names) {
        // Get or create tag
        let tag = await getOne(
          'SELECT id FROM knowledge_base_tags WHERE name = $1',
          [tagName.toLowerCase().trim()]
        );

        if (!tag) {
          const tagId = randomUUID();
          await query(
            'INSERT INTO knowledge_base_tags (id, name) VALUES ($1, $2)',
            [tagId, tagName.toLowerCase().trim()]
          );
          tag = { id: tagId };
        }

        // Link tag to article
        await query(
          'INSERT INTO knowledge_base_article_tags (article_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [articleId, tag.id]
        );
      }
    }

    res.status(201).json({ article: article.rows[0] });
  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({ error: error.message || 'Failed to create article' });
  }
});

/**
 * Update article
 * PATCH /api/knowledge-base/articles/:id
 */
router.patch('/articles/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, summary, category_id, status, tag_names } = req.body;

    // Get existing article
    const existing = await getOne('SELECT * FROM knowledge_base_articles WHERE id = $1', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Build update query
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      params.push(title);
    }
    if (content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      params.push(content);
    }
    if (summary !== undefined) {
      updates.push(`summary = $${paramIndex++}`);
      params.push(summary);
    }
    if (category_id !== undefined) {
      updates.push(`category_id = $${paramIndex++}`);
      params.push(category_id);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
      if (status === 'published' && existing.status !== 'published') {
        updates.push(`published_at = $${paramIndex++}`);
        params.push(new Date().toISOString());
      }
    }

    updates.push(`updated_by = $${paramIndex++}`);
    params.push(req.user.id);
    updates.push(`updated_at = now()`);
    params.push(id);

    const article = await query(
      `UPDATE knowledge_base_articles 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );

    // Update tags if provided
    if (tag_names !== undefined) {
      // Remove existing tags
      await query('DELETE FROM knowledge_base_article_tags WHERE article_id = $1', [id]);

      // Add new tags
      if (tag_names.length > 0) {
        for (const tagName of tag_names) {
          let tag = await getOne(
            'SELECT id FROM knowledge_base_tags WHERE name = $1',
            [tagName.toLowerCase().trim()]
          );

          if (!tag) {
            const tagId = randomUUID();
            await query('INSERT INTO knowledge_base_tags (id, name) VALUES ($1, $2)', [
              tagId,
              tagName.toLowerCase().trim(),
            ]);
            tag = { id: tagId };
          }

          await query(
            'INSERT INTO knowledge_base_article_tags (article_id, tag_id) VALUES ($1, $2)',
            [id, tag.id]
          );
        }
      }
    }

    res.json({ article: article.rows[0] });
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({ error: error.message || 'Failed to update article' });
  }
});

/**
 * Delete article
 * DELETE /api/knowledge-base/articles/:id
 */
router.delete('/articles/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const article = await getOne('SELECT id FROM knowledge_base_articles WHERE id = $1', [id]);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    await query('DELETE FROM knowledge_base_articles WHERE id = $1', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete article' });
  }
});

/**
 * Get all categories
 * GET /api/knowledge-base/categories
 */
router.get('/categories', optionalAuth, async (req, res) => {
  try {
    const categories = await getMany(
      `SELECT 
        kbc.*,
        COUNT(kb.id) as article_count
      FROM knowledge_base_categories kbc
      LEFT JOIN knowledge_base_articles kb ON kbc.id = kb.category_id AND kb.status = 'published'
      GROUP BY kbc.id
      ORDER BY kbc.display_order, kbc.name`
    );

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch categories' });
  }
});

/**
 * Get all tags
 * GET /api/knowledge-base/tags
 */
router.get('/tags', optionalAuth, async (req, res) => {
  try {
    const tags = await getMany(
      `SELECT 
        kbt.*,
        COUNT(kbat.article_id) as article_count
      FROM knowledge_base_tags kbt
      LEFT JOIN knowledge_base_article_tags kbat ON kbt.id = kbat.tag_id
      LEFT JOIN knowledge_base_articles kb ON kbat.article_id = kb.id AND kb.status = 'published'
      GROUP BY kbt.id
      ORDER BY article_count DESC, kbt.name`
    );

    res.json({ tags });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch tags' });
  }
});

/**
 * Submit article feedback
 * POST /api/knowledge-base/articles/:id/feedback
 */
router.post('/articles/:id/feedback', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_helpful, feedback_text } = req.body;

    if (typeof is_helpful !== 'boolean') {
      return res.status(400).json({ error: 'is_helpful must be a boolean' });
    }

    // Check if article exists
    const article = await getOne('SELECT id FROM knowledge_base_articles WHERE id = $1', [id]);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Upsert feedback
    await query(
      `INSERT INTO knowledge_base_article_feedback (article_id, user_id, is_helpful, feedback_text)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (article_id, user_id) 
       DO UPDATE SET is_helpful = $3, feedback_text = $4`,
      [id, req.user?.id || null, is_helpful, feedback_text || null]
    );

    // Update article helpful/not helpful counts
    const helpfulCount = await query(
      `SELECT COUNT(*) as count FROM knowledge_base_article_feedback 
       WHERE article_id = $1 AND is_helpful = true`,
      [id]
    );
    const notHelpfulCount = await query(
      `SELECT COUNT(*) as count FROM knowledge_base_article_feedback 
       WHERE article_id = $1 AND is_helpful = false`,
      [id]
    );

    await query(
      `UPDATE knowledge_base_articles 
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
    console.error('Submit feedback error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit feedback' });
  }
});

/**
 * Create attachment for article
 * POST /api/knowledge-base/articles/attachments
 */
router.post('/articles/attachments', authenticateToken, async (req, res) => {
  try {
    const { article_id, file_name, file_type, file_size, file_path, file_url, mime_type } = req.body;

    if (!article_id || !file_name) {
      return res.status(400).json({ error: 'article_id and file_name are required' });
    }

    // Verify article exists
    const article = await getOne('SELECT id FROM knowledge_base_articles WHERE id = $1', [article_id]);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const attachment = await query(
      `INSERT INTO knowledge_base_attachments (
        id, article_id, file_name, file_type, file_size, 
        file_path, file_url, mime_type, uploaded_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
      RETURNING *`,
      [
        randomUUID(),
        article_id,
        file_name,
        file_type || 'unknown',
        file_size || null,
        file_path || null,
        file_url || null,
        mime_type || null,
        req.user.id,
      ]
    );

    res.status(201).json({ attachment: attachment.rows[0] });
  } catch (error) {
    console.error('Create attachment error:', error);
    res.status(500).json({ error: error.message || 'Failed to create attachment' });
  }
});

/**
 * Delete attachment
 * DELETE /api/knowledge-base/articles/attachments/:id
 */
router.delete('/articles/attachments/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const attachment = await getOne('SELECT id FROM knowledge_base_attachments WHERE id = $1', [id]);
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    await query('DELETE FROM knowledge_base_attachments WHERE id = $1', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete attachment' });
  }
});

/**
 * Get attachments for article
 * GET /api/knowledge-base/articles/:id/attachments
 */
router.get('/articles/:id/attachments', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const attachments = await getMany(
      `SELECT * FROM knowledge_base_attachments 
       WHERE article_id = $1 
       ORDER BY created_at DESC`,
      [id]
    );

    res.json({ attachments });
  } catch (error) {
    console.error('Get attachments error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch attachments' });
  }
});

export default router;

