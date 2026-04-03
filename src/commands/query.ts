/**
 * kb query command - Ask a question with LLM synthesis
 * @module commands/query
 */

import { join } from 'path';
import { mkdir } from 'fs/promises';
import { resolveWikiRoot, getWikiPaths } from '../core/resolver';
import { loadConfig, getApiKey } from '../core/config';
import { searchRelevantContent } from '../index/pageindex';
import { createProviderFromEnv } from '../llm/provider';
import { streamResponse } from '../llm/stream';
import { questionAnswerPrompt, SYSTEM_PROMPT_QA } from '../llm/prompts';
import { createFrontmatter, type Frontmatter } from '../core/schemas';
import { serializeFrontmatter, extractWikilinks, titleToSlug } from '../core/markdown';
import { output, error as outputError, isTTY, styles, symbols } from '../output/format';
import type { CommandContext } from '../cli';

// =============================================================================
// Types
// =============================================================================

export interface QueryResult {
  answer: string;
  sources: string[];
  saved_to?: string;
}

export interface QueryOptions {
  noFile: boolean;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Ask a question and get an LLM-synthesized answer
 */
export async function query(ctx: CommandContext): Promise<number> {
  // Get question from positionals
  const question = ctx.positionals.join(' ').trim();

  if (!question) {
    outputError('Missing question.', "Usage: kb query <question> [--no-file]");
    return 1;
  }

  // Parse options
  const options: QueryOptions = {
    noFile: ctx.flags['no-file'] === true,
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

  // Check for API key
  const apiKey = getApiKey(config.llm.provider);
  if (!apiKey) {
    outputError(
      `Missing API key for ${config.llm.provider}`,
      `Set the ${config.llm.provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'} environment variable.`
    );
    return 1;
  }

  // Search for relevant content
  const relevantContent = await searchRelevantContent(paths.wiki, question, { limit: 5 });

  if (relevantContent.length === 0) {
    outputError('No relevant articles found.', 'Make sure you have compiled wiki articles with `kb compile`.');
    return 1;
  }

  // Create LLM provider
  const provider = createProviderFromEnv(config.llm.provider, config.llm.model);

  // Build context from relevant articles
  const articles = relevantContent.map((r) => ({
    title: r.title,
    content: r.content,
  }));

  // Generate the prompt
  const prompt = questionAnswerPrompt(question, articles);

  // Stream the response
  if (isTTY) {
    console.log(styles.dim.render('Thinking...'));
    console.log('');
  }

  const { content: answer } = await streamResponse(
    provider,
    {
      messages: [{ role: 'user', content: prompt }],
      systemPrompt: SYSTEM_PROMPT_QA,
      maxTokens: 2000,
      temperature: 0.5,
    },
    { print: isTTY }
  );

  // Extract sources from answer (wikilinks)
  const sources = relevantContent.map((r) => r.path);

  // Save to file unless --no-file
  let savedTo: string | undefined;
  if (!options.noFile) {
    savedTo = await saveQueryOutput(paths.queries, question, answer, sources);

    if (isTTY && savedTo) {
      console.log('');
      console.log(styles.dim.render('---'));
      console.log(
        `${styles.dim.render('Sources:')} ${relevantContent.map((r) => `[[${r.title}]]`).join(', ')}`
      );
      console.log(`${styles.dim.render('Saved to:')} ${styles.path.render(savedTo)}`);
    }
  } else if (isTTY) {
    console.log('');
    console.log(styles.dim.render('---'));
    console.log(
      `${styles.dim.render('Sources:')} ${relevantContent.map((r) => `[[${r.title}]]`).join(', ')}`
    );
  }

  // Output JSON result
  const result: QueryResult = {
    answer,
    sources,
    ...(savedTo && { saved_to: savedTo }),
  };

  if (!isTTY) {
    output(result);
  }

  return 0;
}

// =============================================================================
// Query Output File
// =============================================================================

/**
 * Save query output to a file
 */
async function saveQueryOutput(
  queriesDir: string,
  question: string,
  answer: string,
  sources: string[]
): Promise<string> {
  // Ensure queries directory exists
  await mkdir(queriesDir, { recursive: true });

  // Generate filename: YYYY-MM-DD-slug.md
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0];
  const slug = generateSlug(question);
  const filename = `${dateStr}-${slug}.md`;
  const filePath = join(queriesDir, filename);

  // Create frontmatter
  const frontmatter: Frontmatter = {
    title: question,
    type: 'query',
    created: date.toISOString(),
    updated: date.toISOString(),
    sources: [],
    related: extractWikilinks(answer),
  };

  // Build file content
  const content = `${serializeFrontmatter(frontmatter)}

# ${question}

${answer}

## Sources Cited

${sources.map((s) => `- ${s}`).join('\n')}
`;

  // Write file
  await Bun.write(filePath, content);

  return `queries/${filename}`;
}

/**
 * Generate a slug from a question
 */
function generateSlug(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

export default query;
