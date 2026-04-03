/**
 * kb compile command - Transform raw sources into wiki articles
 * @module commands/compile
 */

import { join, basename } from 'path';
import { mkdir, readdir } from 'fs/promises';
import { resolveWikiRoot, getWikiPaths } from '../core/resolver';
import { loadManifest, getChangedEntries, computeHash, type ManifestEntry } from '../core/manifest';
import { loadOrCreateGraph, saveGraph, setNode, addDependency, getAllArticles, getArticlesForSource, type Graph } from '../core/graph';
import { loadConfig, getApiKey } from '../core/config';
import {
  parseFrontmatter,
  createArticle,
  extractWikilinks,
  titleToSlug,
  getArticlePath,
  getArticleDir,
} from '../core/markdown';
import { createFrontmatter, type ArticleType, type Frontmatter } from '../core/schemas';
import { createProviderFromEnv, type LLMProvider } from '../llm/provider';
import { streamResponse } from '../llm/stream';
import {
  SYSTEM_PROMPT_CONCEPTS,
  SYSTEM_PROMPT_ENTITIES,
  conceptExtractionPrompt,
  entityExtractionPrompt,
  articleGenerationPrompt,
  generateIndex,
} from '../llm/prompts';
import { output, success, error as outputError, isTTY, styles, symbols, warning } from '../output/format';
import { spin } from '../output/progress';
import type { CommandContext } from '../cli';

// =============================================================================
// Types
// =============================================================================

export interface CompileResult {
  created: string[];
  updated: string[];
  deleted: string[];
  unchanged: number;
  duration_ms: number;
}

export interface CompileOptions {
  full?: boolean;
  dryRun?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get sources that need compilation - both new and changed
 */
async function getSourcesNeedingCompilation(
  manifest: { entries: ManifestEntry[] },
  graph: Graph,
  wikiRoot: string
): Promise<ManifestEntry[]> {
  const needsCompilation: ManifestEntry[] = [];

  for (const entry of manifest.entries) {
    // Check if this source has any compiled articles in the graph
    const articles = getArticlesForSource(graph, entry.path);

    if (articles.length === 0) {
      // New source - never compiled
      needsCompilation.push(entry);
      continue;
    }

    // Check if source has changed (hash mismatch)
    const filePath = `${wikiRoot}/raw/${entry.path}`;
    const file = Bun.file(filePath);

    if (!(await file.exists())) {
      // File was deleted - needs recompilation
      needsCompilation.push(entry);
      continue;
    }

    const content = await file.text();
    const currentHash = await computeHash(content);

    if (currentHash !== entry.hash) {
      // Source changed
      needsCompilation.push(entry);
    }
  }

  return needsCompilation;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Compile sources into wiki articles
 */
export async function compile(ctx: CommandContext): Promise<number> {
  const startTime = Date.now();

  // Parse options
  const options: CompileOptions = {
    full: ctx.flags.full === true,
    dryRun: ctx.flags['dry-run'] === true,
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

  // Load config
  const config = await loadConfig(wikiRoot.path);

  // Load manifest and graph
  const manifest = await loadManifest(paths.manifest);
  let graph = await loadOrCreateGraph(paths.graph);

  // Determine which sources need compilation
  let sourcesToCompile: ManifestEntry[];
  if (options.full) {
    sourcesToCompile = manifest.entries;
  } else {
    // Get sources that need compilation: new or changed
    sourcesToCompile = await getSourcesNeedingCompilation(manifest, graph, wikiRoot.path);
  }

  if (sourcesToCompile.length === 0) {
    if (isTTY) {
      success('Nothing to compile. All articles are up to date.');
    } else {
      const result: CompileResult = {
        created: [],
        updated: [],
        deleted: [],
        unchanged: manifest.entries.length,
        duration_ms: Date.now() - startTime,
      };
      output(result);
    }
    return 0;
  }

  // Dry run mode
  if (options.dryRun) {
    if (isTTY) {
      console.log(styles.bold.render('Dry run - would compile:'));
      for (const entry of sourcesToCompile) {
        console.log(`  ${symbols.arrow} ${entry.title} (${entry.type})`);
      }
    } else {
      output({
        dryRun: true,
        toCompile: sourcesToCompile.map((e) => ({ path: e.path, title: e.title })),
      });
    }
    return 0;
  }

  // Check for API key (only needed when we have sources to compile)
  const apiKey = getApiKey(config.llm.provider);
  if (!apiKey) {
    outputError(
      `Missing API key for ${config.llm.provider}`,
      `Set the ${config.llm.provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'} environment variable.`
    );
    return 1;
  }

  // Create LLM provider
  const provider = createProviderFromEnv(config.llm.provider, config.llm.model);

  const created: string[] = [];
  const updated: string[] = [];
  const unchanged = manifest.entries.length - sourcesToCompile.length;

  // Compile each source
  for (const entry of sourcesToCompile) {
    const spinner = spin(`Compiling: ${entry.title}...`);

    try {
      const result = await compileSource(entry, paths, provider, graph);

      if (result.created) {
        created.push(result.articlePath);
        spinner.success(`Created: ${result.articlePath}`);
      } else {
        updated.push(result.articlePath);
        spinner.success(`Updated: ${result.articlePath}`);
      }

      // Update graph
      graph = result.graph;
    } catch (err) {
      spinner.error(`Failed: ${(err as Error).message}`);
      // Continue with other sources
    }
  }

  // Save updated graph
  await saveGraph(paths.graph, graph);

  // Regenerate index
  await regenerateIndex(paths, graph);

  // Output result
  const result: CompileResult = {
    created,
    updated,
    deleted: [],
    unchanged,
    duration_ms: Date.now() - startTime,
  };

  output(result, () => formatCompileOutput(result));

  return 0;
}

// =============================================================================
// Source Compilation
// =============================================================================

interface CompileSourceResult {
  articlePath: string;
  created: boolean;
  graph: typeof import('../core/graph').loadOrCreateGraph extends (...args: any[]) => Promise<infer R> ? R : never;
}

/**
 * Compile a single source into wiki articles
 */
async function compileSource(
  entry: ManifestEntry,
  paths: ReturnType<typeof getWikiPaths>,
  provider: LLMProvider,
  graph: Awaited<ReturnType<typeof loadOrCreateGraph>>
): Promise<CompileSourceResult> {
  // Read source content
  const sourcePath = join(paths.raw, entry.path);
  const sourceFile = Bun.file(sourcePath);
  const sourceContent = await sourceFile.text();

  // Determine article type based on source type
  const articleType: ArticleType = entry.type === 'paper' ? 'concept' : entry.type === 'code' ? 'entity' : 'concept';

  // Get existing articles for wikilink suggestions
  const existingArticles = await getExistingArticleTitles(paths.wiki);

  // Generate article content using LLM
  const articleContent = await generateArticleContent(
    provider,
    sourceContent,
    entry.title,
    articleType,
    existingArticles
  );

  // Create frontmatter
  const frontmatter = createFrontmatter(
    entry.title,
    articleType,
    [entry.path],
    extractWikilinks(articleContent)
  );

  // Create full article
  const fullArticle = createArticle(frontmatter, articleContent);

  // Determine output path
  const articleDir = join(paths.wiki, getArticleDir(articleType));
  const articleFilename = `${titleToSlug(entry.title)}.md`;
  const articlePath = join(articleDir, articleFilename);
  const relativeArticlePath = `wiki/${getArticleDir(articleType)}/${articleFilename}`;

  // Check if article exists
  const existingFile = Bun.file(articlePath);
  const isNew = !(await existingFile.exists());

  // Ensure directory exists
  await mkdir(articleDir, { recursive: true });

  // Write article
  await Bun.write(articlePath, fullArticle);

  // Update graph
  let updatedGraph = graph;
  updatedGraph = setNode(updatedGraph, relativeArticlePath, {
    dependsOn: [entry.path],
    dependents: [],
  });

  return {
    articlePath: relativeArticlePath,
    created: isNew,
    graph: updatedGraph,
  };
}

/**
 * Generate article content using LLM
 */
async function generateArticleContent(
  provider: LLMProvider,
  sourceContent: string,
  title: string,
  articleType: ArticleType,
  existingArticles: string[]
): Promise<string> {
  // First, extract relevant information from source
  const extractionPrompt =
    articleType === 'entity'
      ? entityExtractionPrompt(sourceContent, title)
      : conceptExtractionPrompt(sourceContent, title);

  const systemPrompt = articleType === 'entity' ? SYSTEM_PROMPT_ENTITIES : SYSTEM_PROMPT_CONCEPTS;

  const { content: extractedContent } = await streamResponse(provider, {
    messages: [{ role: 'user', content: extractionPrompt }],
    systemPrompt,
    maxTokens: 2000,
    temperature: 0.3,
  }, { print: false });

  // Then, generate the final article
  const articlePrompt = articleGenerationPrompt(
    extractedContent,
    articleType,
    title,
    existingArticles
  );

  const { content: articleContent } = await streamResponse(provider, {
    messages: [{ role: 'user', content: articlePrompt }],
    systemPrompt,
    maxTokens: 3000,
    temperature: 0.5,
  }, { print: false });

  return articleContent;
}

/**
 * Get list of existing article titles
 */
async function getExistingArticleTitles(wikiDir: string): Promise<string[]> {
  const titles: string[] = [];
  const subdirs = ['concepts', 'entities', 'syntheses'];

  for (const subdir of subdirs) {
    const dir = join(wikiDir, subdir);
    try {
      const files = await readdir(dir);
      for (const file of files) {
        if (file.endsWith('.md') && !file.startsWith('_')) {
          const filePath = join(dir, file);
          const content = await Bun.file(filePath).text();
          const { frontmatter } = parseFrontmatter(content);
          if (frontmatter?.title) {
            titles.push(frontmatter.title);
          }
        }
      }
    } catch {
      // Directory doesn't exist yet
    }
  }

  return titles;
}

/**
 * Regenerate the wiki index
 */
async function regenerateIndex(
  paths: ReturnType<typeof getWikiPaths>,
  graph: Awaited<ReturnType<typeof loadOrCreateGraph>>
): Promise<void> {
  const articles: Array<{ title: string; type: ArticleType; path: string }> = [];
  const subdirs = ['concepts', 'entities', 'syntheses'];

  for (const subdir of subdirs) {
    const dir = join(paths.wiki, subdir);
    try {
      const files = await readdir(dir);
      for (const file of files) {
        if (file.endsWith('.md') && !file.startsWith('_')) {
          const filePath = join(dir, file);
          const content = await Bun.file(filePath).text();
          const { frontmatter } = parseFrontmatter(content);
          if (frontmatter) {
            articles.push({
              title: frontmatter.title,
              type: frontmatter.type,
              path: `wiki/${subdir}/${file}`,
            });
          }
        }
      }
    } catch {
      // Directory doesn't exist yet
    }
  }

  const indexContent = generateIndex(articles);
  await Bun.write(paths.index, indexContent);
}

// =============================================================================
// Output Formatting
// =============================================================================

/**
 * Format human-readable output for compile command
 */
function formatCompileOutput(result: CompileResult): string {
  const lines: string[] = [];

  if (result.created.length > 0) {
    for (const path of result.created) {
      lines.push(`  ${styles.success.render(symbols.success)} Created: ${styles.path.render(path)}`);
    }
  }

  if (result.updated.length > 0) {
    for (const path of result.updated) {
      lines.push(`  ${styles.success.render(symbols.success)} Updated: ${styles.path.render(path)}`);
    }
  }

  if (lines.length > 0) {
    lines.push('');
  }

  const totalCompiled = result.created.length + result.updated.length;
  const duration = (result.duration_ms / 1000).toFixed(1);
  lines.push(`Compiled ${totalCompiled} article${totalCompiled !== 1 ? 's' : ''} in ${duration}s`);

  return lines.join('\n');
}

export default compile;
