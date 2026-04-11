/**
 * @file server/routes/asset-graph.js
 * @description Asset CMDB Dependency Graph API — Sprint 36.
 *
 * Routes
 * ------
 * GET    /api/assets/:id/graph               — BFS traversal to depth 3
 * POST   /api/assets/:id/dependencies        — add dependency relationship
 * DELETE /api/assets/:id/dependencies/:relId — remove dependency relationship
 *
 * Security
 * --------
 * All routes require authentication and strict tenant isolation.
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

const ASSETS_COL = 'assets';

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

/** Compute impact score: total number of descendant assets reachable from this node. */
function countDescendants(node) {
  if (!node.children || node.children.length === 0) return 0;
  return node.children.reduce((sum, child) => sum + 1 + countDescendants(child), 0);
}

/**
 * BFS traversal to build descendants tree up to maxDepth levels.
 * Returns flat array of descendant assets with depth info.
 */
async function buildDescendants(adapter, tenantId, rootId, maxDepth = 3) {
  const descendants = [];
  const queue = [{ id: rootId, depth: 0 }];
  const visited = new Set([rootId]);

  while (queue.length > 0) {
    const { id: currentId, depth } = queue.shift();
    if (depth >= maxDepth) continue;

    const asset = await adapter.findOne(ASSETS_COL, { id: currentId, tenant_id: tenantId });
    if (!asset || !asset.child_asset_ids || asset.child_asset_ids.length === 0) continue;

    for (const childId of asset.child_asset_ids) {
      if (visited.has(childId)) continue;
      visited.add(childId);

      const child = await adapter.findOne(ASSETS_COL, { id: childId, tenant_id: tenantId });
      if (!child) continue;

      descendants.push({ ...child, _depth: depth + 1 });
      queue.push({ id: childId, depth: depth + 1 });
    }
  }

  return descendants;
}

/** Walk up the parent chain to build ancestors list (up to depth 3). */
async function buildAncestors(adapter, tenantId, asset) {
  const ancestors = [];
  let current = asset;
  let depth = 0;

  while (current.parent_asset_id && depth < 3) {
    const parent = await adapter.findOne(ASSETS_COL, {
      id:        current.parent_asset_id,
      tenant_id: tenantId,
    });
    if (!parent) break;
    ancestors.push(parent);
    current = parent;
    depth++;
  }

  return ancestors;
}

// ── GET /api/assets/:id/graph ─────────────────────────────────────────────────

router.get('/:id/graph', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { id } = req.params;

    const adapter = await getAdapter();
    const asset = await adapter.findOne(ASSETS_COL, { id, tenant_id: tenantId });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const [ancestors, descendants] = await Promise.all([
      buildAncestors(adapter, tenantId, asset),
      buildDescendants(adapter, tenantId, id),
    ]);

    const impactScore = descendants.length;

    res.json({ asset, ancestors, descendants, impactScore });
  } catch (error) {
    logger.error('AssetGraph: graph error', { error: error.message });
    res.status(500).json({ error: 'Failed to build asset graph' });
  }
});

// ── POST /api/assets/:id/dependencies ────────────────────────────────────────

router.post('/:id/dependencies', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { id } = req.params;
    const { dependencyType, relatedAssetId } = req.body;

    if (!relatedAssetId) {
      return res.status(400).json({ error: 'relatedAssetId is required' });
    }
    if (relatedAssetId === id) {
      return res.status(400).json({ error: 'Asset cannot depend on itself' });
    }

    const validTypes = ['hosts', 'powers', 'connects_to', 'contains'];
    if (dependencyType && !validTypes.includes(dependencyType)) {
      return res.status(400).json({ error: `dependencyType must be one of: ${validTypes.join(', ')}` });
    }

    const adapter = await getAdapter();

    const [parent, child] = await Promise.all([
      adapter.findOne(ASSETS_COL, { id, tenant_id: tenantId }),
      adapter.findOne(ASSETS_COL, { id: relatedAssetId, tenant_id: tenantId }),
    ]);

    if (!parent) return res.status(404).json({ error: 'Parent asset not found' });
    if (!child)  return res.status(404).json({ error: 'Related asset not found' });

    const currentChildIds = parent.child_asset_ids || [];
    if (!currentChildIds.includes(relatedAssetId)) {
      currentChildIds.push(relatedAssetId);
    }

    await adapter.updateOne(
      ASSETS_COL,
      { id, tenant_id: tenantId },
      {
        child_asset_ids: currentChildIds,
        dependency_type: dependencyType || parent.dependency_type || null,
        updated_at:      new Date().toISOString(),
      },
    );

    await adapter.updateOne(
      ASSETS_COL,
      { id: relatedAssetId, tenant_id: tenantId },
      {
        parent_asset_id: id,
        updated_at:      new Date().toISOString(),
      },
    );

    logger.info('AssetGraph: dependency added', { parentId: id, childId: relatedAssetId, tenantId });
    res.status(201).json({ message: 'Dependency added', parentId: id, childId: relatedAssetId });
  } catch (error) {
    logger.error('AssetGraph: add dependency error', { error: error.message });
    res.status(500).json({ error: 'Failed to add dependency' });
  }
});

// ── DELETE /api/assets/:id/dependencies/:relId ────────────────────────────────

router.delete('/:id/dependencies/:relId', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { id, relId } = req.params;

    const adapter = await getAdapter();

    const [parent, child] = await Promise.all([
      adapter.findOne(ASSETS_COL, { id, tenant_id: tenantId }),
      adapter.findOne(ASSETS_COL, { id: relId, tenant_id: tenantId }),
    ]);

    if (!parent) return res.status(404).json({ error: 'Asset not found' });

    const updatedChildIds = (parent.child_asset_ids || []).filter(cid => cid !== relId);

    await adapter.updateOne(
      ASSETS_COL,
      { id, tenant_id: tenantId },
      { child_asset_ids: updatedChildIds, updated_at: new Date().toISOString() },
    );

    if (child && child.parent_asset_id === id) {
      await adapter.updateOne(
        ASSETS_COL,
        { id: relId, tenant_id: tenantId },
        { parent_asset_id: null, updated_at: new Date().toISOString() },
      );
    }

    logger.info('AssetGraph: dependency removed', { parentId: id, childId: relId, tenantId });
    res.json({ message: 'Dependency removed', parentId: id, childId: relId });
  } catch (error) {
    logger.error('AssetGraph: remove dependency error', { error: error.message });
    res.status(500).json({ error: 'Failed to remove dependency' });
  }
});

export default router;
