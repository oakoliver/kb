/**
 * Lint service adapter for KB Studio TUI
 * Bridges TUI lint trigger to the existing lint command logic
 * @module tui/operations/lint
 */

import type { WikiPaths } from '../../core/resolver';
import type { ProblemItem } from '../state';

// =============================================================================
// Types
// =============================================================================

export interface LintContext {
  wikiRoot: string;
  paths: WikiPaths;
}

// =============================================================================
// Lint Service
// =============================================================================

/**
 * Run lint checks and return problems mapped for the TUI
 */
export async function lintWorkspace(ctx: LintContext): Promise<ProblemItem[]> {
  try {
    const { readdir } = await import('fs/promises');
    const { join } = await import('path');
    const { loadOrCreateGraph } = await import('../../core/graph');
    const { parseFrontmatter, extractWikilinks } = await import('../../core/markdown');
    const { FrontmatterSchema } = await import('../../core/schemas');

    // Collect all articles
    const articles = await collectArticles(ctx.paths.wiki, readdir, join, parseFrontmatter);
    const graph = await loadOrCreateGraph(ctx.paths.graph);

    const problems: ProblemItem[] = [];

    // Check frontmatter
    for (const article of articles) {
      if (article.parseError) {
        problems.push({
          path: article.relativePath,
          line: 1,
          message: article.parseError,
          severity: 'error',
        });
        continue;
      }

      if (!article.frontmatter) {
        problems.push({
          path: article.relativePath,
          line: 1,
          message: 'Missing frontmatter',
          severity: 'error',
        });
        continue;
      }

      const result = FrontmatterSchema.safeParse(article.frontmatter);
      if (!result.success) {
        const errorMessages = result.error.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`);
        problems.push({
          path: article.relativePath,
          line: 1,
          message: `Invalid frontmatter: ${errorMessages.join(', ')}`,
          severity: 'error',
        });
      }
    }

    // Check broken links
    const existingTitles = new Set<string>();
    for (const article of articles) {
      if (article.frontmatter?.title) {
        existingTitles.add(article.frontmatter.title.toLowerCase());
      }
    }

    for (const article of articles) {
      if (!article.frontmatter) continue;

      const bodyLinks = extractWikilinks(article.body);
      for (const link of bodyLinks) {
        if (!existingTitles.has(link.toLowerCase())) {
          problems.push({
            path: article.relativePath,
            line: estimateLinkLine(article.body, link),
            message: `Broken link: [[${link}]]`,
            severity: 'error',
          });
        }
      }
    }

    // Check orphans
    for (const article of articles) {
      if (!article.frontmatter) continue;
      const hasSources = article.frontmatter.sources.length > 0;
      const node = graph.nodes[article.relativePath];
      const hasGraphDeps = node && (node.dependsOn.length > 0 || node.dependents.length > 0);

      if (!hasSources && !hasGraphDeps) {
        problems.push({
          path: article.relativePath,
          line: 1,
          message: 'Orphan article: no sources and no dependencies',
          severity: 'warning',
        });
      }
    }

    return problems;
  } catch (err) {
    return [{
      path: '',
      line: 0,
      message: `Lint failed: ${(err as Error).message}`,
      severity: 'error',
    }];
  }
}

// =============================================================================
// Pure Helpers
// =============================================================================

interface ArticleInfo {
  path: string;
  relativePath: string;
  frontmatter: { title: string; sources: string[]; related: string[] } | null;
  body: string;
  parseError?: string;
}

async function collectArticles(
  wikiDir: string,
  readdir: (dir: string) => Promise<string[]>,
  join: (...args: string[]) => string,
  parseFrontmatter: (content: string) => { frontmatter: any; body: string },
): Promise<ArticleInfo[]> {
  const articles: ArticleInfo[] = [];
  const subdirs = ['concepts', 'entities', 'syntheses'];

  for (const subdir of subdirs) {
    const dir = join(wikiDir, subdir);
    try {
      const files = await readdir(dir);
      for (const file of files) {
        if (!file.endsWith('.md') || file.startsWith('_')) continue;
        const filePath = join(dir, file);
        const relativePath = `wiki/${subdir}/${file}`;

        try {
          const content = await Bun.file(filePath).text();
          const { frontmatter, body } = parseFrontmatter(content);
          articles.push({ path: filePath, relativePath, frontmatter, body });
        } catch (err) {
          articles.push({
            path: filePath,
            relativePath,
            frontmatter: null,
            body: '',
            parseError: (err as Error).message,
          });
        }
      }
    } catch {
      // Directory doesn't exist
    }
  }

  return articles;
}

/**
 * Estimate which line a wikilink appears on
 */
function estimateLinkLine(body: string, linkTarget: string): number {
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`[[${linkTarget}`)) {
      return i + 1;
    }
  }
  return 1;
}

/**
 * Map lint issues to problem items (pure transform)
 */
export function mapLintIssuesToProblems(issues: Array<{
  type: string;
  file: string;
  message: string;
}>): ProblemItem[] {
  return issues.map((issue) => ({
    path: issue.file,
    line: 1,
    message: issue.message,
    severity: issue.type === 'orphan' ? 'warning' as const : 'error' as const,
  }));
}

/**
 * Count problems by severity
 */
export function countProblemsBySeverity(problems: ProblemItem[]): {
  errors: number;
  warnings: number;
  info: number;
} {
  const counts = { errors: 0, warnings: 0, info: 0 };
  for (const p of problems) {
    if (p.severity === 'error') counts.errors++;
    else if (p.severity === 'warning') counts.warnings++;
    else counts.info++;
  }
  return counts;
}
