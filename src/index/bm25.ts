/**
 * BM25 index operations for keyword search
 * @module index/bm25
 */

import { BM25, tokenize, type RetrievalResults } from 'bm25s';
import { readdir } from 'fs/promises';
import { join, relative } from 'path';
import { parseFrontmatter } from '../core/markdown';
import type { Frontmatter, ArticleType } from '../core/schemas';

// =============================================================================
// Types
// =============================================================================

export interface IndexDocument {
  path: string;
  title: string;
  type: ArticleType;
  content: string;
}

export interface BM25Index {
  retriever: BM25;
  documents: IndexDocument[];
}

export interface SearchResult {
  path: string;
  title: string;
  type: ArticleType;
  score: number;
  snippet: string;
}

export interface SearchOptions {
  limit?: number;
}

export interface SnippetOptions {
  maxLength?: number;
}

// =============================================================================
// Index Building
// =============================================================================

/**
 * Build a BM25 index from wiki articles
 */
export async function buildIndex(wikiDir: string): Promise<BM25Index> {
  const documents = await collectDocuments(wikiDir);

  if (documents.length === 0) {
    return {
      retriever: new BM25(),
      documents: [],
    };
  }

  // Tokenize all document contents
  const corpus = documents.map((doc) => doc.content);
  const corpusTokens = tokenize(corpus);

  // Create and populate the BM25 index
  const retriever = new BM25();
  retriever.index(corpusTokens);

  return {
    retriever,
    documents,
  };
}

/**
 * Collect all wiki documents with frontmatter
 */
async function collectDocuments(wikiDir: string): Promise<IndexDocument[]> {
  const documents: IndexDocument[] = [];
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
            documents.push({
              path: relativePath,
              title: frontmatter.title,
              type: frontmatter.type,
              content: body,
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

  return documents;
}

// =============================================================================
// Search
// =============================================================================

/**
 * Search the index for documents matching a query
 */
export function search(index: BM25Index, query: string, options: SearchOptions = {}): SearchResult[] {
  const { limit = 10 } = options;

  if (index.documents.length === 0) {
    return [];
  }

  // Tokenize the query
  const queryTokens = tokenize([query]);

  // Retrieve results
  const results = index.retriever.retrieve(queryTokens, { k: Math.min(limit, index.documents.length) }) as RetrievalResults;

  // Map results to documents
  const searchResults: SearchResult[] = [];

  for (let i = 0; i < results.documents[0].length; i++) {
    const docIndex = results.documents[0][i] as number;
    const score = results.scores[0][i] as number;

    // Skip results with zero score
    if (score <= 0) continue;

    const doc = index.documents[docIndex];
    if (!doc) continue;

    searchResults.push({
      path: doc.path,
      title: doc.title,
      type: doc.type,
      score,
      snippet: extractSnippet(doc.content, query),
    });
  }

  return searchResults;
}

// =============================================================================
// Snippet Extraction
// =============================================================================

/**
 * Extract a snippet of text around the query terms
 */
export function extractSnippet(content: string, query: string, options: SnippetOptions = {}): string {
  const { maxLength = 150 } = options;

  // Clean up content (remove markdown formatting)
  const cleanContent = content
    .replace(/^#+\s+.*$/gm, '') // Remove headings
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1') // Remove wikilinks
    .replace(/`([^`]+)`/g, '$1') // Remove inline code
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  if (cleanContent.length <= maxLength) {
    return cleanContent;
  }

  // Find query terms in content
  const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  let bestPosition = 0;
  let bestScore = 0;

  // Search for the position with most query term matches
  const words = cleanContent.split(' ');
  for (let i = 0; i < words.length; i++) {
    let score = 0;
    const wordLower = words[i].toLowerCase();

    for (const term of queryTerms) {
      if (wordLower.includes(term)) {
        score++;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestPosition = i;
    }
  }

  // Calculate character position
  let charPosition = 0;
  for (let i = 0; i < bestPosition && i < words.length; i++) {
    charPosition += words[i].length + 1;
  }

  // Extract snippet centered around the best position
  const halfLength = Math.floor(maxLength / 2);
  let start = Math.max(0, charPosition - halfLength);
  let end = Math.min(cleanContent.length, start + maxLength);

  // Adjust to word boundaries
  if (start > 0) {
    const nextSpace = cleanContent.indexOf(' ', start);
    if (nextSpace !== -1 && nextSpace < start + 20) {
      start = nextSpace + 1;
    }
  }

  if (end < cleanContent.length) {
    const lastSpace = cleanContent.lastIndexOf(' ', end);
    if (lastSpace > end - 20 && lastSpace > start) {
      end = lastSpace;
    }
  }

  let snippet = cleanContent.slice(start, end).trim();

  // Add ellipsis if truncated
  if (start > 0) {
    snippet = '...' + snippet;
  }
  if (end < cleanContent.length) {
    snippet = snippet + '...';
  }

  return snippet;
}

// =============================================================================
// Index Persistence
// =============================================================================

/**
 * Save index to disk
 */
export async function saveIndex(index: BM25Index, dir: string): Promise<void> {
  // Save the BM25 retriever
  await index.retriever.save(dir);

  // Save document metadata
  const metadataPath = join(dir, 'documents.json');
  await Bun.write(metadataPath, JSON.stringify(index.documents, null, 2));
}

/**
 * Load index from disk
 */
export async function loadIndex(dir: string): Promise<BM25Index> {
  // Load the BM25 retriever
  const retriever = await BM25.load(dir);

  // Load document metadata
  const metadataPath = join(dir, 'documents.json');
  const metadataFile = Bun.file(metadataPath);

  if (!(await metadataFile.exists())) {
    throw new Error(`Index metadata not found: ${metadataPath}`);
  }

  const documents = (await metadataFile.json()) as IndexDocument[];

  return {
    retriever,
    documents,
  };
}
