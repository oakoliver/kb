/**
 * Integration tests for KB Studio explorer and document navigation
 * Tests: T017 [US1]
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { join } from 'path';
import { createStudioFixture, STUDIO_FIXTURE_META } from './helpers/studio';
import {
  buildExplorerItems,
  flattenExplorerItems,
  loadWorkspaceSnapshot,
  collectArticlePaths,
} from '../../src/tui/operations/workspace';
import { getWikiPaths } from '../../src/core/resolver';
import { loadDocument } from '../../src/tui/document';
import {
  moveSelectionUp,
  moveSelectionDown,
  toggleExpand,
  getSelectedItem,
  getVisibleItems,
  selectByPath,
} from '../../src/tui/explorer';
import {
  openDocument,
  navigateBack,
  scrollDocument,
  focusNextLink,
  focusPrevLink,
  getFocusedLink,
  resolveLink,
} from '../../src/tui/editor';
import type { ExplorerState, EditorState } from '../../src/tui/state';

describe('explorer and document navigation', () => {
  let wikiDir: string;
  let wikiPath: string;
  let cleanup: () => Promise<void>;
  let explorerItems: Awaited<ReturnType<typeof buildExplorerItems>>;

  beforeAll(async () => {
    const fixture = await createStudioFixture();
    wikiDir = fixture.wikiDir;
    wikiPath = join(wikiDir, 'wiki');
    cleanup = fixture.cleanup;
    explorerItems = await buildExplorerItems(wikiPath);
  });

  afterAll(async () => {
    await cleanup();
  });

  // ===========================================================================
  // Explorer tree tests
  // ===========================================================================

  test('buildExplorerItems creates correct directory structure', () => {
    expect(explorerItems.length).toBeGreaterThan(0);
    // Should have concepts, entities, syntheses dirs
    const dirNames = explorerItems.filter((i) => i.isDir).map((i) => i.name);
    expect(dirNames).toContain('concepts');
    expect(dirNames).toContain('entities');
    expect(dirNames).toContain('syntheses');
  });

  test('explorer items include article files with types', () => {
    const flat = flattenExplorerItems(explorerItems);
    const files = flat.filter((i) => !i.isDir);
    expect(files.length).toBe(STUDIO_FIXTURE_META.totalArticles);

    // Check article types are set
    const types = files.map((f) => f.articleType);
    expect(types).toContain('concept');
    expect(types).toContain('entity');
    expect(types).toContain('synthesis');
  });

  test('moveSelectionDown navigates through items', () => {
    const state: ExplorerState = {
      items: explorerItems,
      selectedIndex: 0,
      scrollOffset: 0,
    };

    const next = moveSelectionDown(state);
    expect(next.selectedIndex).toBe(1);

    const next2 = moveSelectionDown(next);
    expect(next2.selectedIndex).toBe(2);
  });

  test('moveSelectionUp navigates upward', () => {
    const state: ExplorerState = {
      items: explorerItems,
      selectedIndex: 3,
      scrollOffset: 0,
    };

    const prev = moveSelectionUp(state);
    expect(prev.selectedIndex).toBe(2);
  });

  test('moveSelectionUp clamps at 0', () => {
    const state: ExplorerState = {
      items: explorerItems,
      selectedIndex: 0,
      scrollOffset: 0,
    };

    const prev = moveSelectionUp(state);
    expect(prev.selectedIndex).toBe(0);
  });

  test('toggleExpand collapses a directory', () => {
    // First item should be a directory
    const state: ExplorerState = {
      items: explorerItems,
      selectedIndex: 0,
      scrollOffset: 0,
    };

    const selected = getSelectedItem(state);
    expect(selected?.isDir).toBe(true);
    expect(selected?.expanded).toBe(true);

    const collapsed = toggleExpand(state);
    const collapsedSelected = getSelectedItem(collapsed);
    expect(collapsedSelected?.expanded).toBe(false);

    // Flat list should be shorter now
    const flatBefore = getVisibleItems(state);
    const flatAfter = getVisibleItems(collapsed);
    expect(flatAfter.length).toBeLessThan(flatBefore.length);
  });

  test('selectByPath finds and selects a file item', () => {
    const flat = flattenExplorerItems(explorerItems);
    const firstFile = flat.find((i) => !i.isDir);
    expect(firstFile).toBeTruthy();

    const state: ExplorerState = {
      items: explorerItems,
      selectedIndex: 0,
      scrollOffset: 0,
    };

    const selected = selectByPath(state, firstFile!.path);
    const item = getSelectedItem(selected);
    expect(item?.path).toBe(firstFile!.path);
  });

  // ===========================================================================
  // Document loading tests
  // ===========================================================================

  test('loadDocument reads and renders markdown', async () => {
    const articlePath = join(wikiPath, 'concepts', 'attention-mechanism.md');
    const doc = await loadDocument(articlePath);

    expect(doc.path).toBe(articlePath);
    expect(doc.title).toBeTruthy();
    expect(doc.content).toContain('---');
    expect(doc.renderedContent.length).toBeGreaterThan(0);
    expect(doc.scrollY).toBe(0);
    expect(doc.focusedLinkIndex).toBe(-1);
  });

  test('loadDocument extracts wikilinks', async () => {
    const articlePath = join(wikiPath, 'concepts', 'attention-mechanism.md');
    const doc = await loadDocument(articlePath);

    expect(doc.links.length).toBeGreaterThan(0);
    // Check that expected wikilinks are found
    const targets = doc.links.map((l) => l.target);
    expect(targets).toContain('Transformer Architecture');
  });

  // ===========================================================================
  // Editor state tests
  // ===========================================================================

  test('openDocument creates editor state with document', async () => {
    const emptyEditor: EditorState = {
      document: null,
      history: [],
      historyIndex: -1,
    };

    const articlePath = join(wikiPath, 'concepts', 'attention-mechanism.md');
    const editor = await openDocument(emptyEditor, articlePath);

    expect(editor.document).toBeTruthy();
    expect(editor.document!.path).toBe(articlePath);
    expect(editor.history.length).toBe(0); // no previous doc
  });

  test('openDocument pushes previous doc to history', async () => {
    const emptyEditor: EditorState = {
      document: null,
      history: [],
      historyIndex: -1,
    };

    const path1 = join(wikiPath, 'concepts', 'attention-mechanism.md');
    const path2 = join(wikiPath, 'entities', 'transformer.md');

    const editor1 = await openDocument(emptyEditor, path1);
    const editor2 = await openDocument(editor1, path2);

    expect(editor2.document!.path).toBe(path2);
    expect(editor2.history.length).toBe(1);
    expect(editor2.history[0].path).toBe(path1);
  });

  test('navigateBack restores previous document', async () => {
    const emptyEditor: EditorState = {
      document: null,
      history: [],
      historyIndex: -1,
    };

    const path1 = join(wikiPath, 'concepts', 'attention-mechanism.md');
    const path2 = join(wikiPath, 'entities', 'transformer.md');

    const editor1 = await openDocument(emptyEditor, path1);
    const editor2 = await openDocument(editor1, path2);

    const editorBack = await navigateBack(editor2);
    expect(editorBack.document!.path).toBe(path1);
  });

  // ===========================================================================
  // Scrolling tests
  // ===========================================================================

  test('scrollDocument moves scroll position', async () => {
    const articlePath = join(wikiPath, 'concepts', 'attention-mechanism.md');
    const doc = await loadDocument(articlePath);

    const scrolled = scrollDocument(doc, 5, 20);
    expect(scrolled.scrollY).toBe(5);
  });

  test('scrollDocument clamps to bounds', async () => {
    const articlePath = join(wikiPath, 'concepts', 'attention-mechanism.md');
    const doc = await loadDocument(articlePath);

    const scrolledUp = scrollDocument(doc, -10, 20);
    expect(scrolledUp.scrollY).toBe(0);
  });

  // ===========================================================================
  // Link navigation tests
  // ===========================================================================

  test('focusNextLink cycles through links', async () => {
    const articlePath = join(wikiPath, 'concepts', 'attention-mechanism.md');
    const doc = await loadDocument(articlePath);

    expect(doc.links.length).toBeGreaterThan(0);

    const doc1 = focusNextLink(doc);
    expect(doc1.focusedLinkIndex).toBe(0);

    const doc2 = focusNextLink(doc1);
    expect(doc2.focusedLinkIndex).toBe(1);
  });

  test('focusPrevLink wraps to last link', async () => {
    const articlePath = join(wikiPath, 'concepts', 'attention-mechanism.md');
    const doc = await loadDocument(articlePath);

    const docPrev = focusPrevLink(doc);
    expect(docPrev.focusedLinkIndex).toBe(doc.links.length - 1);
  });

  test('getFocusedLink returns link when focused', async () => {
    const articlePath = join(wikiPath, 'concepts', 'attention-mechanism.md');
    const doc = await loadDocument(articlePath);

    const focused = focusNextLink(doc);
    const link = getFocusedLink(focused);
    expect(link).toBeTruthy();
    expect(link!.target).toBeTruthy();
  });

  test('resolveLink finds file by name in wiki', () => {
    const resolved = resolveLink('Attention Mechanism', wikiPath);
    expect(resolved).toBeTruthy();
    expect(resolved).toContain('attention-mechanism.md');
  });

  test('resolveLink returns null for unknown target', () => {
    const resolved = resolveLink('Nonexistent Article', wikiPath);
    expect(resolved).toBeNull();
  });

  // ===========================================================================
  // Workspace snapshot tests
  // ===========================================================================

  test('loadWorkspaceSnapshot returns correct counts', async () => {
    const paths = getWikiPaths(wikiDir);
    const snapshot = await loadWorkspaceSnapshot(wikiDir, paths);

    expect(snapshot.name).toBe('studio-wiki');
    expect(snapshot.sourceCount).toBe(STUDIO_FIXTURE_META.sourceCount);
    expect(snapshot.articleCount).toBe(STUDIO_FIXTURE_META.totalArticles);
    expect(snapshot.queryCount).toBe(STUDIO_FIXTURE_META.queryCount);
  });

  test('collectArticlePaths returns all wiki articles', async () => {
    const paths = await collectArticlePaths(wikiPath);
    expect(paths.length).toBe(STUDIO_FIXTURE_META.totalArticles);
  });
});
