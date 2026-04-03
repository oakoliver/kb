/**
 * Manifest CRUD operations for tracking ingested sources
 * @module core/manifest
 */

import { ManifestSchema, createEmptyManifest, type Manifest, type ManifestEntry } from './schemas';
import { ZodError } from 'zod';

// Re-export types
export type { ManifestEntry, Manifest } from './schemas';

// =============================================================================
// Manifest CRUD Operations
// =============================================================================

/**
 * Create a new empty manifest file
 */
export async function createManifest(path: string): Promise<Manifest> {
  const manifest = createEmptyManifest();
  await saveManifest(path, manifest);
  return manifest;
}

/**
 * Load and validate manifest from file
 */
export async function loadManifest(path: string): Promise<Manifest> {
  const file = Bun.file(path);

  if (!(await file.exists())) {
    throw new ManifestNotFoundError(path);
  }

  try {
    const content = await file.text();
    const raw = JSON.parse(content);
    return ManifestSchema.parse(raw);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new ManifestParseError(path, `Invalid JSON: ${err.message}`);
    }
    if (err instanceof ZodError) {
      throw new ManifestValidationError(path, err);
    }
    throw err;
  }
}

/**
 * Save manifest to file
 */
export async function saveManifest(path: string, manifest: Manifest): Promise<void> {
  const validated = ManifestSchema.parse(manifest);
  const content = JSON.stringify(validated, null, 2);
  await Bun.write(path, content);
}

/**
 * Load manifest or create if it doesn't exist
 */
export async function loadOrCreateManifest(path: string): Promise<Manifest> {
  const file = Bun.file(path);
  if (await file.exists()) {
    return loadManifest(path);
  }
  return createManifest(path);
}

// =============================================================================
// Entry Operations (Pure Functions)
// =============================================================================

/**
 * Add an entry to the manifest (returns new manifest)
 */
export function addEntry(manifest: Manifest, entry: ManifestEntry): Manifest {
  return {
    ...manifest,
    entries: [...manifest.entries, entry],
  };
}

/**
 * Remove an entry by path (returns new manifest)
 */
export function removeEntry(manifest: Manifest, path: string): Manifest {
  return {
    ...manifest,
    entries: manifest.entries.filter((e) => e.path !== path),
  };
}

/**
 * Update an entry by path (returns new manifest)
 */
export function updateEntry(manifest: Manifest, path: string, updates: Partial<ManifestEntry>): Manifest {
  return {
    ...manifest,
    entries: manifest.entries.map((e) => (e.path === path ? { ...e, ...updates } : e)),
  };
}

/**
 * Find an entry by hash
 */
export function findEntryByHash(manifest: Manifest, hash: string): ManifestEntry | null {
  return manifest.entries.find((e) => e.hash === hash) || null;
}

/**
 * Find an entry by path
 */
export function findEntryByPath(manifest: Manifest, path: string): ManifestEntry | null {
  return manifest.entries.find((e) => e.path === path) || null;
}

/**
 * Find an entry by source URL
 */
export function findEntryByUrl(manifest: Manifest, url: string): ManifestEntry | null {
  return manifest.entries.find((e) => e.sourceUrl === url) || null;
}

/**
 * Check if an entry with the same hash exists (duplicate content)
 */
export function isDuplicate(manifest: Manifest, hash: string): boolean {
  return findEntryByHash(manifest, hash) !== null;
}

/**
 * Get all entries of a specific type
 */
export function getEntriesByType(manifest: Manifest, type: ManifestEntry['type']): ManifestEntry[] {
  return manifest.entries.filter((e) => e.type === type);
}

/**
 * Get entries that have changed (hash mismatch)
 */
export async function getChangedEntries(
  manifest: Manifest,
  wikiRoot: string
): Promise<ManifestEntry[]> {
  const changed: ManifestEntry[] = [];

  for (const entry of manifest.entries) {
    const filePath = `${wikiRoot}/raw/${entry.path}`;
    const file = Bun.file(filePath);

    if (!(await file.exists())) {
      // File was deleted
      changed.push(entry);
      continue;
    }

    const content = await file.text();
    const currentHash = await computeHash(content);

    if (currentHash !== entry.hash) {
      changed.push(entry);
    }
  }

  return changed;
}

// =============================================================================
// Hash Computation
// =============================================================================

/**
 * Compute SHA-256 hash of content
 */
export async function computeHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute hash of a file
 */
export async function computeFileHash(path: string): Promise<string> {
  const file = Bun.file(path);
  const content = await file.text();
  return computeHash(content);
}

// =============================================================================
// Errors
// =============================================================================

export class ManifestNotFoundError extends Error {
  constructor(public path: string) {
    super(`Manifest not found: ${path}`);
    this.name = 'ManifestNotFoundError';
  }
}

export class ManifestParseError extends Error {
  constructor(
    public path: string,
    public details: string
  ) {
    super(`Failed to parse manifest at ${path}: ${details}`);
    this.name = 'ManifestParseError';
  }
}

export class ManifestValidationError extends Error {
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
    super(`Invalid manifest at ${path}:\n${details}`);
    this.name = 'ManifestValidationError';
    this.issues = issues;
  }
}
