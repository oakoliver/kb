/**
 * Wiki root resolver - finds the knowledge base root directory
 * @module core/resolver
 */

import { join, dirname, resolve } from 'path';
import { homedir } from 'os';

// =============================================================================
// Constants
// =============================================================================

/**
 * The config directory name for a knowledge base
 */
export const KB_CONFIG_DIR = '.kb';

/**
 * The config file name
 */
export const KB_CONFIG_FILE = 'config.json';

/**
 * Global knowledge base location
 */
export const GLOBAL_KB_PATH = join(homedir(), '.kb');

// =============================================================================
// Types
// =============================================================================

export interface WikiRoot {
  /**
   * Absolute path to the wiki root directory
   */
  path: string;

  /**
   * Whether this is the global wiki (~/.kb)
   */
  isGlobal: boolean;
}

export interface WikiPaths {
  /**
   * Root directory of the wiki
   */
  root: string;

  /**
   * Config directory (.kb/)
   */
  config: string;

  /**
   * Config file (.kb/config.json)
   */
  configFile: string;

  /**
   * Raw sources directory (raw/)
   */
  raw: string;

  /**
   * Manifest file (raw/_manifest.json)
   */
  manifest: string;

  /**
   * Wiki articles directory (wiki/)
   */
  wiki: string;

  /**
   * Wiki meta directory (wiki/meta/)
   */
  meta: string;

  /**
   * Dependency graph file (wiki/meta/graph.json)
   */
  graph: string;

  /**
   * Wiki index file (wiki/_index.md)
   */
  index: string;

  /**
   * Queries directory (queries/)
   */
  queries: string;

  /**
   * Instructions file (.kb/instructions.md)
   */
  instructions: string;
}

// =============================================================================
// Resolution Functions
// =============================================================================

/**
 * Check if a directory contains a knowledge base
 */
export async function isWikiRoot(dir: string): Promise<boolean> {
  const configPath = join(dir, KB_CONFIG_DIR, KB_CONFIG_FILE);
  const file = Bun.file(configPath);
  return await file.exists();
}

/**
 * Find the wiki root by traversing up from the given directory
 * Returns null if no wiki is found
 */
export async function findWikiRoot(startDir?: string): Promise<WikiRoot | null> {
  const start = startDir ? resolve(startDir) : process.cwd();
  let current = start;

  // Traverse up the directory tree
  while (true) {
    if (await isWikiRoot(current)) {
      return {
        path: current,
        isGlobal: current === GLOBAL_KB_PATH,
      };
    }

    const parent = dirname(current);
    if (parent === current) {
      // Reached filesystem root
      break;
    }
    current = parent;
  }

  // Check global wiki as fallback
  if (await isWikiRoot(GLOBAL_KB_PATH)) {
    return {
      path: GLOBAL_KB_PATH,
      isGlobal: true,
    };
  }

  return null;
}

/**
 * Resolve the wiki root, throwing an error if not found
 */
export async function resolveWikiRoot(startDir?: string): Promise<WikiRoot> {
  const root = await findWikiRoot(startDir);
  if (!root) {
    throw new WikiNotFoundError(startDir || process.cwd());
  }
  return root;
}

/**
 * Get all standard paths for a wiki
 */
export function getWikiPaths(root: string): WikiPaths {
  return {
    root,
    config: join(root, KB_CONFIG_DIR),
    configFile: join(root, KB_CONFIG_DIR, KB_CONFIG_FILE),
    raw: join(root, 'raw'),
    manifest: join(root, 'raw', '_manifest.json'),
    wiki: join(root, 'wiki'),
    meta: join(root, 'wiki', 'meta'),
    graph: join(root, 'wiki', 'meta', 'graph.json'),
    index: join(root, 'wiki', '_index.md'),
    queries: join(root, 'queries'),
    instructions: join(root, KB_CONFIG_DIR, 'instructions.md'),
  };
}

/**
 * Get paths relative to wiki root
 */
export function relativePath(root: string, absolutePath: string): string {
  if (absolutePath.startsWith(root)) {
    const relative = absolutePath.slice(root.length);
    return relative.startsWith('/') ? relative.slice(1) : relative;
  }
  return absolutePath;
}

/**
 * Convert a relative path to absolute based on wiki root
 */
export function absolutePath(root: string, relativePath: string): string {
  if (relativePath.startsWith('/')) {
    return relativePath;
  }
  return join(root, relativePath);
}

// =============================================================================
// Directory Type Detection
// =============================================================================

/**
 * Check if a path is inside the raw directory
 */
export function isInRaw(root: string, path: string): boolean {
  const rawDir = join(root, 'raw');
  const absolute = absolutePath(root, path);
  return absolute.startsWith(rawDir);
}

/**
 * Check if a path is inside the wiki directory
 */
export function isInWiki(root: string, path: string): boolean {
  const wikiDir = join(root, 'wiki');
  const absolute = absolutePath(root, path);
  return absolute.startsWith(wikiDir);
}

/**
 * Check if a path is inside the queries directory
 */
export function isInQueries(root: string, path: string): boolean {
  const queriesDir = join(root, 'queries');
  const absolute = absolutePath(root, path);
  return absolute.startsWith(queriesDir);
}

// =============================================================================
// Errors
// =============================================================================

export class WikiNotFoundError extends Error {
  constructor(public searchedFrom: string) {
    super(
      `No knowledge base found. Searched from: ${searchedFrom}\n` +
        `Run 'kb init' to create a new knowledge base, or 'kb init --global' for a global wiki.`
    );
    this.name = 'WikiNotFoundError';
  }
}

export class WikiAlreadyExistsError extends Error {
  constructor(public path: string) {
    super(`A knowledge base already exists at: ${path}`);
    this.name = 'WikiAlreadyExistsError';
  }
}
