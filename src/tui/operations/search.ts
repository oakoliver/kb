/**
 * BM25 search service adapter for studio TUI
 * Wraps the existing bm25 index module for async use in the TUI context
 * @module tui/operations/search
 */

import { buildIndex, search as bm25Search, type SearchResult } from '../../index/bm25';
import type { SearchResultItem } from '../state';

// =============================================================================
// Types
// =============================================================================

export interface SearchWorkspaceOptions {
  limit?: number;
}

// =============================================================================
// Cached Index
// =============================================================================

let cachedIndex: Awaited<ReturnType<typeof buildIndex>> | null = null;
let cachedWikiDir: string | null = null;

/**
 * Invalidate the cached search index (call after compile/ingest)
 */
export function invalidateSearchIndex(): void {
  cachedIndex = null;
  cachedWikiDir = null;
}

// =============================================================================
// Search Adapter
// =============================================================================

/**
 * Search workspace wiki articles using BM25
 * Caches the index for subsequent queries on the same wiki dir
 */
export async function searchWorkspace(
  wikiDir: string,
  query: string,
  options: SearchWorkspaceOptions = {},
): Promise<SearchResultItem[]> {
  const { limit = 20 } = options;

  if (!query.trim()) {
    return [];
  }

  // Build or reuse cached index
  if (!cachedIndex || cachedWikiDir !== wikiDir) {
    cachedIndex = await buildIndex(wikiDir);
    cachedWikiDir = wikiDir;
  }

  if (cachedIndex.documents.length === 0) {
    return [];
  }

  // Search
  const results = bm25Search(cachedIndex, query, { limit });

  // Map to TUI result items
  return results.map(mapSearchResult);
}

/**
 * Map a BM25 SearchResult to a TUI SearchResultItem
 */
export function mapSearchResult(result: SearchResult): SearchResultItem {
  return {
    path: result.path,
    title: result.title,
    score: result.score,
    snippet: result.snippet,
  };
}
