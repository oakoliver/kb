/**
 * Document loader and renderer with glamour integration
 * @module tui/document
 */

import { renderWithStyle, TermRenderer, withStandardStyle, withWordWrap } from '@oakoliver/glamour';
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
    if (titleMatch) title = unquoteYamlScalar(titleMatch[1].trim());

    const typeMatch = line.match(/^type:\s*(.+)$/);
    if (typeMatch) type = unquoteYamlScalar(typeMatch[1].trim());
  }

  return { title, body, type };
}

/** Strip YAML quotes; kb writes titles as `"..."` with `\"` escapes. */
function unquoteYamlScalar(value: string): string {
  const double = value.match(/^"(.*)"$/);
  if (double) return double[1].replace(/\\"/g, '"');
  const single = value.match(/^'(.*)'$/);
  if (single) return single[1].replace(/''/g, "'");
  return value;
}

// =============================================================================
// Document Loading
// =============================================================================

/**
 * Load and render a markdown document from the wiki
 */
export async function loadDocument(filePath: string, width?: number): Promise<OpenDocument> {
  const raw = await readFile(filePath, 'utf-8');
  const { title, body, type } = parseFrontmatterSimple(raw);

  // Render markdown with glamour, wrapped to the editor pane when known
  const renderedContent = renderDocumentContent(body, width);

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

/** Narrowest width documents are wrapped to; narrower panes clip instead. */
const MIN_WRAP_WIDTH = 20;

/**
 * Render document markdown, word-wrapped to `width` cells when given.
 */
export function renderDocumentContent(body: string, width?: number): string {
  if (!width || width <= 0) return renderWithStyle(body, 'dark');
  const renderer = new TermRenderer(
    withStandardStyle('dark'),
    withWordWrap(Math.max(MIN_WRAP_WIDTH, width)),
  );
  return renderer.render(body);
}
