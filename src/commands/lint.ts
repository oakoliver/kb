/**
 * kb lint command - Check wiki health
 * @module commands/lint
 */

import { readdir } from 'fs/promises';
import { join } from 'path';
import { resolveWikiRoot, getWikiPaths } from '../core/resolver';
import { loadOrCreateGraph, findOrphans, type Graph } from '../core/graph';
import { parseFrontmatter, extractWikilinks, relatedTarget, titleToSlug, updateArticleFrontmatter } from '../core/markdown';
import { FrontmatterSchema, type Frontmatter } from '../core/schemas';
import { output, error as outputError, isTTY, styles, symbols } from '../output/format';
import type { CommandContext } from '../cli';

// =============================================================================
// Types
// =============================================================================

export interface LintIssue {
  type: 'broken_link' | 'orphan' | 'stale' | 'frontmatter';
  file: string;
  message: string;
  link?: string;
  /** Where a broken link appears: the article body or its `related:` list */
  location?: 'body' | 'related';
  fixable?: boolean;
}

export interface LintResult {
  errors: LintIssue[];
  warnings: LintIssue[];
  /** Issues repaired by --fix (present only with --fix) */
  fixed?: LintIssue[];
  healthy: boolean;
}

export interface LintOptions {
  fix: boolean;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Check wiki health
 */
export async function lint(ctx: CommandContext): Promise<number> {
  // Parse options
  const options: LintOptions = {
    fix: ctx.flags.fix === true,
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

  if (isTTY) {
    console.log(styles.dim.render('Checking wiki health...'));
    console.log('');
  }

  // Collect all articles
  const articles = await collectArticles(paths.wiki);

  // Load graph
  const graph = await loadOrCreateGraph(paths.graph);

  // Run all checks
  const errors: LintIssue[] = [];
  const warnings: LintIssue[] = [];

  // Check frontmatter
  const frontmatterIssues = checkFrontmatter(articles);
  errors.push(...frontmatterIssues);

  // Check broken links
  const brokenLinks = checkBrokenLinks(articles);
  const fixed = options.fix ? await fixBrokenRelated(articles, brokenLinks) : [];
  errors.push(...brokenLinks.filter((issue) => !fixed.includes(issue)));

  // Check orphans
  const orphans = checkOrphans(articles, graph);
  warnings.push(...orphans);

  // Check stale articles (sources changed) - would need manifest comparison
  // For now, we'll skip this as it requires complex state management

  // Output results
  const result: LintResult = {
    errors,
    warnings,
    ...(options.fix ? { fixed } : {}),
    healthy: errors.length === 0,
  };

  if (isTTY) {
    formatLintOutput(result);
  } else {
    output(result);
  }

  return errors.length > 0 ? 1 : 0;
}

// =============================================================================
// Article Collection
// =============================================================================

interface ArticleInfo {
  path: string;
  relativePath: string;
  frontmatter: Frontmatter | null;
  body: string;
  parseError?: string;
}

/**
 * Collect all wiki articles with their metadata
 */
async function collectArticles(wikiDir: string): Promise<ArticleInfo[]> {
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

          articles.push({
            path: filePath,
            relativePath,
            frontmatter,
            body,
          });
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

// =============================================================================
// Checks
// =============================================================================

/**
 * Check frontmatter validity
 */
function checkFrontmatter(articles: ArticleInfo[]): LintIssue[] {
  const issues: LintIssue[] = [];

  for (const article of articles) {
    if (article.parseError) {
      issues.push({
        type: 'frontmatter',
        file: article.relativePath,
        message: article.parseError,
      });
      continue;
    }

    if (!article.frontmatter) {
      issues.push({
        type: 'frontmatter',
        file: article.relativePath,
        message: 'Missing frontmatter',
      });
      continue;
    }

    // Validate against schema
    const result = FrontmatterSchema.safeParse(article.frontmatter);
    if (!result.success) {
      const errorMessages = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      issues.push({
        type: 'frontmatter',
        file: article.relativePath,
        message: `Invalid frontmatter: ${errorMessages.join(', ')}`,
      });
    }
  }

  return issues;
}

/**
 * Check for broken wikilinks
 */
function checkBrokenLinks(articles: ArticleInfo[]): LintIssue[] {
  const issues: LintIssue[] = [];

  // Build set of existing article titles
  const existingTitles = new Set<string>();
  for (const article of articles) {
    if (article.frontmatter?.title) {
      existingTitles.add(article.frontmatter.title.toLowerCase());
    }
  }

  // Check each article's wikilinks
  for (const article of articles) {
    if (!article.frontmatter) continue;

    // Check wikilinks in body
    const bodyLinks = extractWikilinks(article.body);
    for (const link of bodyLinks) {
      if (!existingTitles.has(link.toLowerCase())) {
        issues.push({
          type: 'broken_link',
          file: article.relativePath,
          message: `Broken link to [[${link}]]`,
          link: `[[${link}]]`,
          location: 'body',
        });
      }
    }

    // Check wikilinks in related
    for (const related of article.frontmatter.related) {
      const linkedTitle = relatedTarget(related);
      if (linkedTitle) {
        if (!existingTitles.has(linkedTitle.toLowerCase())) {
          issues.push({
            type: 'broken_link',
            file: article.relativePath,
            message: `Broken link in related: [[${linkedTitle}]]`,
            link: `[[${linkedTitle}]]`,
            location: 'related',
            fixable: true,
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Remove related: entries that link to articles that don't exist.
 *
 * This is the only fix --fix applies: dropping a dead cross-reference is
 * deterministic, while repairing a link in the body would mean rewriting
 * prose, so body links are left for the user.
 */
async function fixBrokenRelated(articles: ArticleInfo[], issues: LintIssue[]): Promise<LintIssue[]> {
  const fixed: LintIssue[] = [];

  for (const article of articles) {
    const own = issues.filter((i) => i.file === article.relativePath && i.location === 'related');
    if (own.length === 0 || !article.frontmatter) continue;

    const dead = new Set(own.map((i) => i.link!.toLowerCase()));
    const related = article.frontmatter.related.filter((entry) => {
      const target = relatedTarget(entry);
      return !target || !dead.has(`[[${target}]]`.toLowerCase());
    });

    const content = await Bun.file(article.path).text();
    await Bun.write(article.path, updateArticleFrontmatter(content, { related }));
    fixed.push(...own);
  }

  return fixed;
}

/**
 * Check for orphan articles (no sources, not linked by others)
 */
function checkOrphans(articles: ArticleInfo[], graph: Graph): LintIssue[] {
  const issues: LintIssue[] = [];

  for (const article of articles) {
    if (!article.frontmatter) continue;

    // Check if article has no sources
    const hasSources = article.frontmatter.sources.length > 0;

    // Check if article is in graph with dependencies
    const node = graph.nodes[article.relativePath];
    const hasGraphDeps = node && (node.dependsOn.length > 0 || node.dependents.length > 0);

    if (!hasSources && !hasGraphDeps) {
      issues.push({
        type: 'orphan',
        file: article.relativePath,
        message: 'Orphan article: no sources and no dependencies',
      });
    }
  }

  return issues;
}

// =============================================================================
// Output Formatting
// =============================================================================

/**
 * Format lint output for TTY
 */
function formatLintOutput(result: LintResult): void {
  // Print fixes
  for (const issue of result.fixed ?? []) {
    console.log(
      `${styles.success.render(symbols.success)} Fixed: removed ${issue.link} from related in ${styles.path.render(issue.file)}`
    );
  }

  // Print errors
  for (const error of result.errors) {
    console.log(`${styles.error.render(symbols.error)} ${formatIssue(error)}`);
  }

  // Print warnings
  for (const warning of result.warnings) {
    console.log(`${styles.warning.render(symbols.warning)} ${formatIssue(warning)}`);
  }

  // Summary
  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log(`${styles.success.render(symbols.success)} Wiki is healthy`);
  } else {
    const fixable = result.errors.filter((e) => e.fixable).length;
    if (fixable > 0) {
      console.log('');
      console.log(
        styles.dim.render(`Run kb lint --fix to remove ${fixable} broken related entr${fixable === 1 ? 'y' : 'ies'}.`)
      );
    }
    console.log('');
    const parts: string[] = [];
    if (result.errors.length > 0) {
      parts.push(`${result.errors.length} error${result.errors.length !== 1 ? 's' : ''}`);
    }
    if (result.warnings.length > 0) {
      parts.push(`${result.warnings.length} warning${result.warnings.length !== 1 ? 's' : ''}`);
    }
    console.log(`Found ${parts.join(', ')}`);
  }
}

/**
 * Format a single issue
 */
export function formatIssue(issue: LintIssue): string {
  const file = styles.path.render(issue.file);

  switch (issue.type) {
    case 'broken_link':
      return `Broken link: ${file} → ${issue.link}${issue.location ? ` (in ${issue.location})` : ''}`;
    case 'orphan':
      return `Orphan: ${file}`;
    case 'stale':
      return `Stale: ${file} (source changed)`;
    case 'frontmatter':
      return `Frontmatter: ${file} - ${issue.message}`;
    default:
      return `${issue.type}: ${file} - ${issue.message}`;
  }
}

export default lint;
