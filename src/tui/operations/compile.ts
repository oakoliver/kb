/**
 * Compile service adapter for KB Studio TUI
 * Bridges TUI compile trigger to the existing compile command logic
 * @module tui/operations/compile
 */

import type { WikiPaths } from '../../core/resolver';
import type { OutputLine } from '../state';
import { infoLine, errorLine, successLine } from '../panels/output';

// =============================================================================
// Types
// =============================================================================

export interface CompileContext {
  wikiRoot: string;
  paths: WikiPaths;
}

export interface CompileCallbacks {
  onProgress: (percent: number, label: string) => void;
  onLog: (line: OutputLine) => void;
  onComplete: (articlesCompiled: number) => void;
  onError: (error: string) => void;
}

export interface CompileResult {
  articlesCompiled: number;
  created: string[];
  updated: string[];
  durationMs: number;
}

// =============================================================================
// Compile Service
// =============================================================================

/**
 * Run compilation from the TUI, with progress callbacks.
 * Uses the same core logic as the CLI compile command.
 */
export async function compileWorkspace(
  ctx: CompileContext,
  callbacks: CompileCallbacks,
): Promise<void> {
  const startTime = Date.now();

  try {
    // Dynamically import to avoid circular dependency issues
    const { loadManifest, getChangedEntries, computeHash } = await import('../../core/manifest');
    const { loadOrCreateGraph, saveGraph, setNode, getArticlesForSource } = await import('../../core/graph');
    const { loadConfig, getApiKey } = await import('../../core/config');
    const { createProviderFromEnv } = await import('../../llm/provider');
    const { streamResponse } = await import('../../llm/stream');
    const {
      parseFrontmatter,
      createArticle,
      relatedFromBody,
      titleToSlug,
      getArticlePath,
      getArticleDir,
    } = await import('../../core/markdown');
    const { createFrontmatter } = await import('../../core/schemas');
    const {
      SYSTEM_PROMPT_CONCEPTS,
      SYSTEM_PROMPT_ENTITIES,
      conceptExtractionPrompt,
      entityExtractionPrompt,
      articleGenerationPrompt,
      generateIndex,
    } = await import('../../llm/prompts');
    const { join } = await import('path');
    const { mkdir, readdir } = await import('fs/promises');

    callbacks.onLog(infoLine('Loading configuration...'));
    callbacks.onProgress(0.05, 'Loading config');

    const config = await loadConfig(ctx.wikiRoot);
    const manifest = await loadManifest(ctx.paths.manifest);
    let graph = await loadOrCreateGraph(ctx.paths.graph);

    // Determine sources needing compilation
    callbacks.onLog(infoLine('Checking for sources needing compilation...'));
    callbacks.onProgress(0.1, 'Checking sources');

    const sourcesToCompile: typeof manifest.entries = [];
    for (const entry of manifest.entries) {
      const articles = getArticlesForSource(graph, entry.path);
      if (articles.length === 0) {
        sourcesToCompile.push(entry);
        continue;
      }
      const filePath = `${ctx.wikiRoot}/raw/${entry.path}`;
      const file = Bun.file(filePath);
      if (!(await file.exists())) {
        sourcesToCompile.push(entry);
        continue;
      }
      const content = await file.text();
      const currentHash = await computeHash(content);
      if (currentHash !== entry.hash) {
        sourcesToCompile.push(entry);
      }
    }

    if (sourcesToCompile.length === 0) {
      callbacks.onLog(successLine('Nothing to compile. All articles are up to date.'));
      callbacks.onProgress(1.0, 'Complete');
      callbacks.onComplete(0);
      return;
    }

    callbacks.onLog(infoLine(`Found ${sourcesToCompile.length} source(s) to compile`));

    // Check API key
    const apiKey = getApiKey(config.llm.provider);
    if (!apiKey) {
      callbacks.onError(`Missing API key for ${config.llm.provider}`);
      return;
    }

    const provider = createProviderFromEnv(config.llm.provider, config.llm.model, config.llm.baseUrl);
    const created: string[] = [];
    const updated: string[] = [];

    for (let i = 0; i < sourcesToCompile.length; i++) {
      const entry = sourcesToCompile[i];
      const progress = 0.1 + (0.85 * i / sourcesToCompile.length);
      callbacks.onProgress(progress, `Compiling: ${entry.title}`);
      callbacks.onLog(infoLine(`Compiling: ${entry.title}...`));

      try {
        // Read source
        const sourcePath = join(ctx.paths.raw, entry.path);
        const sourceContent = await Bun.file(sourcePath).text();

        // Determine type
        const articleType = entry.type === 'paper' ? 'concept' as const : entry.type === 'code' ? 'entity' as const : 'concept' as const;

        // Get existing articles for wikilink suggestions
        const existingArticles = await getExistingTitles(ctx.paths.wiki, readdir, parseFrontmatter);

        // Extract content
        const systemPrompt = articleType === 'entity' ? SYSTEM_PROMPT_ENTITIES : SYSTEM_PROMPT_CONCEPTS;
        const extractionPrompt = articleType === 'entity'
          ? entityExtractionPrompt(sourceContent, entry.title)
          : conceptExtractionPrompt(sourceContent, entry.title);

        const { content: extracted } = await streamResponse(provider, {
          messages: [{ role: 'user', content: extractionPrompt }],
          systemPrompt,
          maxTokens: 2000,
          temperature: 0.3,
        }, { print: false });

        // Generate article
        const genPrompt = articleGenerationPrompt(extracted, articleType, entry.title, existingArticles);
        const { content: articleContent } = await streamResponse(provider, {
          messages: [{ role: 'user', content: genPrompt }],
          systemPrompt,
          maxTokens: 3000,
          temperature: 0.5,
        }, { print: false });

        // Create frontmatter and write
        const frontmatter = createFrontmatter(entry.title, articleType, [entry.path], relatedFromBody(articleContent));
        const fullArticle = createArticle(frontmatter, articleContent);
        const articleDir = join(ctx.paths.wiki, getArticleDir(articleType));
        const articleFilename = `${titleToSlug(entry.title)}.md`;
        const articlePath = join(articleDir, articleFilename);
        const relativePath = `wiki/${getArticleDir(articleType)}/${articleFilename}`;

        const isNew = !(await Bun.file(articlePath).exists());
        await mkdir(articleDir, { recursive: true });
        await Bun.write(articlePath, fullArticle);

        // Update graph
        graph = setNode(graph, relativePath, {
          dependsOn: [entry.path],
          dependents: [],
        });

        if (isNew) {
          created.push(relativePath);
          callbacks.onLog(successLine(`Created: ${relativePath}`));
        } else {
          updated.push(relativePath);
          callbacks.onLog(successLine(`Updated: ${relativePath}`));
        }
      } catch (err) {
        callbacks.onLog(errorLine(`Failed: ${entry.title} - ${(err as Error).message}`));
      }
    }

    // Save graph and regenerate index
    await saveGraph(ctx.paths.graph, graph);
    callbacks.onLog(infoLine('Regenerating index...'));
    callbacks.onProgress(0.95, 'Regenerating index');

    // Regenerate index
    const allArticles = await getAllArticlesForIndex(ctx.paths.wiki, readdir, parseFrontmatter);
    const indexContent = generateIndex(allArticles);
    await Bun.write(ctx.paths.index, indexContent);

    const durationMs = Date.now() - startTime;
    const totalCompiled = created.length + updated.length;

    callbacks.onLog(successLine(`Compiled ${totalCompiled} article(s) in ${(durationMs / 1000).toFixed(1)}s`));
    callbacks.onProgress(1.0, 'Complete');
    callbacks.onComplete(totalCompiled);
  } catch (err) {
    callbacks.onError((err as Error).message);
  }
}

// =============================================================================
// Helpers (internal)
// =============================================================================

async function getExistingTitles(
  wikiDir: string,
  readdir: (dir: string) => Promise<string[]>,
  parseFrontmatter: (content: string) => { frontmatter: { title: string } | null; body: string },
): Promise<string[]> {
  const titles: string[] = [];
  const subdirs = ['concepts', 'entities', 'syntheses'];
  const { join } = await import('path');

  for (const subdir of subdirs) {
    const dir = join(wikiDir, subdir);
    try {
      const files = await readdir(dir);
      for (const file of files) {
        if (file.endsWith('.md') && !file.startsWith('_')) {
          const content = await Bun.file(join(dir, file)).text();
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

async function getAllArticlesForIndex(
  wikiDir: string,
  readdir: (dir: string) => Promise<string[]>,
  parseFrontmatter: (content: string) => { frontmatter: { title: string; type: string } | null; body: string },
): Promise<Array<{ title: string; type: 'concept' | 'entity' | 'synthesis' | 'query'; path: string }>> {
  const articles: Array<{ title: string; type: 'concept' | 'entity' | 'synthesis' | 'query'; path: string }> = [];
  const subdirs = ['concepts', 'entities', 'syntheses'];
  const { join } = await import('path');

  for (const subdir of subdirs) {
    const dir = join(wikiDir, subdir);
    try {
      const files = await readdir(dir);
      for (const file of files) {
        if (file.endsWith('.md') && !file.startsWith('_')) {
          const content = await Bun.file(join(dir, file)).text();
          const { frontmatter } = parseFrontmatter(content);
          if (frontmatter) {
            articles.push({
              title: frontmatter.title,
              type: frontmatter.type as 'concept' | 'entity' | 'synthesis' | 'query',
              path: `wiki/${subdir}/${file}`,
            });
          }
        }
      }
    } catch {
      // Directory doesn't exist yet
    }
  }
  return articles;
}

// =============================================================================
// Pure helpers for progress calculations
// =============================================================================

/**
 * Calculate compile progress percentage
 */
export function calculateCompileProgress(current: number, total: number): number {
  if (total === 0) return 1.0;
  return Math.min(1.0, 0.1 + (0.85 * current / total));
}

/**
 * Build output lines for compile start
 */
export function buildCompileStartLines(sourceCount: number): OutputLine[] {
  return [
    infoLine(`Starting compilation of ${sourceCount} source(s)...`),
  ];
}

/**
 * Build output lines for compile completion
 */
export function buildCompileCompleteLines(
  articlesCompiled: number,
  durationMs: number,
): OutputLine[] {
  const duration = (durationMs / 1000).toFixed(1);
  return [
    successLine(`Compiled ${articlesCompiled} article(s) in ${duration}s`),
  ];
}
