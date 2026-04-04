/**
 * Ingest service adapter for KB Studio TUI
 * Bridges TUI ingest view to the core ingest command logic
 * @module tui/operations/ingest
 */

import type { IngestQueueItem } from '../state';
import type { WikiPaths } from '../../core/resolver';
import type { IngestResult } from '../../commands/ingest';

// =============================================================================
// Types
// =============================================================================

export interface IngestContext {
  wikiRoot: string;
  paths: WikiPaths;
}

export interface IngestCallbacks {
  onStart: (source: string) => void;
  onDone: (source: string, title: string) => void;
  onError: (source: string, error: string) => void;
}

// =============================================================================
// Ingest Service
// =============================================================================

/**
 * Ingest a single source into the workspace.
 * Calls through to the existing ingest command logic.
 */
export async function ingestSource(
  ctx: IngestContext,
  source: string,
  callbacks: IngestCallbacks,
): Promise<void> {
  callbacks.onStart(source);

  try {
    // Dynamically import the ingest modules to avoid circular dependencies
    const { resolveWikiRoot, getWikiPaths } = await import('../../core/resolver');
    const {
      loadManifest,
      saveManifest,
      addEntry,
      findEntryByHash,
      findEntryByUrl,
    } = await import('../../core/manifest');
    const { ingestFile, detectFileType } = await import('../../ingest/file');
    const { ingestUrl, isUrl, isPdfUrl, isGitUrl } = await import('../../ingest/url');
    const { ingestPdf, isPdf } = await import('../../ingest/pdf');
    const { ingestGit, isGitRepo } = await import('../../ingest/git');
    const { resolve } = await import('path');

    const manifest = await loadManifest(ctx.paths.manifest);

    // Detect source kind
    const sourceKind = detectSourceKind(source, { isUrl, isPdfUrl, isGitRepo, isPdf });

    let entry: any;
    let content: string;

    switch (sourceKind) {
      case 'url': {
        const existingByUrl = findEntryByUrl(manifest, source);
        if (existingByUrl) {
          callbacks.onDone(source, `${existingByUrl.title} (already ingested)`);
          return;
        }
        const urlResult = await ingestUrl(source, ctx.paths.raw, {});
        entry = urlResult.entry;
        content = urlResult.content;
        break;
      }

      case 'git': {
        const existingByUrl = findEntryByUrl(manifest, source);
        if (existingByUrl) {
          callbacks.onDone(source, `${existingByUrl.title} (already ingested)`);
          return;
        }
        const gitResult = await ingestGit(source, ctx.paths.raw, {});
        entry = gitResult.entry;
        content = gitResult.content;
        break;
      }

      case 'pdf': {
        const pdfPath = isUrl(source) ? source : resolve(source);
        const pdfResult = await ingestPdf(pdfPath, ctx.paths.raw, {});
        entry = pdfResult.entry;
        content = pdfResult.content;
        break;
      }

      case 'file': {
        const filePath = resolve(source);
        const fileResult = await ingestFile(filePath, ctx.paths.raw, {});
        entry = fileResult.entry;
        content = fileResult.content;
        break;
      }
    }

    // Check for duplicate content
    const existingByHash = findEntryByHash(manifest, entry.hash);
    if (existingByHash) {
      callbacks.onDone(source, `${existingByHash.title} (duplicate content)`);
      return;
    }

    // Add to manifest
    const updatedManifest = addEntry(manifest, entry);
    await saveManifest(ctx.paths.manifest, updatedManifest);

    callbacks.onDone(source, entry.title);
  } catch (err) {
    callbacks.onError(source, (err as Error).message);
  }
}

// =============================================================================
// Source Kind Detection (pure)
// =============================================================================

type SourceKind = 'url' | 'git' | 'pdf' | 'file';

interface SourceDetectors {
  isUrl: (s: string) => boolean;
  isPdfUrl: (s: string) => boolean;
  isGitRepo: (s: string) => boolean;
  isPdf: (s: string) => boolean;
}

export function detectSourceKind(source: string, detectors: SourceDetectors): SourceKind {
  if (detectors.isUrl(source)) {
    if (detectors.isGitRepo(source)) return 'git';
    if (detectors.isPdfUrl(source)) return 'pdf';
    return 'url';
  }
  if (detectors.isPdf(source)) return 'pdf';
  return 'file';
}

// =============================================================================
// Queue Management (pure state transforms)
// =============================================================================

/**
 * Create a queue item from a source string
 */
export function createQueueItem(source: string): IngestQueueItem {
  return {
    source,
    status: 'pending',
  };
}

/**
 * Update a queue item's status
 */
export function updateQueueItemStatus(
  queue: IngestQueueItem[],
  source: string,
  status: IngestQueueItem['status'],
  error?: string,
): IngestQueueItem[] {
  return queue.map((item) =>
    item.source === source
      ? { ...item, status, error }
      : item,
  );
}

/**
 * Check if any items in the queue are still pending or ingesting
 */
export function hasActiveIngests(queue: IngestQueueItem[]): boolean {
  return queue.some((item) => item.status === 'pending' || item.status === 'ingesting');
}

/**
 * Count items by status
 */
export function countByStatus(queue: IngestQueueItem[]): { pending: number; ingesting: number; done: number; error: number } {
  const result = { pending: 0, ingesting: 0, done: 0, error: 0 };
  for (const item of queue) {
    result[item.status]++;
  }
  return result;
}
