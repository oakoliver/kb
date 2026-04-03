/**
 * PDF ingestion handler using pageindex
 * @module ingest/pdf
 */

import { join, basename } from 'path';
import { mkdir, copyFile } from 'fs/promises';
import { computeHash } from '../core/manifest';
import { createManifestEntry, type ManifestEntry } from '../core/schemas';

// =============================================================================
// Types
// =============================================================================

export interface IngestPdfResult {
  entry: ManifestEntry;
  content: string;
}

export interface IngestPdfOptions {
  title?: string;
}

// =============================================================================
// PDF Ingestion
// =============================================================================

/**
 * Check if a file is a PDF
 */
export function isPdf(path: string): boolean {
  return path.toLowerCase().endsWith('.pdf');
}

/**
 * Extract text content from PDF
 * Note: This is a placeholder. Full implementation would use pageindex.
 */
async function extractPdfText(pdfPath: string): Promise<string> {
  // For now, just read the file and return a placeholder
  // In production, this would use pageindex for OCR and text extraction
  const file = Bun.file(pdfPath);

  if (!(await file.exists())) {
    throw new PdfNotFoundError(pdfPath);
  }

  // Return placeholder text with filename
  const filename = basename(pdfPath, '.pdf');
  return `# ${filename}\n\n_PDF content extraction pending. Run \`kb compile\` to process with LLM._\n`;
}

/**
 * Generate filename from PDF path
 */
function generatePdfFilename(pdfPath: string, title?: string): string {
  if (title) {
    return (
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') + '.md'
    );
  }

  const name = basename(pdfPath, '.pdf');
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.md';
}

/**
 * Extract title from PDF filename
 */
function extractTitleFromPdf(pdfPath: string): string {
  const name = basename(pdfPath, '.pdf');
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Ingest a PDF file into the knowledge base
 */
export async function ingestPdf(
  pdfPath: string,
  rawDir: string,
  options?: IngestPdfOptions
): Promise<IngestPdfResult> {
  const file = Bun.file(pdfPath);
  if (!(await file.exists())) {
    throw new PdfNotFoundError(pdfPath);
  }

  // Extract text from PDF
  const content = await extractPdfText(pdfPath);

  // Get title
  const title = options?.title || extractTitleFromPdf(pdfPath);
  const filename = generatePdfFilename(pdfPath, title);

  // Target paths
  const targetDir = join(rawDir, 'papers');
  const targetPath = join(targetDir, filename);
  const relativePath = `papers/${filename}`;

  // Create target directory
  await mkdir(targetDir, { recursive: true });

  // Compute hash of the original PDF file
  const pdfBuffer = await file.arrayBuffer();
  const pdfContent = new Uint8Array(pdfBuffer);
  const hashBuffer = await crypto.subtle.digest('SHA-256', pdfContent);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  // Write extracted content as markdown
  await Bun.write(targetPath, content);

  // Also copy original PDF to papers/
  const pdfTargetPath = join(targetDir, basename(pdfPath));
  await copyFile(pdfPath, pdfTargetPath);

  // Create manifest entry
  const entry = createManifestEntry(relativePath, title, hash, 'paper');

  return { entry, content };
}

// =============================================================================
// Errors
// =============================================================================

export class PdfNotFoundError extends Error {
  constructor(public path: string) {
    super(`PDF not found: ${path}`);
    this.name = 'PdfNotFoundError';
  }
}

export class PdfExtractionError extends Error {
  constructor(
    public path: string,
    public reason: string
  ) {
    super(`Failed to extract PDF ${path}: ${reason}`);
    this.name = 'PdfExtractionError';
  }
}
