/**
 * kb init command - Initialize a new knowledge base
 * @module commands/init
 */

import { join, resolve } from 'path';
import { homedir } from 'os';
import { mkdir } from 'fs/promises';
import {
  createDefaultConfig,
  createEmptyManifest,
  createEmptyGraph,
  type Config,
} from '../core/schemas';
import { saveConfig, createInstructionsFile, detectProvider } from '../core/config';
import {
  KB_CONFIG_DIR,
  GLOBAL_KB_PATH,
  getWikiPaths,
  isWikiRoot,
  WikiAlreadyExistsError,
} from '../core/resolver';
import { output, success, error as outputError, pathOutput, isTTY, styles, symbols } from '../output/format';
import type { CommandContext } from '../cli';

// =============================================================================
// Types
// =============================================================================

export interface InitResult {
  path: string;
  created: string[];
  isGlobal: boolean;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Initialize a new knowledge base
 */
export async function init(ctx: CommandContext): Promise<number> {
  const isGlobal = ctx.flags.global === true;
  const targetName = ctx.positionals[0] || 'kb';

  // Determine target path
  let targetPath: string;
  if (isGlobal) {
    targetPath = GLOBAL_KB_PATH;
  } else {
    targetPath = resolve(process.cwd(), targetName);
  }

  // Check if wiki already exists
  if (await isWikiRoot(targetPath)) {
    outputError(`A knowledge base already exists at: ${targetPath}`);
    return 1;
  }

  // For global wiki, the structure is slightly different
  // ~/.kb/ IS the config directory, not a parent containing .kb/
  if (isGlobal) {
    return initGlobalWiki(targetPath);
  }

  return initLocalWiki(targetPath);
}

/**
 * Initialize a local wiki with standard structure
 */
async function initLocalWiki(targetPath: string): Promise<number> {
  const paths = getWikiPaths(targetPath);
  const created: string[] = [];

  try {
    // Create directory structure
    await mkdir(paths.config, { recursive: true });
    created.push('.kb');

    await mkdir(paths.raw, { recursive: true });
    created.push('raw');

    await mkdir(join(paths.wiki, 'concepts'), { recursive: true });
    await mkdir(join(paths.wiki, 'entities'), { recursive: true });
    await mkdir(join(paths.wiki, 'syntheses'), { recursive: true });
    await mkdir(paths.meta, { recursive: true });
    created.push('wiki');

    await mkdir(paths.queries, { recursive: true });
    created.push('queries');

    // Create config file
    const provider = detectProvider() || 'anthropic';
    const config = createDefaultConfig(provider);
    await saveConfig(targetPath, config);

    // Create instructions file
    await createInstructionsFile(targetPath);

    // Create empty manifest
    const manifest = createEmptyManifest();
    await Bun.write(paths.manifest, JSON.stringify(manifest, null, 2));

    // Create empty graph
    const graph = createEmptyGraph();
    await Bun.write(paths.graph, JSON.stringify(graph, null, 2));

    // Create empty index
    await Bun.write(paths.index, '# Index\n\n_No articles yet. Run `kb compile` after ingesting sources._\n');

    // Output result
    const result: InitResult = {
      path: targetPath,
      created,
      isGlobal: false,
    };

    output(result, () => formatInitOutput(result));

    return 0;
  } catch (err) {
    outputError(`Failed to initialize knowledge base: ${(err as Error).message}`);
    return 1;
  }
}

/**
 * Initialize a global wiki at ~/.kb/
 */
async function initGlobalWiki(targetPath: string): Promise<number> {
  const created: string[] = [];

  try {
    // For global wiki, targetPath IS the .kb directory
    await mkdir(targetPath, { recursive: true });

    // Create subdirectories inside ~/.kb/
    await mkdir(join(targetPath, 'raw'), { recursive: true });
    created.push('raw');

    await mkdir(join(targetPath, 'wiki', 'concepts'), { recursive: true });
    await mkdir(join(targetPath, 'wiki', 'entities'), { recursive: true });
    await mkdir(join(targetPath, 'wiki', 'syntheses'), { recursive: true });
    await mkdir(join(targetPath, 'wiki', 'meta'), { recursive: true });
    created.push('wiki');

    await mkdir(join(targetPath, 'queries'), { recursive: true });
    created.push('queries');

    // Create config file directly in ~/.kb/
    const provider = detectProvider() || 'anthropic';
    const config = createDefaultConfig(provider);
    const configPath = join(targetPath, 'config.json');
    await Bun.write(configPath, JSON.stringify(config, null, 2));
    created.push('config.json');

    // Create instructions file
    const instructionsPath = join(targetPath, 'instructions.md');
    await Bun.write(instructionsPath, getInstructionsContent());

    // Create empty manifest
    const manifest = createEmptyManifest();
    await Bun.write(join(targetPath, 'raw', '_manifest.json'), JSON.stringify(manifest, null, 2));

    // Create empty graph
    const graph = createEmptyGraph();
    await Bun.write(join(targetPath, 'wiki', 'meta', 'graph.json'), JSON.stringify(graph, null, 2));

    // Create empty index
    await Bun.write(
      join(targetPath, 'wiki', '_index.md'),
      '# Index\n\n_No articles yet. Run `kb compile` after ingesting sources._\n'
    );

    // Output result
    const result: InitResult = {
      path: targetPath,
      created,
      isGlobal: true,
    };

    output(result, () => formatInitOutput(result));

    return 0;
  } catch (err) {
    outputError(`Failed to initialize global knowledge base: ${(err as Error).message}`);
    return 1;
  }
}

/**
 * Format human-readable output for init command
 */
function formatInitOutput(result: InitResult): string {
  const lines: string[] = [];

  lines.push(
    styles.success.render(`${symbols.success} Knowledge base initialized at ${result.path}`)
  );
  lines.push('');
  lines.push('Created:');

  if (result.isGlobal) {
    lines.push(`  ${styles.path.render('raw/')}           Source documents`);
    lines.push(`  ${styles.path.render('wiki/')}          Compiled articles`);
    lines.push(`  ${styles.path.render('queries/')}       Query outputs`);
    lines.push(`  ${styles.path.render('config.json')}    Configuration`);
  } else {
    lines.push(`  ${styles.path.render('raw/')}           Source documents`);
    lines.push(`  ${styles.path.render('wiki/')}          Compiled articles`);
    lines.push(`  ${styles.path.render('queries/')}       Query outputs`);
    lines.push(`  ${styles.path.render('.kb/config.json')} Configuration`);
  }

  return lines.join('\n');
}

/**
 * Get instructions file content
 */
function getInstructionsContent(): string {
  return `# Knowledge Base Instructions

This file contains custom instructions for the LLM when compiling your knowledge base.

## Writing Style

Describe your preferred writing style for wiki articles:

- Tone: [formal/informal/academic/conversational]
- Audience: [technical/general/expert]
- Length preference: [concise/detailed]

## Domain Context

Provide context about the domain of your knowledge base:

- Main topics covered
- Key terminology
- Important concepts to emphasize

## Custom Rules

Add any specific rules for article generation:

1. Always include practical examples
2. Link related concepts using wikilinks
3. Include citations to source material

---

Edit this file to customize how the LLM processes and compiles your sources.
`;
}

export default init;
