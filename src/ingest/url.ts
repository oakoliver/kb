/**
 * URL ingestion handler - fetches web pages and converts to markdown
 * @module ingest/url
 */

import { join } from 'path';
import { mkdir } from 'fs/promises';
import { computeHash } from '../core/manifest';
import { createManifestEntry, type SourceType, type ManifestEntry } from '../core/schemas';

// =============================================================================
// Types
// =============================================================================

export interface IngestUrlResult {
  entry: ManifestEntry;
  content: string;
}

export interface IngestUrlOptions {
  title?: string;
  type?: SourceType;
}

// =============================================================================
// URL Detection
// =============================================================================

/**
 * Check if a string is a valid URL
 */
export function isUrl(source: string): boolean {
  try {
    const url = new URL(source);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Check if URL points to a PDF
 */
export function isPdfUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.pathname.toLowerCase().endsWith('.pdf');
  } catch {
    return false;
  }
}

/**
 * Check if URL is a git repository
 */
export function isGitUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    // Check common git hosts
    if (host === 'github.com' || host === 'gitlab.com' || host === 'bitbucket.org') {
      // Check if it looks like a repo path (user/repo)
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      return pathParts.length >= 2;
    }

    // Check for .git suffix
    return parsed.pathname.endsWith('.git');
  } catch {
    return false;
  }
}

/**
 * Detect source type from URL
 */
export function detectUrlType(url: string): SourceType {
  if (isPdfUrl(url)) {
    return 'paper';
  }
  if (isGitUrl(url)) {
    return 'code';
  }
  return 'article';
}

// =============================================================================
// HTML to Markdown Conversion
// =============================================================================

/**
 * Simple HTML to Markdown converter
 * Note: This is a basic implementation. For production, consider using a library.
 */
export function htmlToMarkdown(html: string): string {
  let md = html;

  // Remove scripts and styles
  md = md.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  md = md.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove comments
  md = md.replace(/<!--[\s\S]*?-->/g, '');

  // Convert headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n');
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n##### $1\n');
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n###### $1\n');

  // Convert paragraphs
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n');

  // Convert line breaks
  md = md.replace(/<br\s*\/?>/gi, '\n');

  // Convert bold
  md = md.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');

  // Convert italic
  md = md.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');

  // Convert links
  md = md.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

  // Convert images
  md = md.replace(/<img[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi, '![$2]($1)');
  md = md.replace(/<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']*)["'][^>]*\/?>/gi, '![$1]($2)');
  md = md.replace(/<img[^>]*src=["']([^"']*)["'][^>]*\/?>/gi, '![]($1)');

  // Convert unordered lists
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
    return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
  });

  // Convert ordered lists
  let listIndex = 0;
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
    listIndex = 0;
    return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, () => {
      listIndex++;
      return `${listIndex}. $1\n`;
    });
  });

  // Convert code blocks
  md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n');
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '\n```\n$1\n```\n');

  // Convert inline code
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  // Convert blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (match, content) => {
    return content
      .split('\n')
      .map((line: string) => `> ${line}`)
      .join('\n');
  });

  // Convert horizontal rules
  md = md.replace(/<hr\s*\/?>/gi, '\n---\n');

  // Remove remaining HTML tags
  md = md.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  md = md.replace(/&nbsp;/g, ' ');
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");

  // Clean up whitespace
  md = md.replace(/\n{3,}/g, '\n\n');
  md = md.trim();

  return md;
}

/**
 * Extract title from HTML
 */
export function extractTitleFromHtml(html: string): string | null {
  // Try <title> tag
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    return titleMatch[1].trim();
  }

  // Try <h1> tag
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    // Strip HTML tags from h1 content
    return h1Match[1].replace(/<[^>]+>/g, '').trim();
  }

  // Try og:title meta tag
  const ogMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  if (ogMatch) {
    return ogMatch[1].trim();
  }

  return null;
}

/**
 * Generate a safe filename from URL
 */
export function filenameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;

    // Use last path segment
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1];
      // Remove file extension if present
      const name = lastSegment.replace(/\.[^.]+$/, '');
      if (name) {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.md';
      }
    }

    // Fallback to hostname
    return parsed.hostname.replace(/[^a-z0-9]+/g, '-') + '.md';
  } catch {
    return 'untitled.md';
  }
}

// =============================================================================
// URL Ingestion
// =============================================================================

/**
 * Ingest a URL into the knowledge base
 */
export async function ingestUrl(
  url: string,
  rawDir: string,
  options?: IngestUrlOptions
): Promise<IngestUrlResult> {
  // Fetch the URL
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'kb/0.1.0 (Knowledge Base CLI)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new FetchError(url, response.status, response.statusText);
  }

  const contentType = response.headers.get('content-type') || '';
  const html = await response.text();

  // Convert to markdown
  const markdown = htmlToMarkdown(html);

  // Detect type and title
  const type = options?.type || detectUrlType(url);
  const title = options?.title || extractTitleFromHtml(html) || filenameFromUrl(url).replace('.md', '');
  const filename = filenameFromUrl(url);

  // Determine target directory based on type
  const typeDir = type === 'paper' ? 'papers' : type === 'code' ? 'code' : 'articles';
  const targetDir = join(rawDir, typeDir);
  const targetPath = join(targetDir, filename);
  const relativePath = `${typeDir}/${filename}`;

  // Create target directory
  await mkdir(targetDir, { recursive: true });

  // Add source URL to top of markdown
  const contentWithSource = `---\nsource: ${url}\n---\n\n${markdown}`;

  // Compute hash
  const hash = await computeHash(contentWithSource);

  // Write file
  await Bun.write(targetPath, contentWithSource);

  // Create manifest entry
  const entry = createManifestEntry(relativePath, title, hash, type, url);

  return { entry, content: contentWithSource };
}

// =============================================================================
// Errors
// =============================================================================

export class FetchError extends Error {
  constructor(
    public url: string,
    public statusCode: number,
    public statusText: string
  ) {
    super(`Failed to fetch ${url}: ${statusCode} ${statusText}`);
    this.name = 'FetchError';
  }
}
