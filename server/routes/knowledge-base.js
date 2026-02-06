import express from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { db } from '../db/client.js';
import { findOne, findMany, insertOne, updateOne, deleteMany, countDocuments, aggregate } from '../db/query.js';
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

    // Build aggregation pipeline
    const pipeline = [];

    // Base match stage
    const matchStage = {};

    // Handle status filter - 'all' shows all statuses
    if (status && status !== 'all') {
      matchStage.status = status;
    }

    if (search) {
      matchStage.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
      ];
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // Lookup category
    pipeline.push({
      $lookup: {
        from: 'knowledge_base_categories',
        localField: 'category_id',
        foreignField: 'id',
        as: '_category',
      },
    });
    pipeline.push({
      $unwind: { path: '$_category', preserveNullAndEmptyArrays: true },
    });

    // Filter by category name if provided
    if (category) {
      pipeline.push({ $match: { '_category.name': category } });
    }

    // Lookup created_by user
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'created_by',
        foreignField: 'id',
        as: '_created_by_user',
      },
    });
    pipeline.push({
      $unwind: { path: '$_created_by_user', preserveNullAndEmptyArrays: true },
    });

    // Lookup article tags (join table)
    pipeline.push({
      $lookup: {
        from: 'knowledge_base_article_tags',
        localField: 'id',
        foreignField: 'article_id',
        as: '_article_tags',
      },
    });

    // Lookup tag names
    pipeline.push({
      $lookup: {
        from: 'knowledge_base_tags',
        localField: '_article_tags.tag_id',
        foreignField: 'id',
        as: '_tags',
      },
    });

    // Filter by tag name if provided
    if (tag) {
      pipeline.push({ $match: { '_tags.name': tag } });
    }

    // Project final shape
    pipeline.push({
      $project: {
        _id: 0,
        id: 1,
        title: 1,
        summary: 1,
        content: 1,
        status: 1,
        views_count: 1,
        helpful_count: 1,
        not_helpful_count: 1,
        category_id: 1,
        category_name: { $ifNull: ['$_category.name', null] },
        created_at: 1,
        updated_at: 1,
        published_at: 1,
        created_by_name: { $ifNull: ['$_created_by_user.full_name', null] },
        tags: {
          $filter: {
            input: '$_tags.name',
            as: 'tagName',
            cond: { $ne: ['$$tagName', null] },
          },
        },
      },
    });

    // Sort and paginate
    pipeline.push({ $sort: { created_at: -1 } });
    pipeline.push({ $skip: parseInt(offset) });
    pipeline.push({ $limit: parseInt(limit) });

    const articles = await aggregate('knowledge_base_articles', pipeline);

    // Track view for authenticated users (if viewing published articles)
    if (userId && status === 'published') {
      for (const article of articles) {
        try {
          await insertOne('knowledge_base_article_views', {
            id: randomUUID(),
            article_id: article.id,
            user_id: userId,
            viewed_at: new Date(),
          });
        } catch (_) {
          // Ignore errors (duplicate key returns null from insertOne)
        }
      }
    }

    res.json({ articles });
  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
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

    // Use aggregation to join category, users, tags, and attachments
    const pipeline = [
      { $match: { id } },
      // Lookup category
      {
        $lookup: {
          from: 'knowledge_base_categories',
          localField: 'category_id',
          foreignField: 'id',
          as: '_category',
        },
      },
      { $unwind: { path: '$_category', preserveNullAndEmptyArrays: true } },
      // Lookup created_by user
      {
        $lookup: {
          from: 'users',
          localField: 'created_by',
          foreignField: 'id',
          as: '_created_by_user',
        },
      },
      { $unwind: { path: '$_created_by_user', preserveNullAndEmptyArrays: true } },
      // Lookup updated_by user
      {
        $lookup: {
          from: 'users',
          localField: 'updated_by',
          foreignField: 'id',
          as: '_updated_by_user',
        },
      },
      { $unwind: { path: '$_updated_by_user', preserveNullAndEmptyArrays: true } },
      // Lookup article tags (join table)
      {
        $lookup: {
          from: 'knowledge_base_article_tags',
          localField: 'id',
          foreignField: 'article_id',
          as: '_article_tags',
        },
      },
      // Lookup tag names
      {
        $lookup: {
          from: 'knowledge_base_tags',
          localField: '_article_tags.tag_id',
          foreignField: 'id',
          as: '_tags',
        },
      },
      // Lookup attachments
      {
        $lookup: {
          from: 'knowledge_base_attachments',
          localField: 'id',
          foreignField: 'article_id',
          as: '_attachments_raw',
        },
      },
      // Project final shape
      {
        $addFields: {
          category_name: { $ifNull: ['$_category.name', null] },
          created_by_name: { $ifNull: ['$_created_by_user.full_name', null] },
          updated_by_name: { $ifNull: ['$_updated_by_user.full_name', null] },
          tags: {
            $filter: {
              input: '$_tags.name',
              as: 'tagName',
              cond: { $ne: ['$$tagName', null] },
            },
          },
          attachments: {
            $map: {
              input: {
                $filter: {
                  input: '$_attachments_raw',
                  as: 'att',
                  cond: { $ne: ['$$att.id', null] },
                },
              },
              as: 'att',
              in: {
                id: '$$att.id',
                file_name: '$$att.file_name',
                file_url: '$$att.file_url',
                file_type: '$$att.file_type',
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          _category: 0,
          _created_by_user: 0,
          _updated_by_user: 0,
          _article_tags: 0,
          _tags: 0,
          _attachments_raw: 0,
        },
      },
    ];

    const results = await aggregate('knowledge_base_articles', pipeline);
    const article = results[0] || null;

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Increment view count
    await db.collection('knowledge_base_articles').updateOne(
      { id },
      { $inc: { views_count: 1 } }
    ).catch(() => {});

    // Track view for authenticated users (allow multiple views per user)
    if (userId) {
      try {
        await insertOne('knowledge_base_article_views', {
          id: randomUUID(),
          article_id: id,
          user_id: userId,
          viewed_at: new Date(),
        });
      } catch (_) {
        // Ignore errors
      }
    }

    res.json({ article });
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
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
    const now = new Date();
    const publishedAt = status === 'published' ? now : null;

    const articleDoc = {
      id: articleId,
      title,
      content,
      summary: summary || null,
      category_id: category_id || null,
      status,
      created_by: req.user.id,
      updated_by: null,
      published_at: publishedAt,
      views_count: 0,
      helpful_count: 0,
      not_helpful_count: 0,
      created_at: now,
      updated_at: now,
    };

    const article = await insertOne('knowledge_base_articles', articleDoc);

    // Add tags
    if (tag_names && tag_names.length > 0) {
      for (const tagName of tag_names) {
        const normalizedName = tagName.toLowerCase().trim();

        // Get or create tag
        let tag = await findOne('knowledge_base_tags', { name: normalizedName });

        if (!tag) {
          const tagId = randomUUID();
          await insertOne('knowledge_base_tags', {
            id: tagId,
            name: normalizedName,
            created_at: new Date(),
          });
          tag = { id: tagId };
        }

        // Link tag to article (duplicate key returns null)
        await insertOne('knowledge_base_article_tags', {
          article_id: articleId,
          tag_id: tag.id,
        });
      }
    }

    res.status(201).json({ article });
  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({ error: 'Failed to create article' });
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
    const existing = await findOne('knowledge_base_articles', { id });
    if (!existing) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Build $set object
    const setFields = {};

    if (title !== undefined) setFields.title = title;
    if (content !== undefined) setFields.content = content;
    if (summary !== undefined) setFields.summary = summary;
    if (category_id !== undefined) setFields.category_id = category_id;
    if (status !== undefined) {
      setFields.status = status;
      if (status === 'published' && existing.status !== 'published') {
        setFields.published_at = new Date();
      }
    }

    setFields.updated_by = req.user.id;
    setFields.updated_at = new Date();

    const article = await updateOne('knowledge_base_articles', { id }, { $set: setFields });

    // Update tags if provided
    if (tag_names !== undefined) {
      // Remove existing tags
      await deleteMany('knowledge_base_article_tags', { article_id: id });

      // Add new tags
      if (tag_names.length > 0) {
        for (const tagName of tag_names) {
          const normalizedName = tagName.toLowerCase().trim();

          let tag = await findOne('knowledge_base_tags', { name: normalizedName });

          if (!tag) {
            const tagId = randomUUID();
            await insertOne('knowledge_base_tags', {
              id: tagId,
              name: normalizedName,
              created_at: new Date(),
            });
            tag = { id: tagId };
          }

          await insertOne('knowledge_base_article_tags', {
            article_id: id,
            tag_id: tag.id,
          });
        }
      }
    }

    res.json({ article });
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({ error: 'Failed to update article' });
  }
});

/**
 * Delete article
 * DELETE /api/knowledge-base/articles/:id
 */
router.delete('/articles/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const article = await findOne('knowledge_base_articles', { id });
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Clean up related data
    await deleteMany('knowledge_base_article_tags', { article_id: id });
    await deleteMany('knowledge_base_attachments', { article_id: id });
    await deleteMany('knowledge_base_article_views', { article_id: id });
    await deleteMany('knowledge_base_article_feedback', { article_id: id });
    await deleteMany('knowledge_base_articles', { id });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

/**
 * Get all categories
 * GET /api/knowledge-base/categories
 */
router.get('/categories', optionalAuth, async (req, res) => {
  try {
    const pipeline = [
      // Lookup published articles for count
      {
        $lookup: {
          from: 'knowledge_base_articles',
          let: { catId: '$id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$category_id', '$$catId'] }, { $eq: ['$status', 'published'] }] } } },
          ],
          as: '_articles',
        },
      },
      {
        $addFields: {
          article_count: { $size: '$_articles' },
        },
      },
      {
        $project: {
          _id: 0,
          _articles: 0,
        },
      },
      {
        $sort: { display_order: 1, name: 1 },
      },
    ];

    const categories = await aggregate('knowledge_base_categories', pipeline);

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * Get all tags
 * GET /api/knowledge-base/tags
 */
router.get('/tags', optionalAuth, async (req, res) => {
  try {
    const pipeline = [
      // Lookup article_tags join table
      {
        $lookup: {
          from: 'knowledge_base_article_tags',
          localField: 'id',
          foreignField: 'tag_id',
          as: '_article_tags',
        },
      },
      // Lookup articles to check published status
      {
        $lookup: {
          from: 'knowledge_base_articles',
          let: { articleIds: '$_article_tags.article_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $in: ['$id', '$$articleIds'] }, { $eq: ['$status', 'published'] }] } } },
          ],
          as: '_published_articles',
        },
      },
      {
        $addFields: {
          article_count: { $size: '$_published_articles' },
        },
      },
      {
        $project: {
          _id: 0,
          _article_tags: 0,
          _published_articles: 0,
        },
      },
      {
        $sort: { article_count: -1, name: 1 },
      },
    ];

    const tags = await aggregate('knowledge_base_tags', pipeline);

    res.json({ tags });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
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
    const article = await findOne('knowledge_base_articles', { id });
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const userId = req.user?.id || null;

    // Upsert feedback
    await updateOne(
      'knowledge_base_article_feedback',
      { article_id: id, user_id: userId },
      {
        $set: {
          is_helpful,
          feedback_text: feedback_text || null,
        },
        $setOnInsert: {
          id: randomUUID(),
          article_id: id,
          user_id: userId,
          created_at: new Date(),
        },
      },
      { upsert: true }
    );

    // Update article helpful/not helpful counts
    const helpfulCount = await countDocuments('knowledge_base_article_feedback', {
      article_id: id,
      is_helpful: true,
    });
    const notHelpfulCount = await countDocuments('knowledge_base_article_feedback', {
      article_id: id,
      is_helpful: false,
    });

    await updateOne(
      'knowledge_base_articles',
      { id },
      { $set: { helpful_count: helpfulCount, not_helpful_count: notHelpfulCount } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
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
    const article = await findOne('knowledge_base_articles', { id: article_id });
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const attachmentDoc = {
      id: randomUUID(),
      article_id,
      file_name,
      file_type: file_type || 'unknown',
      file_size: file_size || null,
      file_path: file_path || null,
      file_url: file_url || null,
      mime_type: mime_type || null,
      uploaded_by: req.user.id,
      created_at: new Date(),
    };

    const attachment = await insertOne('knowledge_base_attachments', attachmentDoc);

    res.status(201).json({ attachment });
  } catch (error) {
    console.error('Create attachment error:', error);
    res.status(500).json({ error: 'Failed to create attachment' });
  }
});

/**
 * Delete attachment
 * DELETE /api/knowledge-base/articles/attachments/:id
 */
router.delete('/articles/attachments/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const attachment = await findOne('knowledge_base_attachments', { id });
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    await deleteMany('knowledge_base_attachments', { id });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
});

/**
 * Get attachments for article
 * GET /api/knowledge-base/articles/:id/attachments
 */
router.get('/articles/:id/attachments', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const attachments = await findMany('knowledge_base_attachments', { article_id: id }, {
      sort: { created_at: -1 },
    });

    res.json({ attachments });
  } catch (error) {
    console.error('Get attachments error:', error);
    res.status(500).json({ error: 'Failed to fetch attachments' });
  }
});

export default router;
