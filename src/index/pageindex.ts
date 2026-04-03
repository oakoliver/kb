/**
 * Pageindex tree-search wrapper for semantic content retrieval
 * @module index/pageindex
 */

import { readdir } from 'fs/promises';
import { join } from 'path';
import { parseFrontmatter, extractSummary } from '../core/markdown';
import { buildIndex, search, type BM25Index } from './bm25';
import type { ArticleType } from '../core/schemas';

// =============================================================================
// Types
// =============================================================================

export interface ContentSection {
  heading: string;
  content: string;
  level: number;
}

export interface ContentNode {
  path: string;
  title: string;
  type: ArticleType;
  sections: ContentSection[];
  fullContent: string;
}

export interface SearchContentResult {
  path: string;
  title: string;
  type: ArticleType;
  content: string;
  score: number;
}

export interface SearchContentOptions {
  limit?: number;
}

// =============================================================================
// Content Tree Building
// =============================================================================

/**
 * Build a structured content tree from wiki articles
 */
export async function buildContentTree(wikiDir: string): Promise<ContentNode[]> {
  const nodes: ContentNode[] = [];
  const subdirs = ['concepts', 'entities', 'syntheses'];

  for (const subdir of subdirs) {
    const dir = join(wikiDir, subdir);

    try {
      const files = await readdir(dir);

      for (const file of files) {
        if (!file.endsWith('.md') || file.startsWith('_')) continue;

        const filePath = join(dir, file);
        const relativePath = `wiki/${subdir}/${file}`;

        try {
          const content = await Bun.file(filePath).text();
          const { frontmatter, body } = parseFrontmatter(content);

          if (frontmatter) {
            const sections = parseMarkdownSections(body);

            nodes.push({
              path: relativePath,
              title: frontmatter.title,
              type: frontmatter.type,
              sections,
              fullContent: body,
            });
          }
        } catch {
          // Skip files that can't be parsed
        }
      }
    } catch {
      // Directory doesn't exist
    }
  }

  return nodes;
}

/**
 * Parse markdown content into sections based on headings
 */
function parseMarkdownSections(content: string): ContentSection[] {
  const sections: ContentSection[] = [];
  const lines = content.split('\n');

  let currentSection: ContentSection | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      // Save previous section
      if (currentSection) {
        currentSection.content = currentContent.join('\n').trim();
        if (currentSection.content) {
          sections.push(currentSection);
        }
      }

      // Start new section
      currentSection = {
        heading: headingMatch[2].trim(),
        content: '',
        level: headingMatch[1].length,
      };
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.content = currentContent.join('\n').trim();
    if (currentSection.content) {
      sections.push(currentSection);
    }
  }

  return sections;
}

// =============================================================================
// Content Search
// =============================================================================

/**
 * Search for relevant content based on a question
 * Uses BM25 for initial retrieval, then returns full article content
 */
export async function searchRelevantContent(
  wikiDir: string,
  query: string,
  options: SearchContentOptions = {}
): Promise<SearchContentResult[]> {
  const { limit = 5 } = options;

  // Build BM25 index and search
  const index = await buildIndex(wikiDir);

  if (index.documents.length === 0) {
    return [];
  }

  const searchResults = search(index, query, { limit });

  // Map results to content with full text
  const results: SearchContentResult[] = [];

  for (const result of searchResults) {
    const doc = index.documents.find((d) => d.path === result.path);
    if (doc) {
      results.push({
        path: doc.path,
        title: doc.title,
        type: doc.type,
        content: doc.content,
        score: result.score,
      });
    }
  }

  return results;
}

/**
 * Get article content by path
 */
export async function getArticleContent(
  wikiDir: string,
  articlePath: string
): Promise<{ title: string; content: string } | null> {
  // articlePath is like "wiki/concepts/attention.md"
  // We need to convert to actual file path
  const actualPath = join(wikiDir, '..', articlePath);

  try {
    const file = Bun.file(actualPath);
    if (!(await file.exists())) {
      return null;
    }

    const content = await file.text();
    const { frontmatter, body } = parseFrontmatter(content);

    if (!frontmatter) {
      return null;
    }

    return {
      title: frontmatter.title,
      content: body,
    };
  } catch {
    return null;
  }
}

/**
 * Get multiple articles by paths for Q&A context
 */
export async function getArticlesForContext(
  wikiDir: string,
  paths: string[]
): Promise<Array<{ title: string; content: string }>> {
  const articles: Array<{ title: string; content: string }> = [];

  for (const path of paths) {
    const article = await getArticleContent(wikiDir, path);
    if (article) {
      articles.push(article);
    }
  }

  return articles;
}
