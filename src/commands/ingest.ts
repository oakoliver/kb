/**
 * kb ingest command - Add sources to the knowledge base
 * @module commands/ingest
 */

import { resolve } from 'path';
import { resolveWikiRoot, getWikiPaths } from '../core/resolver';
import {
  loadManifest,
  saveManifest,
  addEntry,
  findEntryByHash,
  findEntryByUrl,
} from '../core/manifest';
import { ingestFile, detectFileType } from '../ingest/file';
import { ingestUrl, isUrl, isPdfUrl, isGitUrl } from '../ingest/url';
import { ingestPdf, isPdf } from '../ingest/pdf';
import { ingestGit, isGitRepo } from '../ingest/git';
import { output, success, error as outputError, isTTY, styles, symbols } from '../output/format';
import { spin } from '../output/progress';
import type { CommandContext } from '../cli';
import type { SourceType, ManifestEntry } from '../core/schemas';

// =============================================================================
// Types
// =============================================================================

export interface IngestResult {
  path: string;
  title: string;
  type: SourceType;
  hash: string;
  skipped: boolean;
  reason?: string;
}

// =============================================================================
// Source Type Detection
// =============================================================================

type SourceKind = 'url' | 'git' | 'pdf' | 'file';

/**
 * Detect the kind of source from the input
 */
function detectSourceKind(source: string): SourceKind {
  // Check if it's a URL
  if (isUrl(source)) {
    // Check if it's a git repository URL
    if (isGitRepo(source)) {
      return 'git';
    }
    // Check if it's a PDF URL
    if (isPdfUrl(source)) {
      return 'pdf';
    }
    return 'url';
  }

  // Local file - check if PDF
  if (isPdf(source)) {
    return 'pdf';
  }

  return 'file';
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Ingest a source into the knowledge base
 */
export async function ingest(ctx: CommandContext): Promise<number> {
  const source = ctx.positionals[0];

  if (!source) {
    outputError('No source specified. Provide a URL, file path, or git repo.');
    return 1;
  }

  // Resolve wiki root
  let wikiRoot: { path: string };
  try {
    wikiRoot = await resolveWikiRoot();
  } catch (err) {
    outputError((err as Error).message);
    return 1;
  }

  const paths = getWikiPaths(wikiRoot.path);

  // Load manifest
  const manifest = await loadManifest(paths.manifest);

  // Get options
  const typeOption = ctx.flags.type as SourceType | undefined;
  const titleOption = ctx.flags.title as string | undefined;

  // Detect source kind
  const sourceKind = detectSourceKind(source);

  // Start spinner for TTY mode
  const spinner = spin(`Ingesting ${source}...`);

  try {
    let entry: ManifestEntry;
    let content: string;

    switch (sourceKind) {
      case 'url': {
        // Check for duplicate URL
        const existingByUrl = findEntryByUrl(manifest, source);
        if (existingByUrl) {
          spinner.stop();
          const result: IngestResult = {
            path: existingByUrl.path,
            title: existingByUrl.title,
            type: existingByUrl.type,
            hash: existingByUrl.hash,
            skipped: true,
            reason: 'URL already ingested',
          };
          output(result, () => formatSkippedOutput(result));
          return 0;
        }

        const urlResult = await ingestUrl(source, paths.raw, {
          title: titleOption,
          type: typeOption,
        });
        entry = urlResult.entry;
        content = urlResult.content;
        break;
      }

      case 'git': {
        // Check for duplicate URL
        const existingByUrl = findEntryByUrl(manifest, source);
        if (existingByUrl) {
          spinner.stop();
          const result: IngestResult = {
            path: existingByUrl.path,
            title: existingByUrl.title,
            type: existingByUrl.type,
            hash: existingByUrl.hash,
            skipped: true,
            reason: 'Repository already ingested',
          };
          output(result, () => formatSkippedOutput(result));
          return 0;
        }

        const gitResult = await ingestGit(source, paths.raw, {
          title: titleOption,
        });
        entry = gitResult.entry;
        content = gitResult.content;
        break;
      }

      case 'pdf': {
        const pdfPath = isUrl(source) ? source : resolve(source);
        const pdfResult = await ingestPdf(pdfPath, paths.raw, {
          title: titleOption,
        });
        entry = pdfResult.entry;
        content = pdfResult.content;
        break;
      }

      case 'file': {
        const filePath = resolve(source);
        const fileResult = await ingestFile(filePath, paths.raw, {
          title: titleOption,
          type: typeOption,
        });
        entry = fileResult.entry;
        content = fileResult.content;
        break;
      }
    }

    // Check for duplicate content (by hash)
    const existingByHash = findEntryByHash(manifest, entry.hash);
    if (existingByHash) {
      spinner.stop();
      const result: IngestResult = {
        path: existingByHash.path,
        title: existingByHash.title,
        type: existingByHash.type,
        hash: existingByHash.hash,
        skipped: true,
        reason: 'Duplicate content detected',
      };
      output(result, () => formatSkippedOutput(result));
      return 0;
    }

    // Add to manifest
    const updatedManifest = addEntry(manifest, entry);
    await saveManifest(paths.manifest, updatedManifest);

    spinner.success(`Ingested: ${entry.title}`);

    // Output result
    const result: IngestResult = {
      path: entry.path,
      title: entry.title,
      type: entry.type,
      hash: entry.hash,
      skipped: false,
    };

    output(result, () => formatIngestOutput(result));

    return 0;
  } catch (err) {
    spinner.error(`Failed: ${(err as Error).message}`);
    outputError((err as Error).message);
    return 1;
  }
}

// =============================================================================
// Output Formatting
// =============================================================================

/**
 * Format human-readable output for successful ingest
 */
function formatIngestOutput(result: IngestResult): string {
  const lines: string[] = [];
  lines.push(`  ${symbols.arrow} ${styles.path.render(result.path)}`);
  return lines.join('\n');
}

/**
 * Format human-readable output for skipped ingest
 */
function formatSkippedOutput(result: IngestResult): string {
  const lines: string[] = [];
  lines.push(styles.warning.render(`${symbols.warning} Skipped: ${result.title}`));
  lines.push(`  ${result.reason}`);
  lines.push(`  ${symbols.arrow} Existing: ${styles.path.render(result.path)}`);
  return lines.join('\n');
}

export default ingest;
