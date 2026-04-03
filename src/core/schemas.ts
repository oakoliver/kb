/**
 * Zod schemas for all data entities in the knowledge base
 * @module core/schemas
 */

import { z } from 'zod';

// =============================================================================
// Config Schema (.kb/config.json)
// =============================================================================

export const LLMProviderSchema = z.enum(['anthropic', 'openai']);

export const ConfigSchema = z.object({
  version: z.literal(1),
  llm: z.object({
    provider: LLMProviderSchema,
    model: z.string().default('claude-sonnet-4-20250514'),
  }),
  wiki: z.object({
    name: z.string().optional(),
    linkStyle: z.enum(['wikilink', 'markdown']).default('wikilink'),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;
export type LLMProvider = z.infer<typeof LLMProviderSchema>;

// =============================================================================
// Manifest Schema (raw/_manifest.json)
// =============================================================================

export const SourceTypeSchema = z.enum(['article', 'paper', 'code', 'media']);

export const ManifestEntrySchema = z.object({
  path: z.string(), // Relative path in raw/
  sourceUrl: z.string().url().optional(), // Original URL if from web
  title: z.string(), // Extracted or user-provided title
  dateAdded: z.string().datetime(), // ISO 8601 timestamp
  hash: z.string(), // SHA-256 of content for change detection
  type: SourceTypeSchema,
});

export const ManifestSchema = z.object({
  version: z.literal(1),
  entries: z.array(ManifestEntrySchema),
});

export type SourceType = z.infer<typeof SourceTypeSchema>;
export type ManifestEntry = z.infer<typeof ManifestEntrySchema>;
export type Manifest = z.infer<typeof ManifestSchema>;

// =============================================================================
// Article Frontmatter Schema (wiki/**/*.md)
// =============================================================================

export const ArticleTypeSchema = z.enum(['concept', 'entity', 'synthesis', 'query']);

export const FrontmatterSchema = z.object({
  title: z.string().min(1),
  type: ArticleTypeSchema,
  created: z.string().datetime(), // ISO 8601
  updated: z.string().datetime(), // ISO 8601
  sources: z.array(z.string()), // Paths to raw/ files
  related: z.array(z.string()), // Wikilinks to other articles
  tags: z.array(z.string()).optional(),
});

export type ArticleType = z.infer<typeof ArticleTypeSchema>;
export type Frontmatter = z.infer<typeof FrontmatterSchema>;

// =============================================================================
// Dependency Graph Schema (wiki/meta/graph.json)
// =============================================================================

export const GraphNodeSchema = z.object({
  dependsOn: z.array(z.string()), // Source paths this article depends on
  dependents: z.array(z.string()), // Articles that depend on this one
});

export const GraphSchema = z.object({
  version: z.literal(1),
  nodes: z.record(z.string(), GraphNodeSchema), // Key = article path
});

export type GraphNode = z.infer<typeof GraphNodeSchema>;
export type Graph = z.infer<typeof GraphSchema>;

// =============================================================================
// Default Values / Factories
// =============================================================================

/**
 * Create a default config object
 */
export function createDefaultConfig(provider: LLMProvider = 'anthropic'): Config {
  return {
    version: 1,
    llm: {
      provider,
      model: provider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4o',
    },
    wiki: {
      linkStyle: 'wikilink',
    },
  };
}

/**
 * Create an empty manifest
 */
export function createEmptyManifest(): Manifest {
  return {
    version: 1,
    entries: [],
  };
}

/**
 * Create an empty dependency graph
 */
export function createEmptyGraph(): Graph {
  return {
    version: 1,
    nodes: {},
  };
}

/**
 * Create a new manifest entry
 */
export function createManifestEntry(
  path: string,
  title: string,
  hash: string,
  type: SourceType,
  sourceUrl?: string
): ManifestEntry {
  return {
    path,
    title,
    hash,
    type,
    dateAdded: new Date().toISOString(),
    ...(sourceUrl && { sourceUrl }),
  };
}

/**
 * Create article frontmatter
 */
export function createFrontmatter(
  title: string,
  type: ArticleType,
  sources: string[] = [],
  related: string[] = [],
  tags?: string[]
): Frontmatter {
  const now = new Date().toISOString();
  return {
    title,
    type,
    created: now,
    updated: now,
    sources,
    related,
    ...(tags && { tags }),
  };
}
