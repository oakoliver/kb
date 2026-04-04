/**
 * Workspace operations adapter - bridges TUI with existing kb core services
 * @module tui/operations/workspace
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join, relative, basename } from 'path';
import type { WikiPaths } from '../../core/resolver';
import type { WorkspaceSnapshot, ExplorerItem, StatusBarState } from '../state';

// =============================================================================
// Workspace Snapshot
// =============================================================================

/**
 * Load a workspace snapshot (source count, article count, query count, etc.)
 */
export async function loadWorkspaceSnapshot(
  wikiRoot: string,
  paths: WikiPaths,
): Promise<WorkspaceSnapshot> {
  const name = basename(wikiRoot);

  // Count sources from manifest
  let sourceCount = 0;
  try {
    const manifestRaw = await readFile(paths.manifest, 'utf-8');
    const manifest = JSON.parse(manifestRaw);
    sourceCount = manifest.entries?.length ?? 0;
  } catch {
    // No manifest or invalid
  }

  // Count articles
  let articleCount = 0;
  try {
    articleCount = await countMarkdownFiles(paths.wiki);
  } catch {
    // No wiki dir
  }

  // Count queries
  let queryCount = 0;
  try {
    const entries = await readdir(paths.queries);
    queryCount = entries.filter((e) => e.endsWith('.md')).length;
  } catch {
    // No queries dir
  }

  return {
    root: wikiRoot,
    paths,
    name,
    sourceCount,
    articleCount,
    queryCount,
  };
}

// =============================================================================
// Explorer Tree Building
// =============================================================================

/**
 * Build explorer items from the wiki directory structure
 */
export async function buildExplorerItems(wikiDir: string): Promise<ExplorerItem[]> {
  const items: ExplorerItem[] = [];

  const subdirs = ['concepts', 'entities', 'syntheses'];

  for (const dir of subdirs) {
    const dirPath = join(wikiDir, dir);

    try {
      const entries = await readdir(dirPath);
      const mdFiles = entries.filter((e) => e.endsWith('.md')).sort();

      if (mdFiles.length > 0) {
        // Add directory node
        const dirItem: ExplorerItem = {
          name: dir,
          path: dirPath,
          isDir: true,
          depth: 0,
          expanded: true,
          children: [],
        };

        // Add file nodes
        for (const file of mdFiles) {
          const filePath = join(dirPath, file);
          const title = await getArticleTitle(filePath);
          const type = getArticleTypeFromDir(dir);

          dirItem.children!.push({
            name: title || file.replace('.md', ''),
            path: filePath,
            isDir: false,
            depth: 1,
            articleType: type,
          });
        }

        items.push(dirItem);
      }
    } catch {
      // Directory doesn't exist, skip
    }
  }

  return items;
}

/**
 * Flatten explorer items into a linear list for rendering
 */
export function flattenExplorerItems(items: ExplorerItem[]): ExplorerItem[] {
  const flat: ExplorerItem[] = [];

  for (const item of items) {
    flat.push(item);
    if (item.isDir && item.expanded && item.children) {
      flat.push(...item.children);
    }
  }

  return flat;
}

/**
 * Collect all article paths from the wiki directory
 */
export async function collectArticlePaths(wikiDir: string): Promise<string[]> {
  const paths: string[] = [];
  const subdirs = ['concepts', 'entities', 'syntheses'];

  for (const dir of subdirs) {
    try {
      const dirPath = join(wikiDir, dir);
      const entries = await readdir(dirPath);
      for (const entry of entries) {
        if (entry.endsWith('.md')) {
          paths.push(join(dirPath, entry));
        }
      }
    } catch {
      // skip
    }
  }

  return paths;
}

// =============================================================================
// Status Bar Data
// =============================================================================

/**
 * Build status bar state from workspace snapshot
 */
export function buildStatusBarState(
  snapshot: WorkspaceSnapshot,
  provider: string,
  activeOp: string | null = null,
): StatusBarState {
  return {
    workspaceName: snapshot.name,
    branch: '',
    articleCount: snapshot.articleCount,
    sourceCount: snapshot.sourceCount,
    activeOperation: activeOp,
    provider,
    errorCount: 0,
    warningCount: 0,
  };
}

// =============================================================================
// Helpers
// =============================================================================

async function countMarkdownFiles(dir: string): Promise<number> {
  let count = 0;
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('_') && entry.name !== 'meta') {
        count += await countMarkdownFiles(join(dir, entry.name));
      } else if (entry.isFile() && entry.name.endsWith('.md') && !entry.name.startsWith('_')) {
        count++;
      }
    }
  } catch {
    // dir doesn't exist
  }
  return count;
}

async function getArticleTitle(filePath: string): Promise<string> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const match = content.match(/^---\n[\s\S]*?title:\s*(.+)\n[\s\S]*?\n---/);
    return match ? match[1].trim() : '';
  } catch {
    return '';
  }
}

function getArticleTypeFromDir(dir: string): string {
  switch (dir) {
    case 'concepts': return 'concept';
    case 'entities': return 'entity';
    case 'syntheses': return 'synthesis';
    default: return 'unknown';
  }
}
