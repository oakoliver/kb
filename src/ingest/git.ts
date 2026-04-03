/**
 * Git repository ingestion handler
 * @module ingest/git
 */

import { join, basename } from 'path';
import { mkdir, rm, readdir } from 'fs/promises';
import { computeHash } from '../core/manifest';
import { createManifestEntry, type ManifestEntry } from '../core/schemas';

// =============================================================================
// Types
// =============================================================================

export interface IngestGitResult {
  entry: ManifestEntry;
  content: string;
}

export interface IngestGitOptions {
  title?: string;
  branch?: string;
}

// =============================================================================
// Git URL Parsing
// =============================================================================

/**
 * Check if a URL is a git repository
 */
export function isGitRepo(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    // Common git hosts
    if (host === 'github.com' || host === 'gitlab.com' || host === 'bitbucket.org') {
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      return pathParts.length >= 2;
    }

    // .git suffix
    return parsed.pathname.endsWith('.git');
  } catch {
    return false;
  }
}

/**
 * Parse git URL into components
 */
export function parseGitUrl(url: string): { owner: string; repo: string; host: string } | null {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(Boolean);

    if (pathParts.length < 2) {
      return null;
    }

    const owner = pathParts[0];
    const repo = pathParts[1].replace(/\.git$/, '');

    return { owner, repo, host: parsed.hostname };
  } catch {
    return null;
  }
}

/**
 * Get raw README URL for GitHub
 */
export function getReadmeUrl(gitUrl: string, branch = 'main'): string | null {
  const parsed = parseGitUrl(gitUrl);
  if (!parsed) return null;

  if (parsed.host === 'github.com') {
    return `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${branch}/README.md`;
  }

  if (parsed.host === 'gitlab.com') {
    return `https://gitlab.com/${parsed.owner}/${parsed.repo}/-/raw/${branch}/README.md`;
  }

  return null;
}

// =============================================================================
// Git Ingestion
// =============================================================================

/**
 * Ingest a git repository (extracts README)
 */
export async function ingestGit(
  gitUrl: string,
  rawDir: string,
  options?: IngestGitOptions
): Promise<IngestGitResult> {
  const parsed = parseGitUrl(gitUrl);
  if (!parsed) {
    throw new InvalidGitUrlError(gitUrl);
  }

  // Try to fetch README from different branches
  const branches = [options?.branch, 'main', 'master'].filter(Boolean) as string[];
  let readmeContent: string | null = null;

  for (const branch of branches) {
    const readmeUrl = getReadmeUrl(gitUrl, branch);
    if (!readmeUrl) continue;

    try {
      const response = await fetch(readmeUrl, {
        headers: {
          'User-Agent': 'kb/0.1.0 (Knowledge Base CLI)',
        },
      });

      if (response.ok) {
        readmeContent = await response.text();
        break;
      }
    } catch {
      // Try next branch
    }
  }

  if (!readmeContent) {
    // Create placeholder content
    readmeContent = `# ${parsed.repo}\n\n_README not found. Visit the repository at ${gitUrl}_\n`;
  }

  // Generate title and filename
  const title = options?.title || `${parsed.repo}`;
  const filename = parsed.repo.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.md';

  // Target paths
  const targetDir = join(rawDir, 'code');
  const targetPath = join(targetDir, filename);
  const relativePath = `code/${filename}`;

  // Create target directory
  await mkdir(targetDir, { recursive: true });

  // Add source metadata
  const contentWithSource = `---\nsource: ${gitUrl}\nrepository: ${parsed.owner}/${parsed.repo}\n---\n\n${readmeContent}`;

  // Compute hash
  const hash = await computeHash(contentWithSource);

  // Write file
  await Bun.write(targetPath, contentWithSource);

  // Create manifest entry
  const entry = createManifestEntry(relativePath, title, hash, 'code', gitUrl);

  return { entry, content: contentWithSource };
}

// =============================================================================
// Errors
// =============================================================================

export class InvalidGitUrlError extends Error {
  constructor(public url: string) {
    super(`Invalid git URL: ${url}`);
    this.name = 'InvalidGitUrlError';
  }
}

export class GitCloneError extends Error {
  constructor(
    public url: string,
    public reason: string
  ) {
    super(`Failed to clone ${url}: ${reason}`);
    this.name = 'GitCloneError';
  }
}
