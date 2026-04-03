/**
 * Unit tests for dependency graph operations
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  createGraph,
  loadGraph,
  saveGraph,
  loadOrCreateGraph,
  setNode,
  removeNode,
  getNode,
  hasNode,
  addDependency,
  addDependent,
  getDependencies,
  getDependents,
  getArticlesForSource,
  findStaleArticles,
  getAllArticles,
  findOrphans,
  getGraphStats,
  GraphNotFoundError,
} from '../../../src/core/graph';
import { createEmptyGraph, type Graph } from '../../../src/core/schemas';

describe('graph CRUD operations', () => {
  let testDir: string;
  let graphPath: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'kb-graph-test-'));
    graphPath = join(testDir, 'graph.json');
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('creates new graph file', async () => {
    const graph = await createGraph(graphPath);

    expect(graph.version).toBe(1);
    expect(graph.nodes).toEqual({});

    // Verify file exists
    const file = Bun.file(graphPath);
    expect(await file.exists()).toBe(true);
  });

  test('loads existing graph', async () => {
    // Create a graph with data
    const initial: Graph = {
      version: 1,
      nodes: {
        'wiki/concepts/test.md': {
          dependsOn: ['raw/source.md'],
          dependents: [],
        },
      },
    };
    await Bun.write(graphPath, JSON.stringify(initial, null, 2));

    const loaded = await loadGraph(graphPath);

    expect(loaded.nodes['wiki/concepts/test.md']).toBeDefined();
    expect(loaded.nodes['wiki/concepts/test.md'].dependsOn).toEqual(['raw/source.md']);
  });

  test('throws error when graph not found', async () => {
    const nonExistentPath = join(testDir, 'nonexistent.json');

    await expect(loadGraph(nonExistentPath)).rejects.toThrow(GraphNotFoundError);
  });

  test('loadOrCreateGraph creates if not exists', async () => {
    const graph = await loadOrCreateGraph(graphPath);

    expect(graph.version).toBe(1);
    expect(graph.nodes).toEqual({});
  });

  test('loadOrCreateGraph loads if exists', async () => {
    const initial: Graph = {
      version: 1,
      nodes: {
        'wiki/test.md': { dependsOn: [], dependents: [] },
      },
    };
    await Bun.write(graphPath, JSON.stringify(initial, null, 2));

    const graph = await loadOrCreateGraph(graphPath);

    expect(graph.nodes['wiki/test.md']).toBeDefined();
  });

  test('saves graph to file', async () => {
    const graph: Graph = {
      version: 1,
      nodes: {
        'wiki/concepts/test.md': {
          dependsOn: ['raw/source.md'],
          dependents: ['wiki/entities/other.md'],
        },
      },
    };

    await saveGraph(graphPath, graph);

    const content = await Bun.file(graphPath).json();
    expect(content.nodes['wiki/concepts/test.md'].dependsOn).toEqual(['raw/source.md']);
  });
});

describe('node operations', () => {
  let graph: Graph;

  beforeEach(() => {
    graph = createEmptyGraph();
  });

  test('setNode adds new node', () => {
    const updated = setNode(graph, 'wiki/concepts/test.md', {
      dependsOn: ['raw/source.md'],
      dependents: [],
    });

    expect(updated.nodes['wiki/concepts/test.md']).toBeDefined();
    expect(updated.nodes['wiki/concepts/test.md'].dependsOn).toEqual(['raw/source.md']);
  });

  test('setNode updates existing node', () => {
    let updated = setNode(graph, 'wiki/test.md', {
      dependsOn: ['raw/old.md'],
      dependents: [],
    });

    updated = setNode(updated, 'wiki/test.md', {
      dependsOn: ['raw/new.md'],
      dependents: ['wiki/other.md'],
    });

    expect(updated.nodes['wiki/test.md'].dependsOn).toEqual(['raw/new.md']);
    expect(updated.nodes['wiki/test.md'].dependents).toEqual(['wiki/other.md']);
  });

  test('removeNode removes existing node', () => {
    const withNode = setNode(graph, 'wiki/test.md', {
      dependsOn: [],
      dependents: [],
    });

    const removed = removeNode(withNode, 'wiki/test.md');

    expect(removed.nodes['wiki/test.md']).toBeUndefined();
  });

  test('getNode returns node if exists', () => {
    const updated = setNode(graph, 'wiki/test.md', {
      dependsOn: ['source.md'],
      dependents: [],
    });

    const node = getNode(updated, 'wiki/test.md');

    expect(node).not.toBeNull();
    expect(node?.dependsOn).toEqual(['source.md']);
  });

  test('getNode returns null if not exists', () => {
    const node = getNode(graph, 'wiki/nonexistent.md');
    expect(node).toBeNull();
  });

  test('hasNode returns true for existing node', () => {
    const updated = setNode(graph, 'wiki/test.md', {
      dependsOn: [],
      dependents: [],
    });

    expect(hasNode(updated, 'wiki/test.md')).toBe(true);
  });

  test('hasNode returns false for nonexistent node', () => {
    expect(hasNode(graph, 'wiki/nonexistent.md')).toBe(false);
  });
});

describe('dependency operations', () => {
  let graph: Graph;

  beforeEach(() => {
    graph = createEmptyGraph();
  });

  test('addDependency adds source to dependsOn', () => {
    const updated = addDependency(graph, 'wiki/article.md', 'raw/source.md');

    expect(updated.nodes['wiki/article.md'].dependsOn).toContain('raw/source.md');
  });

  test('addDependency does not duplicate', () => {
    let updated = addDependency(graph, 'wiki/article.md', 'raw/source.md');
    updated = addDependency(updated, 'wiki/article.md', 'raw/source.md');

    expect(updated.nodes['wiki/article.md'].dependsOn).toEqual(['raw/source.md']);
  });

  test('addDependent adds article to dependents', () => {
    const updated = addDependent(graph, 'wiki/article.md', 'wiki/other.md');

    expect(updated.nodes['wiki/article.md'].dependents).toContain('wiki/other.md');
  });

  test('getDependencies returns empty array for nonexistent node', () => {
    expect(getDependencies(graph, 'wiki/nonexistent.md')).toEqual([]);
  });

  test('getDependents returns empty array for nonexistent node', () => {
    expect(getDependents(graph, 'wiki/nonexistent.md')).toEqual([]);
  });

  test('getArticlesForSource finds dependent articles', () => {
    let g = graph;
    g = setNode(g, 'wiki/article1.md', { dependsOn: ['raw/source.md'], dependents: [] });
    g = setNode(g, 'wiki/article2.md', { dependsOn: ['raw/source.md', 'raw/other.md'], dependents: [] });
    g = setNode(g, 'wiki/article3.md', { dependsOn: ['raw/other.md'], dependents: [] });

    const articles = getArticlesForSource(g, 'raw/source.md');

    expect(articles).toContain('wiki/article1.md');
    expect(articles).toContain('wiki/article2.md');
    expect(articles).not.toContain('wiki/article3.md');
  });
});

describe('stale detection', () => {
  test('finds stale articles when source changes', async () => {
    const graph: Graph = {
      version: 1,
      nodes: {
        'wiki/concepts/attention.md': {
          dependsOn: ['raw/paper.md'],
          dependents: ['wiki/entities/transformer.md'],
        },
        'wiki/entities/transformer.md': {
          dependsOn: [],
          dependents: [],
        },
      },
    };

    const stale = await findStaleArticles(graph, ['raw/paper.md']);

    expect(stale.length).toBeGreaterThan(0);
    expect(stale.map((s) => s.articlePath)).toContain('wiki/concepts/attention.md');
  });

  test('returns empty array when no sources changed', async () => {
    const graph: Graph = {
      version: 1,
      nodes: {
        'wiki/test.md': { dependsOn: ['raw/source.md'], dependents: [] },
      },
    };

    const stale = await findStaleArticles(graph, []);

    expect(stale).toEqual([]);
  });
});

describe('graph analysis', () => {
  test('getAllArticles returns all article paths', () => {
    const graph: Graph = {
      version: 1,
      nodes: {
        'wiki/a.md': { dependsOn: [], dependents: [] },
        'wiki/b.md': { dependsOn: [], dependents: [] },
      },
    };

    const articles = getAllArticles(graph);

    expect(articles).toEqual(['wiki/a.md', 'wiki/b.md']);
  });

  test('findOrphans finds articles with no dependencies', () => {
    const graph: Graph = {
      version: 1,
      nodes: {
        'wiki/orphan.md': { dependsOn: [], dependents: [] },
        'wiki/connected.md': { dependsOn: ['raw/source.md'], dependents: [] },
      },
    };

    const orphans = findOrphans(graph);

    expect(orphans).toContain('wiki/orphan.md');
    expect(orphans).not.toContain('wiki/connected.md');
  });

  test('getGraphStats returns correct statistics', () => {
    const graph: Graph = {
      version: 1,
      nodes: {
        'wiki/a.md': { dependsOn: ['raw/1.md', 'raw/2.md'], dependents: [] },
        'wiki/b.md': { dependsOn: ['raw/1.md'], dependents: [] },
        'wiki/orphan.md': { dependsOn: [], dependents: [] },
      },
    };

    const stats = getGraphStats(graph);

    expect(stats.totalArticles).toBe(3);
    expect(stats.totalDependencies).toBe(3);
    expect(stats.orphanCount).toBe(1);
    expect(stats.averageDependencies).toBe(1);
  });
});
