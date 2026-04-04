/**
 * Wikilink parser and coordinate calculator for keyboard/mouse link navigation
 * @module tui/link-map
 */

import type { LinkPosition } from './state';

// =============================================================================
// Wikilink Extraction
// =============================================================================

/**
 * Regex to match [[wikilinks]] with optional display text [[target|display]]
 */
const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/**
 * Extract all wikilinks from markdown content and compute their positions
 * within the raw (pre-render) text. Positions are line-based (0-indexed).
 */
export function extractWikilinks(content: string): LinkPosition[] {
  const links: LinkPosition[] = [];
  const lines = content.split('\n');

  for (let row = 0; row < lines.length; row++) {
    const line = lines[row];
    let match: RegExpExecArray | null;

    // Reset regex for each line
    const re = new RegExp(WIKILINK_RE.source, 'g');

    while ((match = re.exec(line)) !== null) {
      const target = match[1].trim();
      const displayText = match[2]?.trim() || target;
      const colStart = match.index;
      const colEnd = match.index + match[0].length;

      links.push({
        target,
        row,
        colStart,
        colEnd,
        displayText,
      });
    }
  }

  return links;
}

/**
 * Find a link at a specific row and column position
 * Used for mouse click detection
 */
export function findLinkAt(links: LinkPosition[], row: number, col: number): LinkPosition | null {
  for (const link of links) {
    if (link.row === row && col >= link.colStart && col < link.colEnd) {
      return link;
    }
  }
  return null;
}

/**
 * Get the next link index after the current one (wraps around)
 */
export function nextLinkIndex(links: LinkPosition[], currentIndex: number): number {
  if (links.length === 0) return -1;
  if (currentIndex < 0 || currentIndex >= links.length - 1) return 0;
  return currentIndex + 1;
}

/**
 * Get the previous link index before the current one (wraps around)
 */
export function prevLinkIndex(links: LinkPosition[], currentIndex: number): number {
  if (links.length === 0) return -1;
  if (currentIndex <= 0) return links.length - 1;
  return currentIndex - 1;
}

/**
 * Resolve a wikilink target to a file path within the wiki directory
 * Searches concepts/, entities/, syntheses/ for matching files
 */
export function resolveWikilinkPath(target: string, wikiDir: string): string | null {
  // Normalize the target to a filename
  const slug = target.toLowerCase().replace(/\s+/g, '-');
  const filename = `${slug}.md`;

  // Search directories in priority order
  const searchDirs = ['concepts', 'entities', 'syntheses'];

  for (const dir of searchDirs) {
    const candidate = `${wikiDir}/${dir}/${filename}`;
    // We return the candidate path - the caller should verify existence
    return candidate;
  }

  return null;
}

/**
 * Build a map from wikilink target names to file paths
 * This is used for efficient lookup during navigation
 */
export function buildLinkTargetMap(
  articlePaths: string[],
): Map<string, string> {
  const map = new Map<string, string>();

  for (const path of articlePaths) {
    // Extract filename without extension, convert to display name
    const parts = path.split('/');
    const filename = parts[parts.length - 1];
    const nameWithoutExt = filename.replace(/\.md$/, '');
    const displayName = nameWithoutExt
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    map.set(displayName, path);
  }

  return map;
}
