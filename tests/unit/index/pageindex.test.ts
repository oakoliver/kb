/**
 * Unit tests for pageindex tree-search wrapper
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  searchRelevantContent,
  buildContentTree,
  type ContentNode,
  type SearchContentResult,
} from '../../../src/index/pageindex';

describe('content tree building', () => {
  let testDir: string;
  let wikiDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'kb-pageindex-test-'));
    wikiDir = join(testDir, 'wiki');
    await mkdir(join(wikiDir, 'concepts'), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('builds tree from wiki articles', async () => {
    await writeFile(
      join(wikiDir, 'concepts', 'attention.md'),
      `---
title: Attention Mechanism
type: concept
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources: []
related: []
---

# Attention Mechanism

## Overview

The attention mechanism allows neural networks to focus on relevant parts.

## How It Works

Attention computes a weighted sum of values based on query-key similarity.

## Applications

Used in Transformers, machine translation, and more.`
    );

    const tree = await buildContentTree(wikiDir);

    expect(tree.length).toBeGreaterThan(0);
    expect(tree[0].title).toBe('Attention Mechanism');
    expect(tree[0].sections.length).toBeGreaterThan(0);
  });

  test('handles empty wiki', async () => {
    const tree = await buildContentTree(wikiDir);

    expect(tree).toEqual([]);
  });
});

describe('content search', () => {
  let testDir: string;
  let wikiDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'kb-pageindex-search-test-'));
    wikiDir = join(testDir, 'wiki');
    await mkdir(join(wikiDir, 'concepts'), { recursive: true });

    await writeFile(
      join(wikiDir, 'concepts', 'attention.md'),
      `---
title: Attention Mechanism
type: concept
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources: []
related: []
---

# Attention Mechanism

## Overview

The attention mechanism allows neural networks to focus on relevant parts of the input sequence.

## Types of Attention

- Self-attention: Query, key, and value come from the same source
- Cross-attention: Query comes from a different source than key and value

## Applications

Attention is used in Transformers for machine translation.`
    );

    await writeFile(
      join(wikiDir, 'concepts', 'transformer.md'),
      `---
title: Transformer Architecture
type: concept
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources: []
related: []
---

# Transformer Architecture

## Overview

The Transformer is a neural network architecture that relies entirely on self-attention.

## Key Components

- Multi-head attention
- Position-wise feed-forward networks
- Layer normalization

## Advantages

- Parallel processing of sequences
- Better at capturing long-range dependencies`
    );
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('finds relevant content for query', async () => {
    const results = await searchRelevantContent(wikiDir, 'what is attention mechanism');

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.title === 'Attention Mechanism')).toBe(true);
  });

  test('returns content with sections', async () => {
    const results = await searchRelevantContent(wikiDir, 'attention');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toBeDefined();
    expect(results[0].content.length).toBeGreaterThan(0);
  });

  test('respects limit parameter', async () => {
    const results = await searchRelevantContent(wikiDir, 'neural networks', { limit: 1 });

    expect(results.length).toBeLessThanOrEqual(1);
  });

  test('returns empty array for no matches', async () => {
    const results = await searchRelevantContent(wikiDir, 'quantum computing blockchain');

    expect(results).toHaveLength(0);
  });
});
