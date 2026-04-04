/**
 * Search sidebar view: input, results list, rendering
 * @module tui/search
 */

import { newStyle, joinVertical, Left } from '@oakoliver/lipgloss';
import type { SearchState, SearchResultItem } from './state';
import { theme, colors, icons } from './theme';

// =============================================================================
// Search State Management
// =============================================================================

/**
 * Update search query text
 */
export function updateSearchQuery(state: SearchState, query: string): SearchState {
  return {
    ...state,
    query,
    selectedIndex: 0,
  };
}

/**
 * Append a character to the search query
 */
export function appendToSearchQuery(state: SearchState, char: string): SearchState {
  return updateSearchQuery(state, state.query + char);
}

/**
 * Delete the last character from the search query
 */
export function backspaceSearchQuery(state: SearchState): SearchState {
  if (state.query.length === 0) return state;
  return updateSearchQuery(state, state.query.slice(0, -1));
}

/**
 * Clear the search query and results
 */
export function clearSearch(state: SearchState): SearchState {
  return {
    query: '',
    results: [],
    selectedIndex: 0,
    isSearching: false,
  };
}

/**
 * Set search results from a completed search
 */
export function setSearchResults(state: SearchState, results: SearchResultItem[]): SearchState {
  return {
    ...state,
    results,
    selectedIndex: 0,
    isSearching: false,
  };
}

/**
 * Mark search as in progress
 */
export function setSearching(state: SearchState): SearchState {
  return {
    ...state,
    isSearching: true,
  };
}

/**
 * Move selection up in results
 */
export function searchSelectUp(state: SearchState): SearchState {
  if (state.results.length === 0) return state;
  const newIndex = Math.max(0, state.selectedIndex - 1);
  return { ...state, selectedIndex: newIndex };
}

/**
 * Move selection down in results
 */
export function searchSelectDown(state: SearchState): SearchState {
  if (state.results.length === 0) return state;
  const newIndex = Math.min(state.results.length - 1, state.selectedIndex + 1);
  return { ...state, selectedIndex: newIndex };
}

/**
 * Get the currently selected result item
 */
export function getSelectedSearchResult(state: SearchState): SearchResultItem | null {
  if (state.results.length === 0) return null;
  return state.results[state.selectedIndex] ?? null;
}

// =============================================================================
// Rendering
// =============================================================================

/**
 * Render the search sidebar view
 */
export function renderSearchView(
  state: SearchState,
  width: number,
  height: number,
  isFocused: boolean,
): string {
  const lines: string[] = [];
  const maxWidth = Math.max(1, width);

  // Search input line
  const cursor = isFocused ? '|' : '';
  const queryDisplay = state.query || '';
  const inputPrefix = theme.info.render(`${icons.search} `);
  const inputText = queryDisplay
    ? theme.title.render(queryDisplay) + (isFocused ? theme.muted.render(cursor) : '')
    : theme.muted.render('Type to search...');
  lines.push(` ${inputPrefix}${inputText}`);

  // Separator
  lines.push(theme.muted.render('─'.repeat(Math.min(maxWidth, 40))));

  // Status line
  if (state.isSearching) {
    lines.push(theme.muted.render(`  ${icons.spinner} Searching...`));
  } else if (state.query && state.results.length === 0) {
    lines.push(theme.muted.render('  No results found'));
  } else if (state.results.length > 0) {
    lines.push(theme.muted.render(`  ${state.results.length} result${state.results.length !== 1 ? 's' : ''}`));
  } else {
    lines.push('');
  }

  // Results list
  const availableHeight = Math.max(0, height - lines.length);
  const resultLines = renderResultsList(state, maxWidth, availableHeight, isFocused);
  lines.push(...resultLines);

  // Pad to fill height
  while (lines.length < height) {
    lines.push('');
  }

  return lines.slice(0, height).join('\n');
}

/**
 * Render the results list with selection highlighting
 */
function renderResultsList(
  state: SearchState,
  width: number,
  maxItems: number,
  isFocused: boolean,
): string[] {
  if (state.results.length === 0) return [];

  const lines: string[] = [];
  // Each result takes 3 lines: title+score, snippet, blank
  const itemsPerResult = 3;
  const maxResults = Math.max(1, Math.floor(maxItems / itemsPerResult));

  // Scroll window: keep selected item visible
  let startIdx = 0;
  if (state.selectedIndex >= maxResults) {
    startIdx = state.selectedIndex - maxResults + 1;
  }

  const visibleResults = state.results.slice(startIdx, startIdx + maxResults);

  for (let i = 0; i < visibleResults.length; i++) {
    const result = visibleResults[i];
    const globalIndex = startIdx + i;
    const isSelected = globalIndex === state.selectedIndex;

    // Title line with score
    const scoreStr = result.score.toFixed(2);
    const titleStyle = isSelected && isFocused ? theme.explorerItemSelected : theme.explorerItem;
    const indicator = isSelected && isFocused ? theme.info.render('▸ ') : '  ';
    const titleText = truncate(result.title, width - 12);
    const scorePart = theme.scoreStyle.render(` (${scoreStr})`);
    lines.push(`${indicator}${titleStyle.render(titleText)}${scorePart}`);

    // Snippet line
    const snippetText = truncate(result.snippet, width - 4);
    lines.push(`    ${theme.muted.render(snippetText)}`);

    // Blank separator
    lines.push('');
  }

  return lines;
}

/**
 * Truncate a string to fit width
 */
function truncate(str: string, maxWidth: number): string {
  if (maxWidth <= 0) return '';
  if (str.length <= maxWidth) return str;
  return str.slice(0, Math.max(0, maxWidth - 1)) + '…';
}
