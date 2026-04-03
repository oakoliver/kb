/**
 * Config loader with Zod validation
 * @module core/config
 */

import { ConfigSchema, createDefaultConfig, type Config, type LLMProvider } from './schemas';
import { getWikiPaths, type WikiPaths } from './resolver';
import { ZodError } from 'zod';

// =============================================================================
// Config Loading
// =============================================================================

/**
 * Load and validate config from a wiki root
 */
export async function loadConfig(wikiRoot: string): Promise<Config> {
  const paths = getWikiPaths(wikiRoot);
  return loadConfigFromPath(paths.configFile);
}

/**
 * Load and validate config from a specific path
 */
export async function loadConfigFromPath(configPath: string): Promise<Config> {
  const file = Bun.file(configPath);

  if (!(await file.exists())) {
    throw new ConfigNotFoundError(configPath);
  }

  try {
    const content = await file.text();
    const raw = JSON.parse(content);
    return ConfigSchema.parse(raw);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new ConfigParseError(configPath, `Invalid JSON: ${err.message}`);
    }
    if (err instanceof ZodError) {
      throw new ConfigValidationError(configPath, err);
    }
    throw err;
  }
}

/**
 * Check if config exists at the wiki root
 */
export async function configExists(wikiRoot: string): Promise<boolean> {
  const paths = getWikiPaths(wikiRoot);
  const file = Bun.file(paths.configFile);
  return await file.exists();
}

// =============================================================================
// Config Writing
// =============================================================================

/**
 * Save config to a wiki root
 */
export async function saveConfig(wikiRoot: string, config: Config): Promise<void> {
  const paths = getWikiPaths(wikiRoot);
  await saveConfigToPath(paths.configFile, config);
}

/**
 * Save config to a specific path
 */
export async function saveConfigToPath(configPath: string, config: Config): Promise<void> {
  // Validate before saving
  const validated = ConfigSchema.parse(config);
  const content = JSON.stringify(validated, null, 2);
  await Bun.write(configPath, content);
}

/**
 * Create and save a default config
 */
export async function createConfig(wikiRoot: string, provider?: LLMProvider): Promise<Config> {
  const config = createDefaultConfig(provider);
  await saveConfig(wikiRoot, config);
  return config;
}

// =============================================================================
// Environment Detection
// =============================================================================

/**
 * Detect which LLM provider to use based on available API keys
 */
export function detectProvider(): LLMProvider | null {
  if (process.env.ANTHROPIC_API_KEY) {
    return 'anthropic';
  }
  if (process.env.OPENAI_API_KEY) {
    return 'openai';
  }
  return null;
}

/**
 * Get the API key for a provider
 */
export function getApiKey(provider: LLMProvider): string | undefined {
  switch (provider) {
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY;
    case 'openai':
      return process.env.OPENAI_API_KEY;
  }
}

/**
 * Validate that the required API key is available
 */
export function validateApiKey(provider: LLMProvider): void {
  const key = getApiKey(provider);
  if (!key) {
    throw new MissingApiKeyError(provider);
  }
}

// =============================================================================
// Config Utilities
// =============================================================================

/**
 * Merge partial config updates with existing config
 */
export function mergeConfig(existing: Config, updates: Partial<Config>): Config {
  return {
    ...existing,
    ...updates,
    llm: {
      ...existing.llm,
      ...(updates.llm || {}),
    },
    wiki: {
      ...existing.wiki,
      ...(updates.wiki || {}),
    },
  };
}

/**
 * Get the model name with provider prefix for display
 */
export function getModelDisplay(config: Config): string {
  return `${config.llm.provider}/${config.llm.model}`;
}

// =============================================================================
// Instructions File
// =============================================================================

const DEFAULT_INSTRUCTIONS = `# Knowledge Base Instructions

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

/**
 * Create the default instructions file
 */
export async function createInstructionsFile(wikiRoot: string): Promise<void> {
  const paths = getWikiPaths(wikiRoot);
  await Bun.write(paths.instructions, DEFAULT_INSTRUCTIONS);
}

/**
 * Load instructions file content
 */
export async function loadInstructions(wikiRoot: string): Promise<string | null> {
  const paths = getWikiPaths(wikiRoot);
  const file = Bun.file(paths.instructions);

  if (!(await file.exists())) {
    return null;
  }

  return await file.text();
}

// =============================================================================
// Errors
// =============================================================================

export class ConfigNotFoundError extends Error {
  constructor(public path: string) {
    super(`Config file not found: ${path}`);
    this.name = 'ConfigNotFoundError';
  }
}

export class ConfigParseError extends Error {
  constructor(
    public path: string,
    public details: string
  ) {
    super(`Failed to parse config at ${path}: ${details}`);
    this.name = 'ConfigParseError';
  }
}

export class ConfigValidationError extends Error {
  public issues: Array<{ path: string; message: string }>;

  constructor(
    public path: string,
    zodError: ZodError
  ) {
    const issues = zodError.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    const details = issues.map((i) => `  - ${i.path}: ${i.message}`).join('\n');
    super(`Invalid config at ${path}:\n${details}`);
    this.name = 'ConfigValidationError';
    this.issues = issues;
  }
}

export class MissingApiKeyError extends Error {
  constructor(public provider: LLMProvider) {
    const envVar = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY';
    super(`Missing API key for ${provider}. Set the ${envVar} environment variable.`);
    this.name = 'MissingApiKeyError';
  }
}
