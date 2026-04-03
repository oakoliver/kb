/**
 * Markdown utilities for frontmatter parsing and wikilink extraction
 * @module core/markdown
 */

import { FrontmatterSchema, type Frontmatter, type ArticleType } from './schemas';
import { ZodError } from 'zod';

// =============================================================================
// Frontmatter Parsing
// =============================================================================

/**
 * Parse YAML frontmatter from markdown content
 * Returns the frontmatter object and the body content
 */
export function parseFrontmatter(content: string): { frontmatter: Frontmatter | null; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    return { frontmatter: null, body: content };
  }

  const yamlContent = match[1];
  const body = match[2];

  try {
    const parsed = parseYaml(yamlContent);
    const frontmatter = FrontmatterSchema.parse(parsed);
    return { frontmatter, body };
  } catch (err) {
    if (err instanceof ZodError) {
      throw new FrontmatterValidationError(err);
    }
    throw new FrontmatterParseError(`Invalid YAML: ${(err as Error).message}`);
  }
}

/**
 * Simple YAML parser for frontmatter
 * Handles basic key-value pairs and arrays
 */
function parseYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split('\n');
  let currentKey: string | null = null;
  let currentArray: string[] | null = null;

  for (const line of lines) {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) continue;

    // Check for array item
    if (line.match(/^\s+-\s/)) {
      if (currentKey && currentArray) {
        const value = line.replace(/^\s+-\s*/, '').trim();
        // Remove quotes if present
        currentArray.push(value.replace(/^["'](.*)["']$/, '$1'));
      }
      continue;
    }

    // Check for key-value pair
    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      // Save previous array if exists
      if (currentKey && currentArray) {
        result[currentKey] = currentArray;
        currentArray = null;
      }

      const key = kvMatch[1];
      const value = kvMatch[2].trim();

      if (value === '' || value === '[]') {
        // Empty array, start collecting
        currentKey = key;
        currentArray = [];
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // Inline array
        const items = value
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^["'](.*)["']$/, '$1'))
          .filter(Boolean);
        result[key] = items;
        currentKey = null;
      } else {
        // Simple value
        result[key] = value.replace(/^["'](.*)["']$/, '$1');
        currentKey = key;
        currentArray = null;
      }
    }
  }

  // Save final array if exists
  if (currentKey && currentArray) {
    result[currentKey] = currentArray;
  }

  return result;
}

/**
 * Serialize frontmatter to YAML string
 */
export function serializeFrontmatter(frontmatter: Frontmatter): string {
  const lines: string[] = ['---'];

  lines.push(`title: "${escapeYamlString(frontmatter.title)}"`);
  lines.push(`type: ${frontmatter.type}`);
  lines.push(`created: ${frontmatter.created}`);
  lines.push(`updated: ${frontmatter.updated}`);

  // Sources array
  if (frontmatter.sources.length > 0) {
    lines.push('sources:');
    for (const source of frontmatter.sources) {
      lines.push(`  - ${source}`);
    }
  } else {
    lines.push('sources: []');
  }

  // Related array
  if (frontmatter.related.length > 0) {
    lines.push('related:');
    for (const related of frontmatter.related) {
      lines.push(`  - "${escapeYamlString(related)}"`);
    }
  } else {
    lines.push('related: []');
  }

  // Tags (optional)
  if (frontmatter.tags && frontmatter.tags.length > 0) {
    lines.push('tags:');
    for (const tag of frontmatter.tags) {
      lines.push(`  - ${tag}`);
    }
  }

  lines.push('---');
  return lines.join('\n');
}

/**
 * Escape special characters in YAML strings
 */
function escapeYamlString(str: string): string {
  return str.replace(/"/g, '\\"');
}

/**
 * Create a complete markdown article with frontmatter
 */
export function createArticle(frontmatter: Frontmatter, body: string): string {
  const fm = serializeFrontmatter(frontmatter);
  return `${fm}\n\n${body}`;
}

/**
 * Update frontmatter in existing article
 */
export function updateArticleFrontmatter(content: string, updates: Partial<Frontmatter>): string {
  const { frontmatter, body } = parseFrontmatter(content);

  if (!frontmatter) {
    throw new Error('Article has no frontmatter');
  }

  const updated: Frontmatter = {
    ...frontmatter,
    ...updates,
    updated: new Date().toISOString(),
  };

  return createArticle(updated, body);
}

// =============================================================================
// Wikilink Extraction
// =============================================================================

/**
 * Extract all wikilinks from markdown content
 * Returns array of link targets (without [[ ]])
 */
export function extractWikilinks(content: string): string[] {
  const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  const links: string[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    const target = match[1].trim();
    if (!links.includes(target)) {
      links.push(target);
    }
  }

  return links;
}

/**
 * Convert a title to a wikilink
 */
export function toWikilink(title: string, displayText?: string): string {
  if (displayText && displayText !== title) {
    return `[[${title}|${displayText}]]`;
  }
  return `[[${title}]]`;
}

/**
 * Convert title to a filename-safe slug
 */
export function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Convert a slug back to title case
 */
export function slugToTitle(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Get the expected file path for an article
 */
export function getArticlePath(title: string, type: ArticleType): string {
  const slug = titleToSlug(title);
  const dir = getArticleDir(type);
  return `wiki/${dir}/${slug}.md`;
}

/**
 * Get the directory for an article type
 */
export function getArticleDir(type: ArticleType): string {
  switch (type) {
    case 'concept':
      return 'concepts';
    case 'entity':
      return 'entities';
    case 'synthesis':
      return 'syntheses';
    case 'query':
      return 'queries';
  }
}

// =============================================================================
// Content Utilities
// =============================================================================

/**
 * Extract the first heading from markdown content
 */
export function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

/**
 * Extract a summary from markdown content (first paragraph)
 */
export function extractSummary(content: string, maxLength = 200): string {
  // Remove frontmatter
  const { body } = parseFrontmatter(content);

  // Remove headings
  const withoutHeadings = body.replace(/^#+\s+.+$/gm, '');

  // Get first paragraph
  const paragraphs = withoutHeadings.split(/\n\n+/).filter((p) => p.trim());
  const firstParagraph = paragraphs[0] || '';

  // Clean and truncate
  const cleaned = firstParagraph.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  // Truncate at word boundary
  const truncated = cleaned.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return truncated.slice(0, lastSpace) + '...';
}

/**
 * Count words in markdown content (excluding frontmatter)
 */
export function countWords(content: string): number {
  const { body } = parseFrontmatter(content);
  const words = body.split(/\s+/).filter((w) => w.trim());
  return words.length;
}

// =============================================================================
// Errors
// =============================================================================

export class FrontmatterParseError extends Error {
  constructor(message: string) {
    super(`Frontmatter parse error: ${message}`);
    this.name = 'FrontmatterParseError';
  }
}

export class FrontmatterValidationError extends Error {
  public issues: Array<{ path: string; message: string }>;

  constructor(zodError: ZodError) {
    const issues = zodError.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    const details = issues.map((i) => `  - ${i.path}: ${i.message}`).join('\n');
    super(`Invalid frontmatter:\n${details}`);
    this.name = 'FrontmatterValidationError';
    this.issues = issues;
  }
}
