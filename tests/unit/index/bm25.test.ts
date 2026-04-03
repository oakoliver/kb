/**
 * Unit tests for BM25 index operations
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  buildIndex,
  search,
  extractSnippet,
  loadIndex,
  saveIndex,
  type SearchResult,
} from '../../../src/index/bm25';

describe('BM25 index building', () => {
  let testDir: string;
  let wikiDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'kb-bm25-test-'));
    wikiDir = join(testDir, 'wiki');
    await mkdir(join(wikiDir, 'concepts'), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('builds index from wiki articles', async () => {
    // Create test articles
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

The attention mechanism allows neural networks to focus on relevant parts of the input.
It is a key component of the Transformer architecture.`
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

The Transformer uses self-attention to process sequences in parallel.
This makes it much faster than recurrent neural networks.`
    );

    const index = await buildIndex(wikiDir);

    expect(index.documents).toHaveLength(2);
    expect(index.documents.map((d) => d.title)).toContain('Attention Mechanism');
    expect(index.documents.map((d) => d.title)).toContain('Transformer Architecture');
  });

  test('handles empty wiki directory', async () => {
    const index = await buildIndex(wikiDir);

    expect(index.documents).toHaveLength(0);
  });

  test('skips files without frontmatter', async () => {
    await writeFile(join(wikiDir, 'concepts', 'no-frontmatter.md'), '# Just a heading\n\nNo frontmatter here.');

    const index = await buildIndex(wikiDir);

    expect(index.documents).toHaveLength(0);
  });
});

describe('BM25 search', () => {
  let testDir: string;
  let wikiDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'kb-bm25-search-test-'));
    wikiDir = join(testDir, 'wiki');
    await mkdir(join(wikiDir, 'concepts'), { recursive: true });

    // Create test articles
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

The attention mechanism allows neural networks to focus on relevant parts of the input.
This is crucial for understanding context in natural language processing tasks.`
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

The Transformer uses self-attention to process sequences in parallel.
It revolutionized machine learning and natural language processing.`
    );

    await writeFile(
      join(wikiDir, 'concepts', 'rnn.md'),
      `---
title: Recurrent Neural Networks
type: concept
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources: []
related: []
---

# Recurrent Neural Networks

RNNs process sequences one step at a time.
They were the dominant architecture before Transformers.`
    );
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('returns ranked results for query', async () => {
    const index = await buildIndex(wikiDir);
    const results = search(index, 'attention mechanism');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toBe('Attention Mechanism');
  });

  test('respects limit parameter', async () => {
    const index = await buildIndex(wikiDir);
    const results = search(index, 'neural networks', { limit: 1 });

    expect(results).toHaveLength(1);
  });

  test('returns empty array for no matches', async () => {
    const index = await buildIndex(wikiDir);
    const results = search(index, 'quantum computing blockchain');

    expect(results).toHaveLength(0);
  });

  test('results include scores', async () => {
    const index = await buildIndex(wikiDir);
    const results = search(index, 'attention');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].score).toBeGreaterThan(0);
  });

  test('results are sorted by score descending', async () => {
    const index = await buildIndex(wikiDir);
    const results = search(index, 'neural networks');

    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });
});

describe('snippet extraction', () => {
  test('extracts snippet around query terms', () => {
    const content = `The attention mechanism is a powerful technique.
It allows models to focus on relevant parts of the input.
This is especially useful for long sequences.
Attention has become fundamental to modern NLP.`;

    const snippet = extractSnippet(content, 'attention', { maxLength: 100 });

    expect(snippet.toLowerCase()).toContain('attention');
    expect(snippet.length).toBeLessThanOrEqual(120); // Allow some margin for word boundaries
  });

  test('returns beginning of content if no match', () => {
    const content = 'This is some content without the search term. More content here.';

    const snippet = extractSnippet(content, 'nonexistent', { maxLength: 50 });

    expect(snippet).toContain('This is some');
  });

  test('handles short content', () => {
    const content = 'Short.';

    const snippet = extractSnippet(content, 'short', { maxLength: 100 });

    expect(snippet).toBe('Short.');
  });

  test('adds ellipsis for truncated snippets', () => {
    const content = 'Start of content. The middle part with attention here. End of content that goes on much longer.';

    const snippet = extractSnippet(content, 'attention', { maxLength: 60 });

    expect(snippet).toContain('...');
  });
});

describe('index persistence', () => {
  let testDir: string;
  let wikiDir: string;
  let indexDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'kb-bm25-persist-test-'));
    wikiDir = join(testDir, 'wiki');
    indexDir = join(testDir, 'index');
    await mkdir(join(wikiDir, 'concepts'), { recursive: true });
    await mkdir(indexDir, { recursive: true });

    await writeFile(
      join(wikiDir, 'concepts', 'test.md'),
      `---
title: Test Article
type: concept
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources: []
related: []
---

# Test Article

This is test content for the BM25 index.`
    );
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('saves and loads index', async () => {
    const index = await buildIndex(wikiDir);
    await saveIndex(index, indexDir);

    const loaded = await loadIndex(indexDir);

    expect(loaded.documents).toHaveLength(1);
    expect(loaded.documents[0].title).toBe('Test Article');
  });

  test('search works on loaded index', async () => {
    const index = await buildIndex(wikiDir);
    await saveIndex(index, indexDir);

    const loaded = await loadIndex(indexDir);
    const results = search(loaded, 'test');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toBe('Test Article');
  });
});
