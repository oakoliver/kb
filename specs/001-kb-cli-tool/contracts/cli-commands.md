# CLI Command Contracts: @oakoliver/kb

**Date**: 2026-04-03  
**Feature**: 001-kb-cli-tool

This document defines the contract for each CLI command including arguments, options, output formats, and exit codes.

---

## Global Options

All commands support these options:

| Option | Type | Description |
|--------|------|-------------|
| `--json` | boolean | Force JSON output (default when piped) |
| `--help`, `-h` | boolean | Show command help |
| `--version`, `-v` | boolean | Show version |

---

## kb init

Initialize a new knowledge base.

### Synopsis

```
kb init [path] [--global]
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `path` | No | `kb` | Directory name to create |

### Options

| Option | Type | Description |
|--------|------|-------------|
| `--global` | boolean | Create at `~/.kb/` instead of local |

### Output

**TTY Mode**:
```
✓ Knowledge base initialized at ./my-wiki/

Created:
  raw/           Source documents
  wiki/          Compiled articles
  queries/       Query outputs
  .kb/config.json Configuration
```

**JSON Mode**:
```json
{
  "path": "/absolute/path/to/my-wiki",
  "created": ["raw", "wiki", "queries", ".kb"]
}
```

### Exit Codes

| Code | Condition |
|------|-----------|
| 0 | Success |
| 1 | Directory already exists / contains wiki |

---

## kb ingest

Add a source to the knowledge base.

### Synopsis

```
kb ingest <source> [--type <type>] [--title <title>]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `source` | Yes | URL, file path, or git repo URL |

### Options

| Option | Type | Values | Description |
|--------|------|--------|-------------|
| `--type` | string | `article`, `paper`, `code` | Force source type |
| `--title` | string | | Override extracted title |

### Output

**TTY Mode**:
```
⣾ Fetching https://arxiv.org/abs/1706.03762...
✓ Ingested: Attention Is All You Need
  → raw/papers/attention-is-all-you-need.md
```

**JSON Mode**:
```json
{
  "path": "raw/papers/attention-is-all-you-need.md",
  "title": "Attention Is All You Need",
  "type": "paper",
  "hash": "a1b2c3d4...",
  "skipped": false
}
```

### Exit Codes

| Code | Condition |
|------|-----------|
| 0 | Success (or duplicate skipped) |
| 1 | Fetch/parse error |

---

## kb compile

Compile sources into wiki articles.

### Synopsis

```
kb compile [--full] [--dry-run]
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `--full` | boolean | Recompile all articles (ignore cache) |
| `--dry-run` | boolean | Show changes without writing |

### Output

**TTY Mode**:
```
⣾ Compiling 3 changed sources...
  ✓ Created: wiki/concepts/attention-mechanism.md
  ✓ Updated: wiki/entities/transformer.md
  ✓ Created: wiki/syntheses/llm-architectures.md

Compiled 3 articles in 4.2s
```

**JSON Mode**:
```json
{
  "created": ["wiki/concepts/attention-mechanism.md"],
  "updated": ["wiki/entities/transformer.md"],
  "deleted": [],
  "unchanged": 42,
  "duration_ms": 4200
}
```

### Exit Codes

| Code | Condition |
|------|-----------|
| 0 | Success |
| 1 | LLM API error / compilation failure |

---

## kb find

Fast keyword search using BM25.

### Synopsis

```
kb find <query> [--limit <n>]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `query` | Yes | Search terms |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--limit` | number | 10 | Max results |

### Output

**TTY Mode**:
```
wiki/concepts/attention-mechanism.md (0.95)
  ...allows models to focus on relevant parts of the input...

wiki/entities/transformer.md (0.82)
  ...the Transformer architecture uses self-attention...
```

**JSON Mode**:
```json
{
  "results": [
    {
      "path": "wiki/concepts/attention-mechanism.md",
      "title": "Attention Mechanism",
      "score": 0.95,
      "snippet": "...allows models to focus on relevant parts of the input..."
    }
  ],
  "total": 2
}
```

### Exit Codes

| Code | Condition |
|------|-----------|
| 0 | Results found |
| 1 | No results |

---

## kb query

Ask a question with LLM synthesis.

### Synopsis

```
kb query <question> [--no-file]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `question` | Yes | Natural language question |

### Options

| Option | Type | Description |
|--------|------|-------------|
| `--no-file` | boolean | Don't save output to queries/ |

### Output

**TTY Mode** (streaming):
```
Based on the knowledge base articles, attention mechanisms...

[streams response in real-time]

---
Sources: [[Attention Mechanism]], [[Transformer Architecture]]
Saved to: queries/2026-04-03-attention-mechanisms.md
```

**JSON Mode**:
```json
{
  "answer": "Based on the knowledge base articles, attention mechanisms...",
  "sources": [
    "wiki/concepts/attention-mechanism.md",
    "wiki/concepts/transformer-architecture.md"
  ],
  "saved_to": "queries/2026-04-03-attention-mechanisms.md"
}
```

### Exit Codes

| Code | Condition |
|------|-----------|
| 0 | Success |
| 1 | LLM API error / no relevant articles |

---

## kb lint

Check wiki health.

### Synopsis

```
kb lint [--fix]
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `--fix` | boolean | Attempt to fix issues automatically |

### Output

**TTY Mode**:
```
Checking wiki health...

✗ Broken link: wiki/concepts/foo.md → [[Nonexistent]]
✗ Orphan: wiki/entities/orphaned-article.md
⚠ Stale: wiki/concepts/attention.md (source changed)

Found 2 errors, 1 warning
```

**JSON Mode**:
```json
{
  "errors": [
    {"type": "broken_link", "file": "wiki/concepts/foo.md", "link": "[[Nonexistent]]"},
    {"type": "orphan", "file": "wiki/entities/orphaned-article.md"}
  ],
  "warnings": [
    {"type": "stale", "file": "wiki/concepts/attention.md"}
  ],
  "healthy": false
}
```

### Exit Codes

| Code | Condition |
|------|-----------|
| 0 | No issues |
| 1 | Issues found |

---

## kb status

Show wiki statistics.

### Synopsis

```
kb status
```

### Output

**TTY Mode**:
```
Wiki: ./research-wiki/

Sources: 42 (3 new)
Articles: 87
  - Concepts: 45
  - Entities: 32
  - Syntheses: 10
Queries: 23

Health: 2 stale, 1 orphan
```

**JSON Mode**:
```json
{
  "path": "/absolute/path/to/research-wiki",
  "sources": {"total": 42, "new": 3},
  "articles": {
    "total": 87,
    "concepts": 45,
    "entities": 32,
    "syntheses": 10
  },
  "queries": 23,
  "health": {"stale": 2, "orphan": 1}
}
```

### Exit Codes

| Code | Condition |
|------|-----------|
| 0 | Always (informational) |

---

## kb promote

Move a query output into the wiki.

### Synopsis

```
kb promote <file> [--as <type>]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `file` | Yes | Path to query file in queries/ |

### Options

| Option | Type | Values | Description |
|--------|------|--------|-------------|
| `--as` | string | `concept`, `entity`, `synthesis` | Target article type |

### Output

**TTY Mode**:
```
✓ Promoted: queries/2026-04-03-attention.md
  → wiki/syntheses/attention-mechanisms.md
  Added backlinks to 3 cited articles
```

**JSON Mode**:
```json
{
  "source": "queries/2026-04-03-attention.md",
  "destination": "wiki/syntheses/attention-mechanisms.md",
  "backlinks_added": 3
}
```

### Exit Codes

| Code | Condition |
|------|-----------|
| 0 | Success |
| 1 | File not found / invalid format |

---

## Error Response Format

All commands use consistent error format:

**TTY Mode**:
```
Error: Missing API key

Set ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable.
See: https://docs.anthropic.com/claude/reference/getting-started
```

**JSON Mode**:
```json
{
  "error": {
    "code": "missing_api_key",
    "message": "Missing API key",
    "suggestion": "Set ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable"
  }
}
```
