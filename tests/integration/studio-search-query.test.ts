/**
 * Integration tests for studio query streaming functionality
 * Note: LLM streaming tests are mocked since they require API keys.
 * We test the query adapters, save flow, and state management integration.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createStudioFixture, STUDIO_FIXTURE_META } from './helpers/studio';
import { join } from 'path';
import { readdir, readFile } from 'fs/promises';
import { getWikiPaths } from '../../src/core/resolver';
import { saveQueryDocument, generateSlug, buildQueryOutputLines } from '../../src/tui/operations/query';
import {
  createQueryDocument,
  appendQueryStream,
  finalizeQueryDocument,
} from '../../src/tui/editor';
import { extractWikilinks } from '../../src/tui/link-map';
import type { EditorState } from '../../src/tui/state';

// =============================================================================
// Save Query Integration Tests
// =============================================================================

describe('studio query save flow', () => {
  let wikiDir: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const fixture = await createStudioFixture();
    wikiDir = fixture.wikiDir;
    cleanup = fixture.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  test('saveQueryDocument creates a file in queries/', async () => {
    const paths = getWikiPaths(wikiDir);
    const result = await saveQueryDocument({
      question: 'How does attention work?',
      answer: 'Attention allows models to focus on relevant parts of the input.',
      sources: ['wiki/concepts/attention-mechanism.md'],
      queriesDir: paths.queries,
    });

    expect(result.savedPath).toContain('queries/');
    expect(result.relativePath).toMatch(/^queries\//);
    expect(result.relativePath).toMatch(/\.md$/);

    // Verify file exists
    const files = await readdir(paths.queries);
    expect(files.length).toBeGreaterThanOrEqual(2); // existing + new
  });

  test('saveQueryDocument file contains question and answer', async () => {
    const paths = getWikiPaths(wikiDir);
    const result = await saveQueryDocument({
      question: 'What is self-attention?',
      answer: 'Self-attention is a mechanism where each element attends to all others.',
      sources: ['wiki/concepts/self-attention.md'],
      queriesDir: paths.queries,
    });

    const content = await readFile(result.savedPath, 'utf-8');
    expect(content).toContain('What is self-attention?');
    expect(content).toContain('Self-attention is a mechanism');
    expect(content).toContain('type: query');
    expect(content).toContain('wiki/concepts/self-attention.md');
  });

  test('saveQueryDocument generates unique filenames', async () => {
    const paths = getWikiPaths(wikiDir);

    const result1 = await saveQueryDocument({
      question: 'Query one',
      answer: 'Answer one',
      sources: [],
      queriesDir: paths.queries,
    });

    const result2 = await saveQueryDocument({
      question: 'Query two',
      answer: 'Answer two',
      sources: [],
      queriesDir: paths.queries,
    });

    expect(result1.savedPath).not.toBe(result2.savedPath);
  });
});

// =============================================================================
// Query Document Streaming Integration Tests
// =============================================================================

describe('studio query document streaming', () => {
  test('full streaming flow: create, append chunks, finalize', () => {
    const editorState: EditorState = {
      document: null,
      history: [],
      historyIndex: -1,
    };

    // 1. Create transient document
    const withDoc = createQueryDocument(editorState, 'How does attention work?');
    expect(withDoc.document).not.toBeNull();
    expect(withDoc.document!.path).toBe('__query__');
    expect(withDoc.document!.content).toBe('');

    // 2. Simulate streaming chunks
    let doc = withDoc.document!;
    doc = appendQueryStream(doc, 'The attention mechanism ');
    doc = appendQueryStream(doc, 'allows models to focus ');
    doc = appendQueryStream(doc, 'on relevant parts of the input. ');
    doc = appendQueryStream(doc, 'See [[Attention Mechanism]] for more.');

    expect(doc.content).toContain('attention mechanism');
    expect(doc.content).toContain('[[Attention Mechanism]]');

    // 3. Finalize with rendering
    const finalized = finalizeQueryDocument(
      doc,
      (content) => content.toUpperCase(), // simple render mock
      (content) => extractWikilinks(content),
    );

    expect(finalized.renderedContent).toContain('THE ATTENTION MECHANISM');
    expect(finalized.links.length).toBeGreaterThan(0);
    expect(finalized.links[0].target).toBe('Attention Mechanism');
  });

  test('query document preserves history when opening on top of existing doc', () => {
    const editorState: EditorState = {
      document: {
        path: '/wiki/concepts/test.md',
        title: 'Test',
        content: 'test',
        renderedContent: 'test',
        links: [],
        scrollY: 5,
        focusedLinkIndex: -1,
      },
      history: [],
      historyIndex: -1,
    };

    // Creating a query doc should NOT push to history (it's transient)
    const withQuery = createQueryDocument(editorState, 'My question');
    // History unchanged - createQueryDocument doesn't manage history
    expect(withQuery.history).toEqual([]);
  });
});

// =============================================================================
// Query Output Lines Tests
// =============================================================================

describe('buildQueryOutputLines integration', () => {
  test('builds complete output for saved query', () => {
    const lines = buildQueryOutputLines(
      'How does attention work?',
      ['wiki/concepts/attention.md', 'wiki/entities/transformer.md'],
      'queries/2026-04-04-how-does-attention-work.md',
    );

    expect(lines.length).toBeGreaterThanOrEqual(2);
    const texts = lines.map(l => l.text);
    expect(texts.some(t => t.includes('How does attention'))).toBe(true);
    expect(texts.some(t => t.includes('attention.md'))).toBe(true);
    expect(texts.some(t => t.includes('queries/'))).toBe(true);
  });
});

// =============================================================================
// Slug Generation Tests
// =============================================================================

describe('generateSlug integration', () => {
  test('creates filesystem-safe slugs', () => {
    const cases = [
      ['Simple question', 'simple-question'],
      ['What is AI?', 'what-is-ai'],
      ['Test: with (special) chars!', 'test-with-special-chars'],
    ];

    for (const [input, expected] of cases) {
      expect(generateSlug(input)).toBe(expected);
    }
  });
});
