# How It Works

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                        kb CLI Tool                             │
├────────────────────────────────────────────────────────────────┤
│  Commands Layer                                                 │
│  ┌──────┐ ┌──────┐ ┌───────┐ ┌────┐ ┌─────┐ ┌────┐ ┌──────┐   │
│  │ init │ │ingest│ │compile│ │find│ │query│ │lint│ │status│   │
│  └──────┘ └──────┘ └───────┘ └────┘ └─────┘ └────┘ └──────┘   │
├────────────────────────────────────────────────────────────────┤
│  Core Layer                                                     │
│  ┌────────┐ ┌────────┐ ┌───────┐ ┌────────┐ ┌─────────┐       │
│  │resolver│ │manifest│ │ graph │ │markdown│ │ schemas │       │
│  └────────┘ └────────┘ └───────┘ └────────┘ └─────────┘       │
├────────────────────────────────────────────────────────────────┤
│  Integration Layer                                              │
│  ┌─────────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │   LLM Provider  │  │   Ingestion    │  │     Index      │  │
│  │ Anthropic/OpenAI│  │ URL/PDF/Git/MD │  │  BM25/Pageindex│  │
│  └─────────────────┘  └────────────────┘  └────────────────┘  │
├────────────────────────────────────────────────────────────────┤
│  Output Layer                                                   │
│  ┌────────┐ ┌────────┐ ┌────────┐                             │
│  │ format │ │progress│ │ render │                             │
│  │TTY/JSON│ │spinners│ │markdown│                             │
│  └────────┘ └────────┘ └────────┘                             │
└────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Ingestion Flow

```
Source (URL/PDF/File/Git)
        │
        ▼
┌───────────────────┐
│  Type Detection   │  Determine: article, paper, code, media
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Content Fetch    │  URL→HTML→MD, PDF→Text, File→Copy
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Hash Computation │  SHA-256 for duplicate detection
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Manifest Update  │  Add entry to raw/_manifest.json
└─────────┬─────────┘
          │
          ▼
      raw/<type>/<slug>.md
```

### 2. Compilation Flow

```
raw/_manifest.json
        │
        ▼
┌───────────────────┐
│  Change Detection │  Compare hashes, find new/modified
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  LLM: Extraction  │  Extract concepts, entities from source
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Article Creation │  Generate frontmatter, wikilinks
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Graph Update     │  Track source→article dependencies
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Index Generation │  Update wiki/_index.md
└─────────┬─────────┘
          │
          ▼
      wiki/<type>/<slug>.md
```

### 3. Search Flow

```
Query: "attention mechanism"
        │
        ├─────────────────────────┐
        │                         │
        ▼                         ▼
┌───────────────┐        ┌───────────────┐
│   kb find     │        │   kb query    │
│   (BM25)      │        │   (LLM)       │
└───────┬───────┘        └───────┬───────┘
        │                        │
        ▼                        ▼
┌───────────────┐        ┌───────────────┐
│ Build Index   │        │ Find Context  │
│ from wiki/*   │        │ via pageindex │
└───────┬───────┘        └───────┬───────┘
        │                        │
        ▼                        ▼
┌───────────────┐        ┌───────────────┐
│ Rank Results  │        │ LLM Synthesis │
│ by BM25 score │        │ with context  │
└───────┬───────┘        └───────┬───────┘
        │                        │
        ▼                        ▼
  Ranked Results          Streaming Answer
  with Snippets           + Source Citations
```

## Key Components

### Wiki Resolver

Finds the knowledge base root by traversing up the directory tree looking for `.kb/` directory, or falls back to global `~/.kb/`.

```
/home/user/projects/research/notes/
  └── searches up for .kb/
        │
        ├── ./notes/.kb/  ✗ not found
        ├── ./research/.kb/  ✓ found! → wiki root
        └── (stop searching)
```

### Manifest (`raw/_manifest.json`)

Tracks all ingested sources with metadata:

```json
{
  "version": 1,
  "entries": [
    {
      "path": "articles/attention-paper.md",
      "sourceUrl": "https://arxiv.org/abs/1706.03762",
      "title": "Attention Is All You Need",
      "dateAdded": "2026-04-03T10:30:00Z",
      "hash": "a1b2c3d4e5f6...",
      "type": "paper"
    }
  ]
}
```

### Dependency Graph (`wiki/meta/graph.json`)

Maps relationships for incremental compilation:

```json
{
  "version": 1,
  "nodes": {
    "wiki/concepts/attention.md": {
      "dependsOn": ["raw/articles/attention-paper.md"],
      "dependents": ["wiki/entities/transformer.md"]
    }
  }
}
```

### Article Frontmatter

Every wiki article has YAML frontmatter:

```yaml
---
title: Attention Mechanism
type: concept
created: 2026-04-03T10:35:00Z
updated: 2026-04-03T10:35:00Z
sources:
  - raw/articles/attention-paper.md
related:
  - "[[Transformer Architecture]]"
  - "[[Self-Attention]]"
tags:
  - machine-learning
  - nlp
---
```

## Article Types

| Type | Directory | Purpose |
|------|-----------|---------|
| `concept` | `wiki/concepts/` | Abstract ideas, techniques, methodologies |
| `entity` | `wiki/entities/` | Named things: people, organizations, models |
| `synthesis` | `wiki/syntheses/` | Multi-source summaries and comparisons |
| `query` | `queries/` | Q&A responses (promotable to wiki) |

## Incremental Compilation

The system tracks which sources have changed to minimize LLM calls:

1. **Hash comparison**: Each source has a SHA-256 hash stored in manifest
2. **Dependency tracking**: Graph knows which articles depend on which sources
3. **Stale detection**: When source hash changes, dependent articles are marked stale
4. **Selective recompilation**: Only stale articles are recompiled

```
Source A (changed) ──┐
                     ├──► Article X (recompile)
Source B (same) ─────┘
                           │
                           ▼
                     Article Y (recompile - depends on X)
```

## TTY vs JSON Output

The CLI automatically detects output mode:

**TTY Mode** (terminal):
```
✓ Ingested: Attention Is All You Need
  → raw/papers/attention-is-all-you-need.md
```

**Piped Mode** (JSON):
```json
{
  "path": "raw/papers/attention-is-all-you-need.md",
  "title": "Attention Is All You Need",
  "type": "paper",
  "hash": "a1b2c3d4...",
  "skipped": false
}
```

Force JSON with `--json` flag or by piping output:
```bash
kb status --json
kb status | jq '.articles.total'
```

## LLM Integration

### Supported Providers

| Provider | Env Variable | Default Model |
|----------|--------------|---------------|
| Anthropic | `ANTHROPIC_API_KEY` | claude-sonnet-4-20250514 |
| OpenAI | `OPENAI_API_KEY` | gpt-4o |

### Configuration

`.kb/config.json`:
```json
{
  "version": 1,
  "llm": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514"
  },
  "wiki": {
    "name": "My Research",
    "linkStyle": "wikilink"
  }
}
```

### Error Handling

LLM operations fail fast with no partial output:
- Rate limits → Clear error with retry suggestion
- Network errors → Immediate failure, no corrupted state
- API errors → Error message with troubleshooting steps
