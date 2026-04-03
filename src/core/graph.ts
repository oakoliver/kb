/**
 * Dependency graph for tracking source → article relationships
 * @module core/graph
 */

import { GraphSchema, createEmptyGraph, type Graph, type GraphNode } from './schemas';
import { ZodError } from 'zod';

// Re-export types
export type { Graph, GraphNode } from './schemas';

// =============================================================================
// Graph CRUD Operations
// =============================================================================

/**
 * Create a new empty graph file
 */
export async function createGraph(path: string): Promise<Graph> {
  const graph = createEmptyGraph();
  await saveGraph(path, graph);
  return graph;
}

/**
 * Load and validate graph from file
 */
export async function loadGraph(path: string): Promise<Graph> {
  const file = Bun.file(path);

  if (!(await file.exists())) {
    throw new GraphNotFoundError(path);
  }

  try {
    const content = await file.text();
    const raw = JSON.parse(content);
    return GraphSchema.parse(raw);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new GraphParseError(path, `Invalid JSON: ${err.message}`);
    }
    if (err instanceof ZodError) {
      throw new GraphValidationError(path, err);
    }
    throw err;
  }
}

/**
 * Save graph to file
 */
export async function saveGraph(path: string, graph: Graph): Promise<void> {
  const validated = GraphSchema.parse(graph);
  const content = JSON.stringify(validated, null, 2);
  await Bun.write(path, content);
}

/**
 * Load graph or create if it doesn't exist
 */
export async function loadOrCreateGraph(path: string): Promise<Graph> {
  const file = Bun.file(path);
  if (await file.exists()) {
    return loadGraph(path);
  }
  return createGraph(path);
}

// =============================================================================
// Node Operations (Pure Functions)
// =============================================================================

/**
 * Add or update a node in the graph
 */
export function setNode(graph: Graph, articlePath: string, node: GraphNode): Graph {
  return {
    ...graph,
    nodes: {
      ...graph.nodes,
      [articlePath]: node,
    },
  };
}

/**
 * Remove a node from the graph
 */
export function removeNode(graph: Graph, articlePath: string): Graph {
  const { [articlePath]: removed, ...remaining } = graph.nodes;
  return {
    ...graph,
    nodes: remaining,
  };
}

/**
 * Get a node by article path
 */
export function getNode(graph: Graph, articlePath: string): GraphNode | null {
  return graph.nodes[articlePath] || null;
}

/**
 * Check if an article exists in the graph
 */
export function hasNode(graph: Graph, articlePath: string): boolean {
  return articlePath in graph.nodes;
}

// =============================================================================
// Dependency Operations
// =============================================================================

/**
 * Add a dependency (source → article)
 */
export function addDependency(graph: Graph, articlePath: string, sourcePath: string): Graph {
  const existing = graph.nodes[articlePath] || { dependsOn: [], dependents: [] };

  if (existing.dependsOn.includes(sourcePath)) {
    return graph;
  }

  return setNode(graph, articlePath, {
    ...existing,
    dependsOn: [...existing.dependsOn, sourcePath],
  });
}

/**
 * Add a dependent (article → dependent article)
 */
export function addDependent(graph: Graph, articlePath: string, dependentPath: string): Graph {
  const existing = graph.nodes[articlePath] || { dependsOn: [], dependents: [] };

  if (existing.dependents.includes(dependentPath)) {
    return graph;
  }

  return setNode(graph, articlePath, {
    ...existing,
    dependents: [...existing.dependents, dependentPath],
  });
}

/**
 * Get all sources an article depends on
 */
export function getDependencies(graph: Graph, articlePath: string): string[] {
  return graph.nodes[articlePath]?.dependsOn || [];
}

/**
 * Get all articles that depend on a given article
 */
export function getDependents(graph: Graph, articlePath: string): string[] {
  return graph.nodes[articlePath]?.dependents || [];
}

/**
 * Get all articles that depend on a source (directly or indirectly)
 */
export function getArticlesForSource(graph: Graph, sourcePath: string): string[] {
  const articles: string[] = [];

  for (const [articlePath, node] of Object.entries(graph.nodes)) {
    if (node.dependsOn.includes(sourcePath)) {
      articles.push(articlePath);
    }
  }

  return articles;
}

// =============================================================================
// Stale Detection
// =============================================================================

export interface StaleArticle {
  articlePath: string;
  changedSources: string[];
}

/**
 * Find articles that are stale due to source changes
 */
export async function findStaleArticles(
  graph: Graph,
  changedSourcePaths: string[]
): Promise<StaleArticle[]> {
  const staleArticles: StaleArticle[] = [];
  const visited = new Set<string>();

  // For each changed source, find all dependent articles
  for (const sourcePath of changedSourcePaths) {
    const directDependents = getArticlesForSource(graph, sourcePath);

    for (const articlePath of directDependents) {
      if (visited.has(articlePath)) continue;
      visited.add(articlePath);

      // Find which sources changed for this article
      const node = graph.nodes[articlePath];
      const changedSources = node.dependsOn.filter((s) => changedSourcePaths.includes(s));

      if (changedSources.length > 0) {
        staleArticles.push({
          articlePath,
          changedSources,
        });

        // Also mark transitive dependents as stale
        await markTransitiveDependentsStale(graph, articlePath, staleArticles, visited);
      }
    }
  }

  return staleArticles;
}

/**
 * Recursively mark dependent articles as stale
 */
async function markTransitiveDependentsStale(
  graph: Graph,
  articlePath: string,
  staleArticles: StaleArticle[],
  visited: Set<string>
): Promise<void> {
  const dependents = getDependents(graph, articlePath);

  for (const dependentPath of dependents) {
    if (visited.has(dependentPath)) continue;
    visited.add(dependentPath);

    // The dependent is stale because one of its dependencies changed
    staleArticles.push({
      articlePath: dependentPath,
      changedSources: [articlePath], // The changed "source" is actually another article
    });

    // Continue recursively
    await markTransitiveDependentsStale(graph, dependentPath, staleArticles, visited);
  }
}

/**
 * Get all article paths in the graph
 */
export function getAllArticles(graph: Graph): string[] {
  return Object.keys(graph.nodes);
}

/**
 * Get orphan articles (no sources, no dependents)
 */
export function findOrphans(graph: Graph): string[] {
  const orphans: string[] = [];

  for (const [articlePath, node] of Object.entries(graph.nodes)) {
    if (node.dependsOn.length === 0 && node.dependents.length === 0) {
      orphans.push(articlePath);
    }
  }

  return orphans;
}

// =============================================================================
// Graph Analysis
// =============================================================================

/**
 * Get graph statistics
 */
export function getGraphStats(graph: Graph): {
  totalArticles: number;
  totalDependencies: number;
  orphanCount: number;
  averageDependencies: number;
} {
  const articles = Object.keys(graph.nodes);
  const totalArticles = articles.length;

  let totalDependencies = 0;
  for (const node of Object.values(graph.nodes)) {
    totalDependencies += node.dependsOn.length;
  }

  const orphans = findOrphans(graph);

  return {
    totalArticles,
    totalDependencies,
    orphanCount: orphans.length,
    averageDependencies: totalArticles > 0 ? totalDependencies / totalArticles : 0,
  };
}

// =============================================================================
// Errors
// =============================================================================

export class GraphNotFoundError extends Error {
  constructor(public path: string) {
    super(`Graph not found: ${path}`);
    this.name = 'GraphNotFoundError';
  }
}

export class GraphParseError extends Error {
  constructor(
    public path: string,
    public details: string
  ) {
    super(`Failed to parse graph at ${path}: ${details}`);
    this.name = 'GraphParseError';
  }
}

export class GraphValidationError extends Error {
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
    super(`Invalid graph at ${path}:\n${details}`);
    this.name = 'GraphValidationError';
    this.issues = issues;
  }
}
