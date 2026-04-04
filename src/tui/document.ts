/**
 * Document loader and renderer with glamour integration
 * @module tui/document
 */

import { renderWithStyle } from '@oakoliver/glamour';
import { readFile } from 'fs/promises';
import { join, basename } from 'path';
import type { OpenDocument, LinkPosition } from './state';
import { extractWikilinks } from './link-map';

// =============================================================================
// Frontmatter Parsing
// =============================================================================

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;

/**
 * Parse YAML frontmatter from markdown content
 * Returns the title and body separately
 */
export function parseFrontmatterSimple(content: string): { title: string; body: string; type?: string } {
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    return { title: '', body: content };
  }

  const yaml = match[1];
  const body = content.slice(match[0].length);

  // Simple YAML parsing for title and type fields
  let title = '';
  let type: string | undefined;

  for (const line of yaml.split('\n')) {
    const titleMatch = line.match(/^title:\s*(.+)$/);
    if (titleMatch) title = titleMatch[1].trim();

    const typeMatch = line.match(/^type:\s*(.+)$/);
    if (typeMatch) type = typeMatch[1].trim();
  }

  return { title, body, type };
}

// =============================================================================
// Document Loading
// =============================================================================

/**
 * Load and render a markdown document from the wiki
 */
export async function loadDocument(filePath: string): Promise<OpenDocument> {
  const raw = await readFile(filePath, 'utf-8');
  const { title, body, type } = parseFrontmatterSimple(raw);

  // Render markdown with glamour
  const renderedContent = renderWithStyle(body, 'dark');

  // Extract wikilinks for navigation
  const links = extractWikilinks(body);

  return {
    path: filePath,
    title: title || basename(filePath, '.md'),
    content: raw,
    renderedContent,
    links,
    scrollY: 0,
    focusedLinkIndex: -1,
  };
}

/**
 * Re-render document content with a specific width
 */
export function renderDocumentContent(body: string, _width?: number): string {
  return renderWithStyle(body, 'dark');
}
