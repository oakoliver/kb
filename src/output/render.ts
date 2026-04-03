/**
 * Markdown rendering utilities using @oakoliver/glamour
 * @module output/render
 */

import { render as glamourRender, renderWithStyle, DarkStyleName, LightStyleName } from '@oakoliver/glamour';
import { isTTY } from './format';

// =============================================================================
// Theme Detection
// =============================================================================

/**
 * Detect if terminal is using a dark theme
 * Uses COLORFGBG environment variable as a heuristic
 */
export function isDarkTheme(): boolean {
  const colorFgBg = process.env.COLORFGBG;
  if (colorFgBg) {
    // COLORFGBG format is "fg;bg" where higher bg values indicate dark theme
    const parts = colorFgBg.split(';');
    if (parts.length >= 2) {
      const bg = parseInt(parts[1], 10);
      // Dark backgrounds typically have low values (0-7)
      return bg <= 7;
    }
  }
  // Default to dark theme (more common for terminal users)
  return true;
}

/**
 * Get the appropriate style name based on terminal settings
 */
export function getStyleName(): string {
  return isDarkTheme() ? DarkStyleName : LightStyleName;
}

// =============================================================================
// Render Functions
// =============================================================================

/**
 * Render markdown to styled terminal output
 * In non-TTY mode, returns the raw markdown
 */
export function renderMarkdown(markdown: string): string {
  if (!isTTY) {
    return markdown;
  }

  try {
    return renderWithStyle(markdown, getStyleName());
  } catch {
    // Fallback to basic render if style fails
    return glamourRender(markdown);
  }
}

/**
 * Render markdown and output to stdout
 */
export function printMarkdown(markdown: string): void {
  console.log(renderMarkdown(markdown));
}

/**
 * Render a code block with syntax highlighting
 */
export function renderCode(code: string, language = ''): string {
  const markdown = '```' + language + '\n' + code + '\n```';
  return renderMarkdown(markdown);
}

/**
 * Render a simple list
 */
export function renderList(items: string[]): string {
  const markdown = items.map((item) => `- ${item}`).join('\n');
  return renderMarkdown(markdown);
}

/**
 * Render a blockquote
 */
export function renderQuote(text: string): string {
  const lines = text.split('\n');
  const markdown = lines.map((line) => `> ${line}`).join('\n');
  return renderMarkdown(markdown);
}

/**
 * Render a heading
 */
export function renderHeading(text: string, level: 1 | 2 | 3 | 4 | 5 | 6 = 1): string {
  const prefix = '#'.repeat(level);
  return renderMarkdown(`${prefix} ${text}`);
}

/**
 * Render a horizontal rule
 */
export function renderHr(): string {
  return renderMarkdown('---');
}

// =============================================================================
// Snippet Extraction
// =============================================================================

/**
 * Extract a snippet from text around a search term
 */
export function extractSnippet(text: string, searchTerm: string, maxLength = 150): string {
  const lowerText = text.toLowerCase();
  const lowerTerm = searchTerm.toLowerCase();
  const index = lowerText.indexOf(lowerTerm);

  if (index === -1) {
    // Term not found, return beginning of text
    return text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text;
  }

  // Calculate window around the term
  const termLength = searchTerm.length;
  const contextLength = Math.floor((maxLength - termLength) / 2);

  let start = Math.max(0, index - contextLength);
  let end = Math.min(text.length, index + termLength + contextLength);

  // Adjust to word boundaries
  if (start > 0) {
    const spaceIndex = text.indexOf(' ', start);
    if (spaceIndex !== -1 && spaceIndex < index) {
      start = spaceIndex + 1;
    }
  }

  if (end < text.length) {
    const spaceIndex = text.lastIndexOf(' ', end);
    if (spaceIndex > index + termLength) {
      end = spaceIndex;
    }
  }

  let snippet = text.slice(start, end);

  // Add ellipsis
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';

  return snippet;
}

// =============================================================================
// Wikilink Formatting
// =============================================================================

/**
 * Format a title as a wikilink
 */
export function formatWikilink(title: string): string {
  return `[[${title}]]`;
}

/**
 * Format a list of wikilinks
 */
export function formatWikilinks(titles: string[]): string {
  return titles.map(formatWikilink).join(', ');
}

/**
 * Parse wikilinks from text and return array of link targets
 */
export function parseWikilinks(text: string): string[] {
  const regex = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    links.push(match[1]);
  }

  return links;
}
