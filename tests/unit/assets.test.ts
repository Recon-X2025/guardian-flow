/**
 * @file tests/unit/assets.test.ts
 * @description Unit tests for asset hierarchy tree building.
 */

import { describe, it, expect } from 'vitest';

// ── Asset tree builder (mirrors server/routes/assets.js buildTree) ────────────

interface Asset {
  id: string;
  name: string;
  parent_id?: string | null;
  children?: Asset[];
}

function buildTree(assets: Asset[]): Asset[] {
  const map = new Map<string, Asset>(assets.map(a => [a.id, { ...a, children: [] }]));
  const roots: Asset[] = [];
  for (const asset of map.values()) {
    if (asset.parent_id && map.has(asset.parent_id)) {
      map.get(asset.parent_id)!.children!.push(asset);
    } else {
      roots.push(asset);
    }
  }
  return roots;
}

function findInTree(nodes: Asset[], id: string): Asset | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findInTree(node.children ?? [], id);
    if (found) return found;
  }
  return undefined;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('buildTree()', () => {
  it('returns empty array for empty input', () => {
    expect(buildTree([])).toEqual([]);
  });

  it('places assets without parent_id at root', () => {
    const assets: Asset[] = [
      { id: 'a1', name: 'Root A' },
      { id: 'a2', name: 'Root B' },
    ];
    const tree = buildTree(assets);
    expect(tree).toHaveLength(2);
    expect(tree.map(n => n.id)).toContain('a1');
    expect(tree.map(n => n.id)).toContain('a2');
  });

  it('places child under correct parent', () => {
    const assets: Asset[] = [
      { id: 'parent', name: 'Parent', parent_id: null },
      { id: 'child',  name: 'Child',  parent_id: 'parent' },
    ];
    const tree = buildTree(assets);
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children![0].id).toBe('child');
  });

  it('builds multi-level hierarchy', () => {
    const assets: Asset[] = [
      { id: 'root',        name: 'Root',        parent_id: null },
      { id: 'child',       name: 'Child',       parent_id: 'root' },
      { id: 'grandchild',  name: 'Grandchild',  parent_id: 'child' },
    ];
    const tree = buildTree(assets);
    expect(tree).toHaveLength(1);

    const child = findInTree(tree, 'child');
    expect(child).toBeDefined();
    expect(child!.children).toHaveLength(1);

    const grandchild = findInTree(tree, 'grandchild');
    expect(grandchild).toBeDefined();
    expect(grandchild!.children).toHaveLength(0);
  });

  it('treats orphan (dangling parent_id) as root node', () => {
    const assets: Asset[] = [
      { id: 'orphan', name: 'Orphan', parent_id: 'nonexistent' },
    ];
    const tree = buildTree(assets);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('orphan');
  });

  it('supports multiple roots each with children', () => {
    const assets: Asset[] = [
      { id: 'r1', name: 'Root 1', parent_id: null },
      { id: 'r2', name: 'Root 2', parent_id: null },
      { id: 'c1', name: 'Child of R1', parent_id: 'r1' },
      { id: 'c2', name: 'Child of R2', parent_id: 'r2' },
    ];
    const tree = buildTree(assets);
    expect(tree).toHaveLength(2);

    const r1 = tree.find(n => n.id === 'r1')!;
    const r2 = tree.find(n => n.id === 'r2')!;
    expect(r1.children).toHaveLength(1);
    expect(r2.children).toHaveLength(1);
    expect(r1.children![0].id).toBe('c1');
    expect(r2.children![0].id).toBe('c2');
  });

  it('preserves asset properties on tree nodes', () => {
    const assets: Asset[] = [
      { id: 'a1', name: 'Asset One', parent_id: null },
    ];
    const tree = buildTree(assets);
    expect(tree[0].name).toBe('Asset One');
  });

  it('handles assets with null parent_id as roots', () => {
    const assets: Asset[] = [
      { id: 'x', name: 'X', parent_id: null },
    ];
    expect(buildTree(assets)).toHaveLength(1);
  });
});

// ── findInTree helper tests ───────────────────────────────────────────────────

describe('findInTree()', () => {
  it('finds a deeply nested node', () => {
    const assets: Asset[] = [
      { id: 'root', name: 'Root', parent_id: null },
      { id: 'mid',  name: 'Mid',  parent_id: 'root' },
      { id: 'deep', name: 'Deep', parent_id: 'mid' },
    ];
    const tree   = buildTree(assets);
    const result = findInTree(tree, 'deep');
    expect(result).toBeDefined();
    expect(result!.name).toBe('Deep');
  });

  it('returns undefined for non-existent id', () => {
    const assets: Asset[] = [{ id: 'a', name: 'A' }];
    const tree   = buildTree(assets);
    expect(findInTree(tree, 'zzz')).toBeUndefined();
  });
});
