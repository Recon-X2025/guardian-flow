import express from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { db } from '../db/client.js';
import { findOne, findMany, insertOne, updateOne, deleteMany, countDocuments, aggregate } from '../db/query.js';
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

    // Build aggregation pipeline
    const pipeline = [];

    // Base match stage
    const matchStage = {};

    // Filter by published status (admin can see all)
    if (published_only === 'true') {
      matchStage.is_published = true;
    }

    if (search) {
      matchStage.$or = [
        { question: { $regex: search, $options: 'i' } },
        { answer: { $regex: search, $options: 'i' } },
      ];
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // Lookup category
    pipeline.push({
      $lookup: {
        from: 'faq_categories',
        localField: 'category_id',
        foreignField: 'id',
        as: '_category',
      },
    });
    pipeline.push({
      $unwind: { path: '$_category', preserveNullAndEmptyArrays: true },
    });

    if (category) {
      pipeline.push({ $match: { '_category.name': category } });
    }

    // Sort before project so we can use _category.display_order
    pipeline.push({
      $sort: { '_category.display_order': 1, display_order: 1, created_at: -1 },
    });

    // Project final shape
    pipeline.push({
      $project: {
        _id: 0,
        id: 1,
        question: 1,
        answer: 1,
        display_order: 1,
        views_count: 1,
        helpful_count: 1,
        not_helpful_count: 1,
        category_id: 1,
        category_name: { $ifNull: ['$_category.name', null] },
        created_at: 1,
        updated_at: 1,
      },
    });

    const faqs = await aggregate('faqs', pipeline);

    // Track views for authenticated users
    if (userId && faqs.length > 0) {
      for (const faq of faqs) {
        try {
          await insertOne('faq_views', {
            id: randomUUID(),
            faq_id: faq.id,
            user_id: userId,
            viewed_at: new Date(),
          });
        } catch (_) {
          // Ignore errors
        }
      }
    }

    res.json({ faqs });
  } catch (error) {
    console.error('Get FAQs error:', error);
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
});

/**
 * Get FAQ categories
 * GET /api/faqs/categories
 * NOTE: Must be before /:id route to avoid route conflict
 */
router.get('/categories', optionalAuth, async (req, res) => {
  try {
    const pipeline = [
      // Lookup published FAQs for count
      {
        $lookup: {
          from: 'faqs',
          let: { catId: '$id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$category_id', '$$catId'] }, { $eq: ['$is_published', true] }] } } },
          ],
          as: '_faqs',
        },
      },
      {
        $addFields: {
          faq_count: { $size: '$_faqs' },
        },
      },
      {
        $project: {
          _id: 0,
          _faqs: 0,
        },
      },
      {
        $sort: { display_order: 1, name: 1 },
      },
    ];

    const categories = await aggregate('faq_categories', pipeline);

    res.json({ categories });
  } catch (error) {
    console.error('Get FAQ categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
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

    // Use aggregation to join with category
    const pipeline = [
      { $match: { id } },
      {
        $lookup: {
          from: 'faq_categories',
          localField: 'category_id',
          foreignField: 'id',
          as: '_category',
        },
      },
      { $unwind: { path: '$_category', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          category_name: { $ifNull: ['$_category.name', null] },
        },
      },
      {
        $project: {
          _id: 0,
          _category: 0,
        },
      },
    ];

    const results = await aggregate('faqs', pipeline);
    const faq = results[0] || null;

    if (!faq) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    // Increment view count
    await db.collection('faqs').updateOne(
      { id },
      { $inc: { views_count: 1 } }
    ).catch(() => {});

    // Track view for authenticated users
    if (userId) {
      try {
        await insertOne('faq_views', {
          id: randomUUID(),
          faq_id: id,
          user_id: userId,
          viewed_at: new Date(),
        });
      } catch (_) {
        // Ignore errors
      }
    }

    res.json({ faq });
  } catch (error) {
    console.error('Get FAQ error:', error);
    res.status(500).json({ error: 'Failed to fetch FAQ' });
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
    const now = new Date();
    const publishedAt = is_published ? now : null;

    const faqDoc = {
      id: faqId,
      question,
      answer,
      category_id: category_id || null,
      display_order,
      is_published,
      created_by: req.user.id,
      updated_by: null,
      published_at: publishedAt,
      views_count: 0,
      helpful_count: 0,
      not_helpful_count: 0,
      created_at: now,
      updated_at: now,
    };

    const faq = await insertOne('faqs', faqDoc);

    res.status(201).json({ faq });
  } catch (error) {
    console.error('Create FAQ error:', error);
    res.status(500).json({ error: 'Failed to create FAQ' });
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
    const existing = await findOne('faqs', { id });
    if (!existing) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    // Build $set object
    const setFields = {};

    if (question !== undefined) setFields.question = question;
    if (answer !== undefined) setFields.answer = answer;
    if (category_id !== undefined) setFields.category_id = category_id;
    if (display_order !== undefined) setFields.display_order = display_order;
    if (is_published !== undefined) {
      setFields.is_published = is_published;
      if (is_published && !existing.is_published) {
        setFields.published_at = new Date();
      }
    }

    setFields.updated_by = req.user.id;
    setFields.updated_at = new Date();

    const faq = await updateOne('faqs', { id }, { $set: setFields });

    res.json({ faq });
  } catch (error) {
    console.error('Update FAQ error:', error);
    res.status(500).json({ error: 'Failed to update FAQ' });
  }
});

/**
 * Delete FAQ (admin only)
 * DELETE /api/faqs/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const faq = await findOne('faqs', { id });
    if (!faq) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    // Clean up related data
    await deleteMany('faq_views', { faq_id: id });
    await deleteMany('faq_feedback', { faq_id: id });
    await deleteMany('faqs', { id });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete FAQ error:', error);
    res.status(500).json({ error: 'Failed to delete FAQ' });
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
    const faq = await findOne('faqs', { id });
    if (!faq) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    const userId = req.user?.id || null;

    // Upsert feedback
    await updateOne(
      'faq_feedback',
      { faq_id: id, user_id: userId },
      {
        $set: {
          is_helpful,
          feedback_text: feedback_text || null,
        },
        $setOnInsert: {
          id: randomUUID(),
          faq_id: id,
          user_id: userId,
          created_at: new Date(),
        },
      },
      { upsert: true }
    );

    // Update FAQ helpful/not helpful counts
    const helpfulCount = await countDocuments('faq_feedback', {
      faq_id: id,
      is_helpful: true,
    });
    const notHelpfulCount = await countDocuments('faq_feedback', {
      faq_id: id,
      is_helpful: false,
    });

    await updateOne(
      'faqs',
      { id },
      { $set: { helpful_count: helpfulCount, not_helpful_count: notHelpfulCount } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Submit FAQ feedback error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

export default router;
