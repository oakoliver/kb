/**
 * kb promote command - Move query output into the wiki
 * @module commands/promote
 */

import { join, basename, dirname } from 'path';
import { unlink, readdir, readFile as fsReadFile, writeFile as fsWriteFile } from 'fs/promises';
import { resolveWikiRoot, getWikiPaths } from '../core/resolver';
import {
  parseFrontmatter,
  createArticle,
  extractWikilinks,
  titleToSlug,
  getArticleDir,
  serializeFrontmatter,
  updateArticleFrontmatter,
} from '../core/markdown';
import { type ArticleType, type Frontmatter } from '../core/schemas';
import { output, success, error as outputError, isTTY, styles, symbols } from '../output/format';
import type { CommandContext } from '../cli';

// =============================================================================
// Types
// =============================================================================

export interface PromoteResult {
  source: string;
  destination: string;
  backlinks_added: number;
}

export interface PromoteOptions {
  as?: ArticleType;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Promote a query file to the wiki
 */
export async function promote(ctx: CommandContext): Promise<number> {
  // Parse arguments
  const queryFile = ctx.positionals[0];
  if (!queryFile) {
    outputError('Missing file argument', "Usage: kb promote <file> [--as <type>]");
    return 1;
  }

  // Parse options
  const options: PromoteOptions = {};
  if (ctx.flags.as && typeof ctx.flags.as === 'string') {
    const validTypes: ArticleType[] = ['concept', 'entity', 'synthesis'];
    if (!validTypes.includes(ctx.flags.as as ArticleType)) {
      outputError(`Invalid type: ${ctx.flags.as}`, 'Valid types: concept, entity, synthesis');
      return 1;
    }
    options.as = ctx.flags.as as ArticleType;
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

  // Resolve source file path
  const sourcePath = join(wikiRoot.path, queryFile);
  const sourceFile = Bun.file(sourcePath);

  if (!(await sourceFile.exists())) {
    outputError(`File not found: ${queryFile}`);
    return 1;
  }

  // Parse the query file
  let content: string;
  let frontmatter: Frontmatter | null;
  let body: string;

  try {
    content = await sourceFile.text();
    const parsed = parseFrontmatter(content);
    frontmatter = parsed.frontmatter;
    body = parsed.body;

    if (!frontmatter) {
      outputError('Query file has no frontmatter');
      return 1;
    }
  } catch (err) {
    outputError(`Failed to parse query file: ${(err as Error).message}`);
    return 1;
  }

  // Determine target type
  const targetType: ArticleType = options.as || 'synthesis';

  // Generate destination path
  const slug = titleToSlug(frontmatter.title);
  const targetDir = getArticleDir(targetType);
  const destRelPath = `wiki/${targetDir}/${slug}.md`;
  const destPath = join(wikiRoot.path, destRelPath);

  // Update frontmatter with new type
  const updatedFrontmatter: Frontmatter = {
    ...frontmatter,
    type: targetType,
    updated: new Date().toISOString(),
  };

  // Create article content
  const articleContent = createArticle(updatedFrontmatter, body);

  // Write to destination
  await Bun.write(destPath, articleContent);

  // Extract wikilinks for backlink injection
  const wikilinks = extractWikilinks(body);
  const relatedLinks = frontmatter.related
    .map((r) => {
      const match = r.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/);
      return match ? match[1].trim() : null;
    })
    .filter((r): r is string => r !== null);

  const allLinks = [...new Set([...wikilinks, ...relatedLinks])];

  // Add backlinks to cited articles
  let backlinksAdded = 0;
  for (const link of allLinks) {
    const added = await addBacklink(paths.wiki, link, frontmatter.title);
    if (added) backlinksAdded++;
  }

  // Update index
  await updateIndex(paths.wiki, updatedFrontmatter.title, targetType);

  // Delete source file
  await unlink(sourcePath);

  // Output result
  const result: PromoteResult = {
    source: queryFile,
    destination: destRelPath,
    backlinks_added: backlinksAdded,
  };

  if (isTTY) {
    console.log(`${styles.success.render(symbols.success)} Promoted: ${styles.path.render(queryFile)}`);
    console.log(`  → ${styles.path.render(destRelPath)}`);
    if (backlinksAdded > 0) {
      console.log(`  Added backlinks to ${backlinksAdded} cited article${backlinksAdded !== 1 ? 's' : ''}`);
    }
  } else {
    output(result);
  }

  return 0;
}

// =============================================================================
// Backlink Management
// =============================================================================

/**
 * Add a backlink to a cited article
 */
async function addBacklink(wikiDir: string, citedTitle: string, fromTitle: string): Promise<boolean> {
  // Find the cited article
  const slug = titleToSlug(citedTitle);
  const subdirs = ['concepts', 'entities', 'syntheses'];

  for (const subdir of subdirs) {
    const filePath = join(wikiDir, subdir, `${slug}.md`);
    const file = Bun.file(filePath);

    if (await file.exists()) {
      try {
        const content = await file.text();
        const { frontmatter, body } = parseFrontmatter(content);

        if (!frontmatter) continue;

        // Check if backlink already exists
        const fromLink = `[[${fromTitle}]]`;
        if (frontmatter.related.some((r) => r.includes(fromTitle))) {
          return false; // Already has backlink
        }

        // Add backlink to related
        const updatedFrontmatter: Frontmatter = {
          ...frontmatter,
          related: [...frontmatter.related, fromLink],
          updated: new Date().toISOString(),
        };

        const updatedContent = createArticle(updatedFrontmatter, body);
        await Bun.write(filePath, updatedContent);

        return true;
      } catch {
        // Skip files that can't be parsed
      }
    }
  }

  return false;
}

// =============================================================================
// Index Management
// =============================================================================

/**
 * Update the wiki index with the promoted article
 */
async function updateIndex(wikiDir: string, title: string, type: ArticleType): Promise<void> {
  const indexPath = join(wikiDir, '_index.md');
  const indexFile = Bun.file(indexPath);

  let content: string;
  if (await indexFile.exists()) {
    content = await indexFile.text();
  } else {
    // Create basic index structure
    content = `# Index

## Concepts

## Entities

## Syntheses
`;
  }

  // Find the section for this type
  const sectionName = getSectionName(type);
  const sectionRegex = new RegExp(`(## ${sectionName}\\n)([\\s\\S]*?)(?=\\n## |$)`);
  const match = content.match(sectionRegex);

  const wikilink = `- [[${title}]]`;

  if (match) {
    // Check if already in index
    if (match[2].includes(`[[${title}]]`)) {
      return; // Already indexed
    }

    // Add to section
    const existingItems = match[2].trim();
    const newItems = existingItems ? `${existingItems}\n${wikilink}` : wikilink;

    // Sort items alphabetically
    const sortedItems = newItems
      .split('\n')
      .filter((line) => line.trim())
      .sort((a, b) => a.localeCompare(b))
      .join('\n');

    content = content.replace(sectionRegex, `$1${sortedItems}\n\n`);
  } else {
    // Section doesn't exist, append it
    content += `\n## ${sectionName}\n\n${wikilink}\n`;
  }

  await Bun.write(indexPath, content.trim() + '\n');
}

/**
 * Get the section name for an article type
 */
function getSectionName(type: ArticleType): string {
  switch (type) {
    case 'concept':
      return 'Concepts';
    case 'entity':
      return 'Entities';
    case 'synthesis':
      return 'Syntheses';
    case 'query':
      return 'Queries';
  }
}

export default promote;
