/**
 * Local file ingestion handler
 * @module ingest/file
 */

import { basename, extname, join } from 'path';
import { copyFile, mkdir } from 'fs/promises';
import { computeHash } from '../core/manifest';
import { createManifestEntry, type SourceType, type ManifestEntry } from '../core/schemas';

// =============================================================================
// Types
// =============================================================================

export interface IngestFileResult {
  entry: ManifestEntry;
  content: string;
}

export interface IngestFileOptions {
  title?: string;
  type?: SourceType;
}

// =============================================================================
// File Type Detection
// =============================================================================

/**
 * Detect source type from file extension
 */
export function detectFileType(filePath: string): SourceType {
  const ext = extname(filePath).toLowerCase();

  switch (ext) {
    case '.pdf':
      return 'paper';
    case '.md':
    case '.markdown':
    case '.txt':
      return 'article';
    case '.js':
    case '.ts':
    case '.py':
    case '.go':
    case '.rs':
    case '.java':
    case '.c':
    case '.cpp':
    case '.h':
    case '.rb':
    case '.php':
    case '.swift':
    case '.kt':
      return 'code';
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.webp':
    case '.svg':
      return 'media';
    default:
      return 'article';
  }
}

/**
 * Extract title from file path
 */
export function extractTitleFromPath(filePath: string): string {
  const name = basename(filePath, extname(filePath));
  // Convert kebab-case or snake_case to Title Case
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Extract title from markdown content (first H1 heading)
 */
export function extractTitleFromMarkdown(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

/**
 * Generate a safe filename from title
 */
export function generateFilename(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '.md'
  );
}

// =============================================================================
// File Ingestion
// =============================================================================

/**
 * Ingest a local file into the knowledge base
 */
export async function ingestFile(
  sourcePath: string,
  rawDir: string,
  options?: IngestFileOptions
): Promise<IngestFileResult> {
  // Check if source file exists
  const sourceFile = Bun.file(sourcePath);
  if (!(await sourceFile.exists())) {
    throw new FileNotFoundError(sourcePath);
  }

  // Read content first to extract title if needed
  const content = await sourceFile.text();

  // Detect type and title
  const type = options?.type || detectFileType(sourcePath);

  // Try to extract title from markdown content, fallback to filename
  let title = options?.title;
  if (!title) {
    const markdownTitle = extractTitleFromMarkdown(content);
    title = markdownTitle || extractTitleFromPath(sourcePath);
  }

  const filename = generateFilename(title);

  // Determine target directory based on type
  const typeDir = getTypeDirName(type);
  const targetDir = join(rawDir, typeDir);
  const targetPath = join(targetDir, filename);
  const relativePath = `${typeDir}/${filename}`;

  // Create target directory
  await mkdir(targetDir, { recursive: true });

  // Compute hash
  const hash = await computeHash(content);

  // Copy file to raw directory
  await copyFile(sourcePath, targetPath);

  // Create manifest entry
  const entry = createManifestEntry(relativePath, title, hash, type);

  return { entry, content };
}

/**
 * Get directory name for source type
 */
export function getTypeDirName(type: SourceType): string {
  switch (type) {
    case 'article':
      return 'articles';
    case 'paper':
      return 'papers';
    case 'code':
      return 'code';
    case 'media':
      return 'media';
  }
}

// =============================================================================
// Errors
// =============================================================================

export class FileNotFoundError extends Error {
  constructor(public path: string) {
    super(`File not found: ${path}`);
    this.name = 'FileNotFoundError';
  }
}
