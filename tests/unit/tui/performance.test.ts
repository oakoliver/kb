/**
 * Performance-focused unit tests for large explorer trees, search result lists,
 * layout calculations, and rendering pipelines.
 * @module tests/unit/tui/performance
 */

import { describe, test, expect } from 'bun:test';
import type { ExplorerItem, ExplorerState, SearchState, SearchResultItem, ProblemItem, BottomPanelState } from '../../../src/tui/state';
import { flattenExplorerItems } from '../../../src/tui/operations/workspace';
import {
  renderExplorer,
  getVisibleItems,
  moveSelectionDown,
  moveSelectionUp,
  getSelectedItem,
} from '../../../src/tui/explorer';
import {
  renderSearchView,
  searchSelectDown,
  searchSelectUp,
  setSearchResults,
  getSelectedSearchResult,
} from '../../../src/tui/search';
import { calculateLayout } from '../../../src/tui/layout';
import { renderStatusBar, renderHelpBar, getContextualHelp } from '../../../src/tui/chrome';
import { renderProblemsPanel } from '../../../src/tui/panels/problems';
import { filterPaletteItems, commandsToPaletteItems } from '../../../src/tui/commands';

// Wall-clock budgets are for a developer machine; shared CI runners are slower
// and noisier, so they get 4x the budget there (GitHub Actions sets CI).
const SLACK = process.env.CI ? 4 : 1;

// =============================================================================
// Helpers: Generate large synthetic data sets
// =============================================================================

function createLargeExplorerTree(dirCount: number, filesPerDir: number): ExplorerItem[] {
  const items: ExplorerItem[] = [];
  for (let d = 0; d < dirCount; d++) {
    const dirPath = `/wiki/dir-${d}`;
    const children: ExplorerItem[] = [];
    for (let f = 0; f < filesPerDir; f++) {
      children.push({
        name: `article-${d}-${f}`,
        path: `${dirPath}/article-${d}-${f}.md`,
        isDir: false,
        depth: 1,
        articleType: 'concept',
      });
    }
    items.push({
      name: `dir-${d}`,
      path: dirPath,
      isDir: true,
      depth: 0,
      expanded: true,
      children,
    });
  }
  return items;
}

function createLargeSearchResults(count: number): SearchResultItem[] {
  const results: SearchResultItem[] = [];
  for (let i = 0; i < count; i++) {
    results.push({
      path: `/wiki/concepts/article-${i}.md`,
      title: `Article ${i}: A Deep Dive into Topic ${i}`,
      score: Math.max(0.01, 1 - i * 0.005),
      snippet: `This article covers topic ${i} in great detail with various subsections and references.`,
    });
  }
  return results;
}

function createLargeProblemsSet(count: number): ProblemItem[] {
  const problems: ProblemItem[] = [];
  for (let i = 0; i < count; i++) {
    problems.push({
      path: `wiki/concepts/article-${i}.md`,
      line: i + 1,
      message: `Problem ${i}: broken link to [[NonExistent-${i}]]`,
      severity: i % 3 === 0 ? 'error' : i % 3 === 1 ? 'warning' : 'info',
    });
  }
  return problems;
}

// =============================================================================
// Explorer Performance
// =============================================================================

describe('Explorer tree performance', () => {
  const LARGE_TREE = createLargeExplorerTree(50, 100); // 50 dirs x 100 files = 5000+ items

  test('flattenExplorerItems handles 5000+ items under 50ms', () => {
    const start = performance.now();
    const flat = flattenExplorerItems(LARGE_TREE);
    const elapsed = performance.now() - start;

    expect(flat.length).toBe(50 + 50 * 100); // 50 dirs + 5000 files
    expect(elapsed).toBeLessThan(50 * SLACK);
  });

  test('getVisibleItems on large tree is fast', () => {
    const state: ExplorerState = {
      items: LARGE_TREE,
      selectedIndex: 0,
      scrollOffset: 0,
    };

    const start = performance.now();
    const visible = getVisibleItems(state);
    const elapsed = performance.now() - start;

    expect(visible.length).toBe(5050);
    expect(elapsed).toBeLessThan(50 * SLACK);
  });

  test('renderExplorer with large tree completes under 100ms', () => {
    const state: ExplorerState = {
      items: LARGE_TREE,
      selectedIndex: 2500,
      scrollOffset: 2490,
    };

    const start = performance.now();
    const rendered = renderExplorer(state, 40, 30, true);
    const elapsed = performance.now() - start;

    expect(rendered.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(100 * SLACK);
  });

  test('rapid selection navigation through large tree under 100ms for 100 moves', () => {
    let state: ExplorerState = {
      items: LARGE_TREE,
      selectedIndex: 0,
      scrollOffset: 0,
    };

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      state = moveSelectionDown(state);
    }
    const elapsed = performance.now() - start;

    expect(state.selectedIndex).toBe(100);
    expect(elapsed).toBeLessThan(100 * SLACK);
  });

  test('moveSelectionUp from middle of large tree is fast', () => {
    let state: ExplorerState = {
      items: LARGE_TREE,
      selectedIndex: 2500,
      scrollOffset: 2490,
    };

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      state = moveSelectionUp(state);
    }
    const elapsed = performance.now() - start;

    expect(state.selectedIndex).toBe(2400);
    expect(elapsed).toBeLessThan(100 * SLACK);
  });

  test('getSelectedItem on large tree under 10ms', () => {
    const state: ExplorerState = {
      items: LARGE_TREE,
      selectedIndex: 4000,
      scrollOffset: 3990,
    };

    const start = performance.now();
    const item = getSelectedItem(state);
    const elapsed = performance.now() - start;

    expect(item).not.toBeNull();
    expect(elapsed).toBeLessThan(10 * SLACK);
  });

  test('collapsed dirs in large tree reduce visible items correctly', () => {
    const collapsedTree = LARGE_TREE.map((item) => ({
      ...item,
      expanded: false,
    }));
    const flat = flattenExplorerItems(collapsedTree);

    // Only directory headers visible
    expect(flat.length).toBe(50);
  });
});

// =============================================================================
// Search Results Performance
// =============================================================================

describe('Search results performance', () => {
  const LARGE_RESULTS = createLargeSearchResults(500);

  test('setSearchResults with 500 items is fast', () => {
    const state: SearchState = {
      query: 'test query',
      results: [],
      selectedIndex: 0,
      isSearching: true,
    };

    const start = performance.now();
    const updated = setSearchResults(state, LARGE_RESULTS);
    const elapsed = performance.now() - start;

    expect(updated.results.length).toBe(500);
    expect(updated.isSearching).toBe(false);
    expect(elapsed).toBeLessThan(10 * SLACK);
  });

  test('renderSearchView with 500 results under 50ms', () => {
    const state: SearchState = {
      query: 'test query',
      results: LARGE_RESULTS,
      selectedIndex: 250,
      isSearching: false,
    };

    const start = performance.now();
    const rendered = renderSearchView(state, 40, 30, true);
    const elapsed = performance.now() - start;

    expect(rendered.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(50 * SLACK);
  });

  test('rapid navigation through 500 results under 50ms', () => {
    let state: SearchState = {
      query: 'test query',
      results: LARGE_RESULTS,
      selectedIndex: 0,
      isSearching: false,
    };

    const start = performance.now();
    for (let i = 0; i < 200; i++) {
      state = searchSelectDown(state);
    }
    const elapsed = performance.now() - start;

    expect(state.selectedIndex).toBe(200);
    expect(elapsed).toBeLessThan(50 * SLACK);
  });

  test('searchSelectUp from end of 500 results is fast', () => {
    let state: SearchState = {
      query: 'test query',
      results: LARGE_RESULTS,
      selectedIndex: 499,
      isSearching: false,
    };

    const start = performance.now();
    for (let i = 0; i < 200; i++) {
      state = searchSelectUp(state);
    }
    const elapsed = performance.now() - start;

    expect(state.selectedIndex).toBe(299);
    expect(elapsed).toBeLessThan(50 * SLACK);
  });

  test('getSelectedSearchResult at various indices is fast', () => {
    const state: SearchState = {
      query: 'test query',
      results: LARGE_RESULTS,
      selectedIndex: 499,
      isSearching: false,
    };

    const start = performance.now();
    for (let i = 0; i < 500; i++) {
      getSelectedSearchResult({ ...state, selectedIndex: i });
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50 * SLACK);
  });
});

// =============================================================================
// Layout Calculation Performance
// =============================================================================

describe('Layout calculation performance', () => {
  test('calculateLayout 1000 times under 50ms', () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      calculateLayout(
        120 + (i % 80),
        40 + (i % 20),
        i % 2 === 0,
        i % 3 === 0,
      );
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50 * SLACK);
  });

  test('layout consistency across repeated calls', () => {
    const first = calculateLayout(120, 40, true, true);
    const second = calculateLayout(120, 40, true, true);

    expect(first).toEqual(second);
  });
});

// =============================================================================
// Problems Panel Performance
// =============================================================================

describe('Problems panel performance', () => {
  const LARGE_PROBLEMS = createLargeProblemsSet(300);

  test('renderProblemsPanel with 300 problems under 50ms', () => {
    const start = performance.now();
    const rendered = renderProblemsPanel(LARGE_PROBLEMS, 80, 20, 150);
    const elapsed = performance.now() - start;

    expect(rendered.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(50 * SLACK);
  });

  test('problems panel correctly limits visible items for large sets', () => {
    const rendered = renderProblemsPanel(LARGE_PROBLEMS, 80, 15, 0);
    // With height=15, we get summary + blank + 13 items = 15 lines
    const lines = rendered.split('\n');
    expect(lines.length).toBe(15);
    // Should contain the first problem
    expect(rendered).toContain('Problem 0');
    // Should NOT contain items beyond the visible limit
    expect(rendered).not.toContain('Problem 14');
  });
});

// =============================================================================
// Chrome (Status Bar + Help Bar) Performance
// =============================================================================

describe('Chrome rendering performance', () => {
  test('renderStatusBar 1000 times under 500ms', () => {
    const status = {
      workspaceName: 'my-wiki',
      branch: 'main',
      articleCount: 150,
      sourceCount: 42,
      activeOperation: 'Compiling...',
      provider: 'anthropic',
      errorCount: 12,
      warningCount: 35,
    };

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      renderStatusBar(status, 120);
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(500 * SLACK);
  });

  test('renderHelpBar 1000 times under 500ms', () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      renderHelpBar('editor', 'none', 'explorer', true, 120);
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(500 * SLACK);
  });

  test('getContextualHelp for all pane types is fast', () => {
    const panes = ['explorer', 'editor', 'search', 'ingest', 'bottomPanel'] as const;

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      for (const pane of panes) {
        getContextualHelp(pane, 'none', 'explorer', true);
      }
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50 * SLACK);
  });
});

// =============================================================================
// Command Palette Filtering Performance
// =============================================================================

describe('Command palette filtering performance', () => {
  test('filter palette items 1000 times under 20ms', () => {
    const items = commandsToPaletteItems();

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      filterPaletteItems(items, 'comp');
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(20 * SLACK);
  });

  test('filter with empty query returns all items', () => {
    const items = commandsToPaletteItems();
    const filtered = filterPaletteItems(items, '');
    expect(filtered.length).toBe(items.length);
  });

  test('filter with non-matching query returns empty', () => {
    const items = commandsToPaletteItems();
    const filtered = filterPaletteItems(items, 'zzzznonexistent');
    expect(filtered.length).toBe(0);
  });
});

// =============================================================================
// Memory / Object Churn Tests
// =============================================================================

describe('State immutability and object allocation', () => {
  test('explorer navigation does not mutate original state', () => {
    const original: ExplorerState = {
      items: createLargeExplorerTree(5, 20),
      selectedIndex: 0,
      scrollOffset: 0,
    };
    const frozen = JSON.parse(JSON.stringify(original));

    const down = moveSelectionDown(original);
    const up = moveSelectionUp(down);

    // Original unchanged
    expect(original.selectedIndex).toBe(frozen.selectedIndex);
    expect(original.scrollOffset).toBe(frozen.scrollOffset);
  });

  test('search navigation does not mutate original state', () => {
    const results = createLargeSearchResults(50);
    const original: SearchState = {
      query: 'test',
      results,
      selectedIndex: 25,
      isSearching: false,
    };
    const origIdx = original.selectedIndex;

    searchSelectDown(original);
    searchSelectUp(original);

    expect(original.selectedIndex).toBe(origIdx);
  });

  test('setSearchResults does not mutate original search state', () => {
    const original: SearchState = {
      query: 'test',
      results: [],
      selectedIndex: 5,
      isSearching: true,
    };
    const origSearching = original.isSearching;
    const origResults = original.results;

    const updated = setSearchResults(original, createLargeSearchResults(100));

    expect(original.isSearching).toBe(origSearching);
    expect(original.results).toBe(origResults);
    expect(original.results.length).toBe(0);
    expect(updated.results.length).toBe(100);
  });
});
