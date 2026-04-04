/**
 * Unit tests for search view state management and rendering
 */

import { describe, test, expect } from 'bun:test';
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
} from '../../../src/tui/search';
import type { SearchState, SearchResultItem } from '../../../src/tui/state';

// =============================================================================
// Helpers
// =============================================================================

function makeSearchState(overrides: Partial<SearchState> = {}): SearchState {
  return {
    query: '',
    results: [],
    selectedIndex: 0,
    isSearching: false,
    ...overrides,
  };
}

function makeResults(count: number): SearchResultItem[] {
  return Array.from({ length: count }, (_, i) => ({
    path: `wiki/concepts/article-${i}.md`,
    title: `Article ${i}`,
    score: 1.5 - i * 0.1,
    snippet: `This is a snippet for article ${i} about testing.`,
  }));
}

// =============================================================================
// Query Management Tests
// =============================================================================

describe('search query management', () => {
  test('updateSearchQuery sets query and resets selection', () => {
    const state = makeSearchState({ selectedIndex: 3, query: 'old' });
    const result = updateSearchQuery(state, 'new query');
    expect(result.query).toBe('new query');
    expect(result.selectedIndex).toBe(0);
  });

  test('appendToSearchQuery appends character', () => {
    const state = makeSearchState({ query: 'hel' });
    const result = appendToSearchQuery(state, 'l');
    expect(result.query).toBe('hell');
  });

  test('backspaceSearchQuery removes last character', () => {
    const state = makeSearchState({ query: 'hello' });
    const result = backspaceSearchQuery(state);
    expect(result.query).toBe('hell');
  });

  test('backspaceSearchQuery on empty query does nothing', () => {
    const state = makeSearchState({ query: '' });
    const result = backspaceSearchQuery(state);
    expect(result.query).toBe('');
  });

  test('clearSearch resets everything', () => {
    const state = makeSearchState({
      query: 'test',
      results: makeResults(3),
      selectedIndex: 2,
      isSearching: true,
    });
    const result = clearSearch(state);
    expect(result.query).toBe('');
    expect(result.results).toEqual([]);
    expect(result.selectedIndex).toBe(0);
    expect(result.isSearching).toBe(false);
  });
});

// =============================================================================
// Results Management Tests
// =============================================================================

describe('search results management', () => {
  test('setSearchResults updates results and resets selection', () => {
    const state = makeSearchState({ query: 'test', selectedIndex: 5 });
    const results = makeResults(3);
    const updated = setSearchResults(state, results);
    expect(updated.results).toHaveLength(3);
    expect(updated.selectedIndex).toBe(0);
    expect(updated.isSearching).toBe(false);
  });

  test('setSearching marks state as searching', () => {
    const state = makeSearchState();
    const updated = setSearching(state);
    expect(updated.isSearching).toBe(true);
  });
});

// =============================================================================
// Selection Navigation Tests
// =============================================================================

describe('search selection navigation', () => {
  test('searchSelectDown moves selection down', () => {
    const state = makeSearchState({ results: makeResults(5), selectedIndex: 0 });
    const result = searchSelectDown(state);
    expect(result.selectedIndex).toBe(1);
  });

  test('searchSelectDown clamps at bottom', () => {
    const state = makeSearchState({ results: makeResults(3), selectedIndex: 2 });
    const result = searchSelectDown(state);
    expect(result.selectedIndex).toBe(2);
  });

  test('searchSelectUp moves selection up', () => {
    const state = makeSearchState({ results: makeResults(5), selectedIndex: 3 });
    const result = searchSelectUp(state);
    expect(result.selectedIndex).toBe(2);
  });

  test('searchSelectUp clamps at top', () => {
    const state = makeSearchState({ results: makeResults(3), selectedIndex: 0 });
    const result = searchSelectUp(state);
    expect(result.selectedIndex).toBe(0);
  });

  test('searchSelectDown with empty results does nothing', () => {
    const state = makeSearchState({ results: [] });
    const result = searchSelectDown(state);
    expect(result.selectedIndex).toBe(0);
  });

  test('searchSelectUp with empty results does nothing', () => {
    const state = makeSearchState({ results: [] });
    const result = searchSelectUp(state);
    expect(result.selectedIndex).toBe(0);
  });
});

// =============================================================================
// getSelectedSearchResult Tests
// =============================================================================

describe('getSelectedSearchResult', () => {
  test('returns selected item', () => {
    const results = makeResults(3);
    const state = makeSearchState({ results, selectedIndex: 1 });
    const selected = getSelectedSearchResult(state);
    expect(selected).toBeTruthy();
    expect(selected!.title).toBe('Article 1');
  });

  test('returns null for empty results', () => {
    const state = makeSearchState({ results: [] });
    const selected = getSelectedSearchResult(state);
    expect(selected).toBeNull();
  });

  test('returns null for out-of-bounds index', () => {
    const state = makeSearchState({ results: makeResults(2), selectedIndex: 5 });
    const selected = getSelectedSearchResult(state);
    expect(selected).toBeNull();
  });
});

// =============================================================================
// Rendering Tests
// =============================================================================

describe('renderSearchView', () => {
  test('renders empty state with placeholder', () => {
    const state = makeSearchState();
    const result = renderSearchView(state, 40, 10, true);
    expect(result).toContain('Type to search');
  });

  test('renders query text', () => {
    const state = makeSearchState({ query: 'attention' });
    const result = renderSearchView(state, 40, 10, true);
    expect(result).toContain('attention');
  });

  test('renders no results message', () => {
    const state = makeSearchState({ query: 'xyz', results: [] });
    const result = renderSearchView(state, 40, 10, true);
    expect(result).toContain('No results');
  });

  test('renders searching indicator', () => {
    const state = makeSearchState({ query: 'test', isSearching: true });
    const result = renderSearchView(state, 40, 10, true);
    expect(result).toContain('Searching');
  });

  test('renders results with titles', () => {
    const state = makeSearchState({
      query: 'test',
      results: makeResults(3),
    });
    const result = renderSearchView(state, 60, 20, true);
    expect(result).toContain('Article 0');
    expect(result).toContain('Article 1');
  });

  test('renders result count', () => {
    const state = makeSearchState({
      query: 'test',
      results: makeResults(5),
    });
    const result = renderSearchView(state, 40, 20, true);
    expect(result).toContain('5 results');
  });

  test('renders single result count without plural', () => {
    const state = makeSearchState({
      query: 'test',
      results: makeResults(1),
    });
    const result = renderSearchView(state, 40, 20, true);
    expect(result).toContain('1 result');
    expect(result).not.toContain('1 results');
  });

  test('renders results with snippets', () => {
    const state = makeSearchState({
      query: 'test',
      results: makeResults(2),
    });
    const result = renderSearchView(state, 80, 20, true);
    expect(result).toContain('snippet');
  });

  test('renders results with scores', () => {
    const state = makeSearchState({
      query: 'test',
      results: makeResults(1),
    });
    const result = renderSearchView(state, 60, 20, true);
    expect(result).toContain('1.50');
  });

  test('handles zero width gracefully', () => {
    const state = makeSearchState({ query: 'test', results: makeResults(2) });
    // Should not throw
    const result = renderSearchView(state, 0, 5, true);
    expect(typeof result).toBe('string');
  });
});
