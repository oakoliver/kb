# Data Model: @oakoliver/kb

**Date**: 2026-04-03  
**Feature**: 001-kb-cli-tool

## Overview

The knowledge base uses JSON files for all persistent state. This document defines the schemas, relationships, and validation rules for each entity.

---

## Entity Relationship Diagram

```
┌─────────────────┐         ┌─────────────────┐
│     Config      │         │    Manifest     │
│  .kb/config.json│         │ raw/_manifest   │
└─────────────────┘         └────────┬────────┘
                                     │ contains
                                     ▼
                            ┌─────────────────┐
                            │  ManifestEntry  │
                            │  (Source)       │
                            └────────┬────────┘
                                     │ compiled into
                                     ▼
┌─────────────────┐         ┌─────────────────┐
│  DependencyGraph│◄────────│    Article      │
│ wiki/meta/graph │ tracks  │  wiki/**/*.md   │
└─────────────────┘         └────────┬────────┘
                                     │ references
                                     ▼
                            ┌─────────────────┐
                            │    Article      │
                            │  (via wikilink) │
                            └─────────────────┘
```

---

## 1. Config

**Location**: `.kb/config.json`  
**Owner**: Human (edits configuration)  
**Purpose**: Store user preferences and LLM provider settings

### Schema (Zod)

```typescript
import { z } from 'zod';

export const ConfigSchema = z.object({
  version: z.literal(1),
  llm: z.object({
    provider: z.enum(['anthropic', 'openai']),
    model: z.string().default('claude-sonnet-4-20250514'),
  }),
  wiki: z.object({
    name: z.string().optional(),
    linkStyle: z.enum(['wikilink', 'markdown']).default('wikilink'),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;
```

### Example

```json
{
  "version": 1,
  "llm": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514"
  },
  "wiki": {
    "name": "Research Notes",
    "linkStyle": "wikilink"
  }
}
```

### Validation Rules

- `version` must be `1` (for future migrations)
- `provider` determines which API key env var is required
- `model` defaults to Claude Sonnet if not specified

---

## 2. Manifest

**Location**: `raw/_manifest.json`  
**Owner**: System (auto-generated)  
**Purpose**: Track all ingested sources with metadata for change detection

### Schema (Zod)

```typescript
export const SourceType = z.enum(['article', 'paper', 'code', 'media']);

export const ManifestEntrySchema = z.object({
  path: z.string(),                    // Relative path in raw/
  sourceUrl: z.string().url().optional(), // Original URL if from web
  title: z.string(),                   // Extracted or user-provided title
  dateAdded: z.string().datetime(),    // ISO 8601 timestamp
  hash: z.string(),                    // SHA-256 of content for change detection
  type: SourceType,
});

export const ManifestSchema = z.object({
  version: z.literal(1),
  entries: z.array(ManifestEntrySchema),
});

export type ManifestEntry = z.infer<typeof ManifestEntrySchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
```

### Example

```json
{
  "version": 1,
  "entries": [
    {
      "path": "articles/attention-is-all-you-need.md",
      "sourceUrl": "https://arxiv.org/abs/1706.03762",
      "title": "Attention Is All You Need",
      "dateAdded": "2026-04-03T10:30:00Z",
      "hash": "a1b2c3d4e5f6...",
      "type": "paper"
    },
    {
      "path": "notes/meeting-notes.md",
      "title": "Meeting Notes 2026-04-01",
      "dateAdded": "2026-04-01T15:00:00Z",
      "hash": "f6e5d4c3b2a1...",
      "type": "article"
    }
  ]
}
```

### Validation Rules

- `path` must be relative to `raw/` directory
- `hash` is computed from file content (SHA-256)
- `dateAdded` is set at ingestion time, never updated
- Duplicate detection: same `hash` = same content = skip re-ingestion

### Operations

| Operation | Behavior |
|-----------|----------|
| Add entry | Append to entries, compute hash |
| Check duplicate | Find entry with matching hash |
| Detect changes | Compare stored hash vs current file hash |
| Remove entry | Delete from entries array |

---

## 3. Article (Frontmatter)

**Location**: `wiki/**/*.md`  
**Owner**: LLM (compiles from sources)  
**Purpose**: Structured wiki articles with YAML frontmatter

### Schema (Zod)

```typescript
export const ArticleType = z.enum(['concept', 'entity', 'synthesis', 'query']);

export const FrontmatterSchema = z.object({
  title: z.string(),
  type: ArticleType,
  created: z.string().datetime(),      // ISO 8601
  updated: z.string().datetime(),      // ISO 8601
  sources: z.array(z.string()),        // Paths to raw/ files
  related: z.array(z.string()),        // Wikilinks to other articles
  tags: z.array(z.string()).optional(),
});

export type Frontmatter = z.infer<typeof FrontmatterSchema>;
```

### Example (YAML in markdown file)

```yaml
---
title: Attention Mechanism
type: concept
created: 2026-04-03T10:35:00Z
updated: 2026-04-03T10:35:00Z
sources:
  - articles/attention-is-all-you-need.md
  - articles/bert-paper.md
related:
  - "[[Transformer Architecture]]"
  - "[[Self-Attention]]"
tags:
  - machine-learning
  - nlp
---

# Attention Mechanism

The attention mechanism allows models to focus on relevant parts of the input...
```

### Article Types

| Type | Purpose | Location |
|------|---------|----------|
| `concept` | Abstract ideas, techniques | `wiki/concepts/` |
| `entity` | Named things (people, orgs, models) | `wiki/entities/` |
| `synthesis` | Multi-source summaries | `wiki/syntheses/` |
| `query` | Q&A responses (promoted) | `wiki/` or `queries/` |

### State Transitions

```
[New Source] ──compile──► [Draft Article] ──validate──► [Published]
                                │
                                │ source changed
                                ▼
                          [Stale Article] ──recompile──► [Published]
```

### Validation Rules

- `title` must be non-empty
- `sources` must reference existing files in `raw/`
- `related` must be valid wikilinks to existing articles
- `updated` >= `created`

---

## 4. Dependency Graph

**Location**: `wiki/meta/graph.json`  
**Owner**: System (auto-generated during compile)  
**Purpose**: Track source → article dependencies for incremental compilation

### Schema (Zod)

```typescript
export const GraphNodeSchema = z.object({
  dependsOn: z.array(z.string()),   // Source paths this article depends on
  dependents: z.array(z.string()),  // Articles that depend on this one
});

export const GraphSchema = z.object({
  version: z.literal(1),
  nodes: z.record(z.string(), GraphNodeSchema), // Key = article path
});

export type GraphNode = z.infer<typeof GraphNodeSchema>;
export type Graph = z.infer<typeof GraphSchema>;
```

### Example

```json
{
  "version": 1,
  "nodes": {
    "wiki/concepts/attention-mechanism.md": {
      "dependsOn": [
        "raw/articles/attention-is-all-you-need.md",
        "raw/articles/bert-paper.md"
      ],
      "dependents": [
        "wiki/concepts/transformer-architecture.md",
        "wiki/entities/gpt-4.md"
      ]
    }
  }
}
```

### Operations

| Operation | Behavior |
|-----------|----------|
| Mark stale | When source hash changes, mark all dependent articles as stale |
| Incremental compile | Only recompile articles whose sources changed |
| Full compile | Ignore graph, recompile everything |

---

## 5. Index

**Location**: `wiki/_index.md`  
**Owner**: System (auto-generated)  
**Purpose**: Table of contents for all wiki articles

### Format

```markdown
# Index

## Concepts

- [[Attention Mechanism]]
- [[Transformer Architecture]]

## Entities

- [[GPT-4]]
- [[Claude]]

## Syntheses

- [[Comparison of LLM Architectures]]
```

### Generation Rules

- Grouped by article type
- Alphabetically sorted within groups
- Uses wikilinks for Obsidian compatibility
- Regenerated on every compile

---

## 6. Query Output

**Location**: `queries/YYYY-MM-DD-<slug>.md`  
**Owner**: LLM (generated), Human (reviews)  
**Purpose**: Store Q&A session outputs for potential promotion

### Format

```yaml
---
title: What quantization methods work best for attention?
type: query
created: 2026-04-03T14:20:00Z
updated: 2026-04-03T14:20:00Z
sources: []
related:
  - "[[Attention Mechanism]]"
  - "[[Quantization]]"
---

# What quantization methods work best for attention?

Based on the knowledge base articles...

## Sources Cited

- [[Attention Mechanism]]
- [[Quantization]]
```

### Filename Convention

`YYYY-MM-DD-<slug>.md` where slug is derived from question (lowercase, hyphens, max 50 chars)

Example: `2026-04-03-quantization-methods-attention.md`

---

## Directory Structure

```
<wiki-root>/
├── .kb/
│   └── config.json          # Config entity
├── raw/
│   ├── _manifest.json       # Manifest entity
│   ├── articles/            # Ingested web articles
│   ├── papers/              # Ingested PDFs
│   ├── code/                # Ingested repos
│   └── media/               # Downloaded images
├── wiki/
│   ├── _index.md            # Index entity
│   ├── meta/
│   │   └── graph.json       # DependencyGraph entity
│   ├── concepts/            # Concept articles
│   ├── entities/            # Entity articles
│   └── syntheses/           # Synthesis articles
└── queries/
    └── *.md                 # Query outputs
```

---

## Validation Summary

| Entity | File | Schema |
|--------|------|--------|
| Config | `.kb/config.json` | `ConfigSchema` |
| Manifest | `raw/_manifest.json` | `ManifestSchema` |
| Frontmatter | `wiki/**/*.md` (YAML) | `FrontmatterSchema` |
| Graph | `wiki/meta/graph.json` | `GraphSchema` |
| Index | `wiki/_index.md` | N/A (generated markdown) |
| Query | `queries/*.md` | `FrontmatterSchema` (type=query) |

All schemas defined with Zod for runtime validation and TypeScript type inference.
