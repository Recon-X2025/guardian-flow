import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

router.get('/listings', authenticateToken, async (req, res) => {
  try {
    const adapter = await getAdapter();
    const listings = await adapter.findMany('dex_marketplace_listings', { status: 'published' }, { limit: 50 });
    res.json({ listings });
  } catch (err) {
    logger.error('DEX marketplace listings error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/listings', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { flow_template_id, name, description, category, price } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const adapter = await getAdapter();
    const listing = {
      id: randomUUID(),
      publisher_tenant_id: tenantId,
      flow_template_id,
      name,
      description: description || '',
      category: category || 'general',
      price: price || 0,
      rating_avg: 0,
      rating_count: 0,
      install_count: 0,
      status: 'published',
      created_at: new Date().toISOString(),
    };
    await adapter.insertOne('dex_marketplace_listings', listing);
    res.status(201).json({ listing });
  } catch (err) {
    logger.error('DEX marketplace publish error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/listings/:id/install', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const listing = await adapter.findOne('dex_marketplace_listings', { id: req.params.id });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    const install = {
      id: randomUUID(),
      tenant_id: tenantId,
      listing_id: req.params.id,
      installed_at: new Date().toISOString(),
    };
    await adapter.insertOne('dex_marketplace_installs', install);
    res.json({ installed: true, install });
  } catch (err) {
    logger.error('DEX marketplace install error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/listings/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const adapter = await getAdapter();
    const reviews = await adapter.findMany('dex_marketplace_reviews', { listing_id: req.params.id }, { limit: 50 });
    res.json({ reviews });
  } catch (err) {
    logger.error('DEX marketplace reviews error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/listings/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'rating must be between 1 and 5' });
    const adapter = await getAdapter();
    const review = {
      id: randomUUID(),
      tenant_id: tenantId,
      listing_id: req.params.id,
      reviewer_id: req.user.id,
      rating,
      comment: comment || '',
      created_at: new Date().toISOString(),
    };
    await adapter.insertOne('dex_marketplace_reviews', review);
    res.status(201).json({ review });
  } catch (err) {
    logger.error('DEX marketplace review submit error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
