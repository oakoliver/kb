/**
 * kb status command - Show wiki statistics
 * @module commands/status
 */

import { readdir } from 'fs/promises';
import { join } from 'path';
import { resolveWikiRoot, getWikiPaths } from '../core/resolver';
import { loadOrCreateManifest } from '../core/manifest';
import { loadOrCreateGraph, findOrphans } from '../core/graph';
import { parseFrontmatter } from '../core/markdown';
import type { ArticleType } from '../core/schemas';
import { output, error as outputError, isTTY, styles, symbols } from '../output/format';
import type { CommandContext } from '../cli';

// =============================================================================
// Types
// =============================================================================

export interface StatusResult {
  path: string;
  sources: {
    total: number;
    new: number;
  };
  articles: {
    total: number;
    concepts: number;
    entities: number;
    syntheses: number;
  };
  queries: number;
  health: {
    stale: number;
    orphan: number;
  };
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Show wiki statistics
 */
export async function status(ctx: CommandContext): Promise<number> {
  // Resolve wiki root
  let wikiRoot: { path: string };
  try {
    wikiRoot = await resolveWikiRoot();
  } catch (err) {
    outputError((err as Error).message);
    return 1;
  }

  const paths = getWikiPaths(wikiRoot.path);

  // Collect statistics
  const manifest = await loadOrCreateManifest(paths.manifest);
  const graph = await loadOrCreateGraph(paths.graph);

  // Count articles by type
  const articleCounts = await countArticlesByType(paths.wiki);

  // Count queries
  const queryCount = await countQueries(paths.queries);

  // Count sources
  const totalSources = manifest.entries.length;
  const compiledSources = new Set<string>();

  // Find compiled sources from graph
  for (const node of Object.values(graph.nodes)) {
    for (const dep of node.dependsOn) {
      compiledSources.add(dep);
    }
  }

  const newSources = totalSources - compiledSources.size;

  // Health stats
  const orphans = findOrphans(graph);

  // Build result
  const result: StatusResult = {
    path: wikiRoot.path,
    sources: {
      total: totalSources,
      new: Math.max(0, newSources),
    },
    articles: {
      total: articleCounts.concept + articleCounts.entity + articleCounts.synthesis,
      concepts: articleCounts.concept,
      entities: articleCounts.entity,
      syntheses: articleCounts.synthesis,
    },
    queries: queryCount,
    health: {
      stale: 0, // Would need to compare manifest hashes
      orphan: orphans.length,
    },
  };

  // Output
  if (isTTY) {
    formatStatusOutput(result);
  } else {
    output(result);
  }

  return 0;
}

// =============================================================================
// Statistics Collection
// =============================================================================

/**
 * Count articles by type
 */
async function countArticlesByType(
  wikiDir: string
): Promise<Record<'concept' | 'entity' | 'synthesis', number>> {
  const counts = {
    concept: 0,
    entity: 0,
    synthesis: 0,
  };

  const subdirs: Array<{ dir: string; type: 'concept' | 'entity' | 'synthesis' }> = [
    { dir: 'concepts', type: 'concept' },
    { dir: 'entities', type: 'entity' },
    { dir: 'syntheses', type: 'synthesis' },
  ];

  for (const { dir, type } of subdirs) {
    const fullDir = join(wikiDir, dir);

    try {
      const files = await readdir(fullDir);

      for (const file of files) {
        if (!file.endsWith('.md') || file.startsWith('_')) continue;

        const filePath = join(fullDir, file);
        try {
          const content = await Bun.file(filePath).text();
          const { frontmatter } = parseFrontmatter(content);

          if (frontmatter && frontmatter.type === type) {
            counts[type]++;
          }
        } catch {
          // Skip files that can't be parsed
        }
      }
    } catch {
      // Directory doesn't exist
    }
  }

  return counts;
}

/**
 * Count query files
 */
async function countQueries(queriesDir: string): Promise<number> {
  try {
    const files = await readdir(queriesDir);
    return files.filter((f) => f.endsWith('.md') && !f.startsWith('_')).length;
  } catch {
    return 0;
  }
}

// =============================================================================
// Output Formatting
// =============================================================================

/**
 * Format status output for TTY
 */
function formatStatusOutput(result: StatusResult): void {
  console.log(`${styles.bold.render('Wiki:')} ${styles.path.render(result.path)}`);
  console.log('');

  // Sources
  const sourcesNew = result.sources.new > 0 ? ` (${result.sources.new} new)` : '';
  console.log(`${styles.bold.render('Sources:')} ${result.sources.total}${sourcesNew}`);

  // Articles
  console.log(`${styles.bold.render('Articles:')} ${result.articles.total}`);
  console.log(`  - Concepts: ${result.articles.concepts}`);
  console.log(`  - Entities: ${result.articles.entities}`);
  console.log(`  - Syntheses: ${result.articles.syntheses}`);

  // Queries
  console.log(`${styles.bold.render('Queries:')} ${result.queries}`);

  // Health
  if (result.health.stale > 0 || result.health.orphan > 0) {
    console.log('');
    const parts: string[] = [];
    if (result.health.stale > 0) {
      parts.push(`${result.health.stale} stale`);
    }
    if (result.health.orphan > 0) {
      parts.push(`${result.health.orphan} orphan`);
    }
    console.log(`${styles.bold.render('Health:')} ${parts.join(', ')}`);
  }
}

export default status;
