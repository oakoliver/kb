/**
 * kb find command - Fast keyword search using BM25
 * @module commands/find
 */

import { resolveWikiRoot, getWikiPaths } from '../core/resolver';
import { buildIndex, search, type SearchResult } from '../index/bm25';
import { output, error as outputError, isTTY, styles, symbols } from '../output/format';
import type { CommandContext } from '../cli';

// =============================================================================
// Types
// =============================================================================

export interface FindResult {
  results: Array<{
    path: string;
    title: string;
    score: number;
    snippet: string;
  }>;
  total: number;
}

export interface FindOptions {
  limit: number;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Find articles matching a keyword query
 */
export async function find(ctx: CommandContext): Promise<number> {
  // Get query from positionals
  const query = ctx.positionals.join(' ').trim();

  if (!query) {
    outputError('Missing search query.', "Usage: kb find <query> [--limit <n>]");
    return 1;
  }

  // Parse options
  const options: FindOptions = {
    limit: parseLimit(ctx.flags.limit),
  };

  // Resolve wiki root
  let wikiRoot: { path: string };
  try {
    wikiRoot = await resolveWikiRoot();
  } catch (err) {
    outputError((err as Error).message);
    return 1;
  }

  const paths = getWikiPaths(wikiRoot.path);

  // Build index from wiki articles
  const index = await buildIndex(paths.wiki);

  if (index.documents.length === 0) {
    if (isTTY) {
      outputError('No articles found.', 'Run `kb compile` to generate wiki articles.');
    } else {
      output({ results: [], total: 0 });
    }
    return 1;
  }

  // Search the index
  const results = search(index, query, { limit: options.limit });

  if (results.length === 0) {
    if (isTTY) {
      console.log(`${styles.dim.render('No results found for:')} ${query}`);
    } else {
      output({ results: [], total: 0 });
    }
    return 1;
  }

  // Format and output results
  const findResult: FindResult = {
    results: results.map((r) => ({
      path: r.path,
      title: r.title,
      score: r.score,
      snippet: r.snippet,
    })),
    total: results.length,
  };

  output(findResult, () => formatFindOutput(results));

  return 0;
}

// =============================================================================
// Output Formatting
// =============================================================================

/**
 * Format human-readable output for find command
 */
function formatFindOutput(results: SearchResult[]): string {
  const lines: string[] = [];

  for (const result of results) {
    // Title with score
    const scoreStr = result.score.toFixed(2);
    lines.push(`${styles.path.render(result.path)} ${styles.dim.render(`(${scoreStr})`)}`);

    // Snippet
    lines.push(`  ${styles.dim.render(result.snippet)}`);
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Parse limit option
 */
function parseLimit(value: string | boolean | undefined): number {
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 10; // Default limit
}

export default find;
