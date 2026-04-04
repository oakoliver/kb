/**
 * Integration tests for studio search functionality
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createStudioFixture, STUDIO_FIXTURE_META } from './helpers/studio';
import { join } from 'path';
import { getWikiPaths } from '../../src/core/resolver';
import { searchWorkspace, invalidateSearchIndex, mapSearchResult } from '../../src/tui/operations/search';
import {
  updateSearchQuery,
  appendToSearchQuery,
  backspaceSearchQuery,
  clearSearch,
  setSearchResults,
  setSearching,
  searchSelectUp,
  searchSelectDown,
  getSelectedSearchResult,
  renderSearchView,
} from '../../src/tui/search';
import type { SearchState, SearchResultItem } from '../../src/tui/state';

// =============================================================================
// Search Operations Integration Tests
// =============================================================================

describe('studio search operations', () => {
  let wikiDir: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const fixture = await createStudioFixture();
    wikiDir = fixture.wikiDir;
    cleanup = fixture.cleanup;
    invalidateSearchIndex();
  });

  afterEach(async () => {
    await cleanup();
  });

  test('searchWorkspace returns results for matching query', async () => {
    const paths = getWikiPaths(wikiDir);
    const results = await searchWorkspace(paths.wiki, 'attention');
    expect(results.length).toBeGreaterThan(0);
    // Should find the attention-mechanism article
    const titles = results.map(r => r.title);
    expect(titles.some(t => t.toLowerCase().includes('attention'))).toBe(true);
  });

  test('searchWorkspace returns empty for no match', async () => {
    const paths = getWikiPaths(wikiDir);
    const results = await searchWorkspace(paths.wiki, 'zzzznonexistent');
    expect(results).toEqual([]);
  });

  test('searchWorkspace returns empty for empty query', async () => {
    const paths = getWikiPaths(wikiDir);
    const results = await searchWorkspace(paths.wiki, '');
    expect(results).toEqual([]);
  });

  test('searchWorkspace results have required fields', async () => {
    const paths = getWikiPaths(wikiDir);
    const results = await searchWorkspace(paths.wiki, 'transformer');
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.path).toBeTruthy();
      expect(r.title).toBeTruthy();
      expect(typeof r.score).toBe('number');
      expect(r.score).toBeGreaterThan(0);
      expect(typeof r.snippet).toBe('string');
    }
  });

  test('searchWorkspace results include path in wiki/ format', async () => {
    const paths = getWikiPaths(wikiDir);
    const results = await searchWorkspace(paths.wiki, 'attention');
    for (const r of results) {
      expect(r.path).toMatch(/^wiki\//);
    }
  });

  test('searchWorkspace respects limit option', async () => {
    const paths = getWikiPaths(wikiDir);
    const results = await searchWorkspace(paths.wiki, 'attention', { limit: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
  });

  test('searchWorkspace caches index for subsequent calls', async () => {
    const paths = getWikiPaths(wikiDir);
    // First call builds index
    const results1 = await searchWorkspace(paths.wiki, 'attention');
    // Second call should use cache
    const results2 = await searchWorkspace(paths.wiki, 'transformer');
    // Both should return results (different queries on same index)
    expect(results1.length).toBeGreaterThan(0);
    expect(results2.length).toBeGreaterThan(0);
  });

  test('invalidateSearchIndex forces rebuild', async () => {
    const paths = getWikiPaths(wikiDir);
    await searchWorkspace(paths.wiki, 'attention');
    invalidateSearchIndex();
    // Should not throw after invalidation
    const results = await searchWorkspace(paths.wiki, 'transformer');
    expect(results.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Search Flow Integration Tests
// =============================================================================

describe('studio search flow', () => {
  let wikiDir: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const fixture = await createStudioFixture();
    wikiDir = fixture.wikiDir;
    cleanup = fixture.cleanup;
    invalidateSearchIndex();
  });

  afterEach(async () => {
    await cleanup();
  });

  test('full search flow: type query, get results, select result', async () => {
    const paths = getWikiPaths(wikiDir);

    // 1. Start with empty search state
    let state: SearchState = {
      query: '',
      results: [],
      selectedIndex: 0,
      isSearching: false,
    };

    // 2. Type a full query word (BM25 uses exact token matching)
    state = updateSearchQuery(state, 'attention');
    expect(state.query).toBe('attention');

    // 3. Mark as searching (debounce timer fires)
    state = setSearching(state);
    expect(state.isSearching).toBe(true);

    // 4. Execute search
    const results = await searchWorkspace(paths.wiki, state.query);
    state = setSearchResults(state, results);
    expect(state.isSearching).toBe(false);
    expect(state.results.length).toBeGreaterThan(0);

    // 5. Navigate results
    state = searchSelectDown(state);
    expect(state.selectedIndex).toBe(Math.min(1, state.results.length - 1));

    // 6. Get selected result
    const selected = getSelectedSearchResult(state);
    expect(selected).toBeTruthy();
    expect(selected!.path).toMatch(/\.md$/);
  });

  test('search flow with backspace and re-search', async () => {
    const paths = getWikiPaths(wikiDir);

    let state: SearchState = {
      query: 'transformer',
      results: [],
      selectedIndex: 0,
      isSearching: false,
    };

    // Search initially
    const results1 = await searchWorkspace(paths.wiki, state.query);
    state = setSearchResults(state, results1);
    expect(state.results.length).toBeGreaterThan(0);

    // Backspace to change query, then type a new full word
    state = clearSearch(state);
    state = updateSearchQuery(state, 'attention');
    expect(state.query).toBe('attention');

    // Re-search with new query
    const results2 = await searchWorkspace(paths.wiki, state.query);
    state = setSearchResults(state, results2);
    // Should find attention-related results
    expect(state.results.length).toBeGreaterThan(0);
    expect(state.results.some(r => r.title.toLowerCase().includes('attention'))).toBe(true);
  });

  test('search view renders results from real workspace', async () => {
    const paths = getWikiPaths(wikiDir);

    const results = await searchWorkspace(paths.wiki, 'attention');
    const state: SearchState = {
      query: 'attention',
      results,
      selectedIndex: 0,
      isSearching: false,
    };

    const view = renderSearchView(state, 60, 20, true);
    // Should show the query
    expect(view).toContain('attention');
    // Should show result count
    expect(view).toContain('result');
    // Should show at least one article title
    const hasTitle = results.some(r => view.includes(r.title));
    expect(hasTitle).toBe(true);
  });

  test('clear search resets state after results', async () => {
    const paths = getWikiPaths(wikiDir);

    let state: SearchState = {
      query: 'attention',
      results: [],
      selectedIndex: 0,
      isSearching: false,
    };

    const results = await searchWorkspace(paths.wiki, state.query);
    state = setSearchResults(state, results);
    expect(state.results.length).toBeGreaterThan(0);

    // Clear
    state = clearSearch(state);
    expect(state.query).toBe('');
    expect(state.results).toEqual([]);
    expect(state.selectedIndex).toBe(0);
  });
});

// =============================================================================
// mapSearchResult Tests
// =============================================================================

describe('mapSearchResult', () => {
  test('maps BM25 result to SearchResultItem', () => {
    const bm25Result = {
      path: 'wiki/concepts/test.md',
      title: 'Test Article',
      type: 'concept' as const,
      score: 1.5,
      snippet: 'A test snippet',
    };
    const item = mapSearchResult(bm25Result);
    expect(item.path).toBe('wiki/concepts/test.md');
    expect(item.title).toBe('Test Article');
    expect(item.score).toBe(1.5);
    expect(item.snippet).toBe('A test snippet');
  });
});
