/**
 * Query service adapter for studio TUI
 * Wraps the existing LLM provider/streaming modules for async use in the TUI context
 * @module tui/operations/query
 */

import { join } from 'path';
import { mkdir } from 'fs/promises';
import type { WikiPaths } from '../../core/resolver';
import type { OutputLine } from '../state';

// =============================================================================
// Types
// =============================================================================

export interface QueryStreamCallbacks {
  onChunk: (text: string) => void;
  onComplete: (fullAnswer: string) => void;
  onError: (error: string) => void;
  onSources: (sources: string[]) => void;
}

export interface QueryContext {
  wikiRoot: string;
  paths: WikiPaths;
}

export interface SaveQueryOptions {
  question: string;
  answer: string;
  sources: string[];
  queriesDir: string;
}

export interface SaveQueryResult {
  savedPath: string;
  relativePath: string;
}

// =============================================================================
// Query Execution
// =============================================================================

/**
 * Execute a query against the workspace wiki, streaming results via callbacks
 * Returns the full answer when complete
 */
export async function executeQuery(
  ctx: QueryContext,
  question: string,
  callbacks: QueryStreamCallbacks,
): Promise<string> {
  // Dynamic imports to avoid loading heavy LLM modules at TUI startup
  const { loadConfig, getApiKey } = await import('../../core/config');
  const { searchRelevantContent } = await import('../../index/pageindex');
  const { createProviderFromEnv } = await import('../../llm/provider');
  const { questionAnswerPrompt, SYSTEM_PROMPT_QA } = await import('../../llm/prompts');

  // Load config and check API key
  const config = await loadConfig(ctx.wikiRoot);
  const apiKey = getApiKey(config.llm.provider);

  if (!apiKey) {
    const envVar = config.llm.provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY';
    throw new Error(`Missing API key for ${config.llm.provider}. Set ${envVar}.`);
  }

  // Search for relevant content
  const relevantContent = await searchRelevantContent(ctx.paths.wiki, question, { limit: 5 });

  if (relevantContent.length === 0) {
    throw new Error('No relevant articles found. Run `compile` first.');
  }

  // Report sources
  const sources = relevantContent.map((r) => r.path);
  callbacks.onSources(sources);

  // Create provider
  const provider = createProviderFromEnv(config.llm.provider, config.llm.model, config.llm.baseUrl);

  // Build prompt
  const articles = relevantContent.map((r) => ({
    title: r.title,
    content: r.content,
  }));
  const prompt = questionAnswerPrompt(question, articles);

  // Stream response
  let fullAnswer = '';
  try {
    for await (const delta of provider.stream({
      messages: [{ role: 'user', content: prompt }],
      systemPrompt: SYSTEM_PROMPT_QA,
      maxTokens: 2000,
      temperature: 0.5,
    })) {
      if (delta.type === 'text' && delta.text) {
        fullAnswer += delta.text;
        callbacks.onChunk(delta.text);
      }
    }

    callbacks.onComplete(fullAnswer);
    return fullAnswer;
  } catch (err) {
    callbacks.onError(String(err));
    throw err;
  }
}

// =============================================================================
// Save Query
// =============================================================================

/**
 * Save a query result to the queries directory
 */
export async function saveQueryDocument(options: SaveQueryOptions): Promise<SaveQueryResult> {
  const { question, answer, sources, queriesDir } = options;

  // Ensure queries directory exists
  await mkdir(queriesDir, { recursive: true });

  // Generate filename
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0];
  const slug = generateSlug(question);
  const filename = `${dateStr}-${slug}.md`;
  const filePath = join(queriesDir, filename);

  // Build frontmatter
  const frontmatter = [
    '---',
    `title: "${question.replace(/"/g, '\\"')}"`,
    'type: query',
    `created: ${date.toISOString()}`,
    `updated: ${date.toISOString()}`,
    'sources: []',
    'related: []',
    '---',
  ].join('\n');

  // Build file content
  const content = `${frontmatter}

# ${question}

${answer}

## Sources Cited

${sources.map((s) => `- ${s}`).join('\n')}
`;

  // Write file
  await Bun.write(filePath, content);

  return {
    savedPath: filePath,
    relativePath: `queries/${filename}`,
  };
}

/**
 * Generate a filename slug from a question
 */
export function generateSlug(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

/**
 * Build output lines from a query execution
 */
export function buildQueryOutputLines(
  question: string,
  sources: string[],
  savedPath?: string,
): OutputLine[] {
  const now = Date.now();
  const lines: OutputLine[] = [
    { text: `Query: ${question}`, timestamp: now, kind: 'info' },
  ];

  if (sources.length > 0) {
    lines.push({ text: `Sources: ${sources.join(', ')}`, timestamp: now, kind: 'info' });
  }

  if (savedPath) {
    lines.push({ text: `Saved to: ${savedPath}`, timestamp: now, kind: 'success' });
  }

  return lines;
}
