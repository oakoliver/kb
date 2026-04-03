# Commands Reference

## Global Options

All commands support these options:

| Option | Description |
|--------|-------------|
| `--json` | Force JSON output (default when piped) |
| `--help`, `-h` | Show help |
| `--version`, `-v` | Show version |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error or no results |
| 2 | Invalid arguments |

---

## kb init

Initialize a new knowledge base.

### Synopsis

```bash
kb init [path] [--global]
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `path` | No | `kb` | Directory name to create |

### Options

| Option | Description |
|--------|-------------|
| `--global` | Create at `~/.kb/` instead of local |

### Examples

```bash
# Create ./kb/ in current directory
kb init

# Create ./my-research/ 
kb init my-research

# Create global wiki at ~/.kb/
kb init --global
```

### Output

**TTY:**
```
✓ Knowledge base initialized at ./my-research/

Created:
  raw/           Source documents
  wiki/          Compiled articles
  queries/       Query outputs
  .kb/config.json Configuration
```

**JSON:**
```json
{
  "path": "/absolute/path/to/my-research",
  "created": [".kb", "raw", "wiki", "queries"],
  "isGlobal": false
}
```

---

## kb ingest

Add a source to the knowledge base.

### Synopsis

```bash
kb ingest <source> [--type <type>] [--title <title>]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `source` | Yes | URL, file path, or git repo URL |

### Options

| Option | Values | Description |
|--------|--------|-------------|
| `--type` | `article`, `paper`, `code` | Force source type |
| `--title` | string | Override extracted title |

### Source Type Detection

| Source | Detected Type |
|--------|---------------|
| `https://...` | `article` |
| `*.pdf` | `paper` |
| `*.md` | `article` |
| `https://github.com/...` | `code` |

### Examples

```bash
# Ingest a web article
kb ingest https://example.com/blog/article

# Ingest a PDF
kb ingest ./papers/research.pdf

# Ingest local markdown
kb ingest ./notes/meeting.md

# Ingest git repository
kb ingest https://github.com/user/repo

# Force type and title
kb ingest ./doc.md --type paper --title "Research Paper"
```

### Output

**TTY:**
```
⣾ Fetching https://arxiv.org/abs/1706.03762...
✓ Ingested: Attention Is All You Need
  → raw/papers/attention-is-all-you-need.md
```

**JSON:**
```json
{
  "path": "raw/papers/attention-is-all-you-need.md",
  "title": "Attention Is All You Need",
  "type": "paper",
  "hash": "a1b2c3d4...",
  "skipped": false
}
```

---

## kb compile

Compile sources into wiki articles.

### Synopsis

```bash
kb compile [--full] [--dry-run]
```

### Options

| Option | Description |
|--------|-------------|
| `--full` | Recompile all articles (ignore cache) |
| `--dry-run` | Show changes without writing |

### Examples

```bash
# Incremental compile (only changed sources)
kb compile

# Full recompilation
kb compile --full

# Preview changes
kb compile --dry-run
```

### Output

**TTY:**
```
⣾ Compiling 3 changed sources...
  ✓ Created: wiki/concepts/attention-mechanism.md
  ✓ Updated: wiki/entities/transformer.md
  ✓ Created: wiki/syntheses/llm-architectures.md

Compiled 3 articles in 4.2s
```

**JSON:**
```json
{
  "created": ["wiki/concepts/attention-mechanism.md"],
  "updated": ["wiki/entities/transformer.md"],
  "deleted": [],
  "unchanged": 42,
  "duration_ms": 4200
}
```

---

## kb find

Fast keyword search using BM25.

### Synopsis

```bash
kb find <query> [--limit <n>]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `query` | Yes | Search terms |

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `--limit` | 10 | Maximum results |

### Examples

```bash
# Basic search
kb find "attention mechanism"

# Limit results
kb find "transformer" --limit 5

# Pipe to jq for processing
kb find "neural" | jq '.[0].path'
```

### Output

**TTY:**
```
wiki/concepts/attention-mechanism.md (0.95)
  ...allows models to focus on relevant parts of the input...

wiki/entities/transformer.md (0.82)
  ...the Transformer architecture uses self-attention...
```

**JSON:**
```json
{
  "results": [
    {
      "path": "wiki/concepts/attention-mechanism.md",
      "title": "Attention Mechanism",
      "score": 0.95,
      "snippet": "...allows models to focus on relevant parts..."
    }
  ],
  "total": 2
}
```

---

## kb query

Ask a question with LLM synthesis.

### Synopsis

```bash
kb query <question> [--no-file]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `question` | Yes | Natural language question |

### Options

| Option | Description |
|--------|-------------|
| `--no-file` | Don't save output to queries/ |

### Examples

```bash
# Ask a question (saves to queries/)
kb query "How does attention work in transformers?"

# Ask without saving
kb query "What is BERT?" --no-file
```

### Output

**TTY (streaming):**
```
Based on the knowledge base articles, attention mechanisms...

[streams response in real-time]

---
Sources: [[Attention Mechanism]], [[Transformer Architecture]]
Saved to: queries/2026-04-03-attention-mechanisms.md
```

**JSON:**
```json
{
  "answer": "Based on the knowledge base articles...",
  "sources": [
    "wiki/concepts/attention-mechanism.md",
    "wiki/concepts/transformer-architecture.md"
  ],
  "saved_to": "queries/2026-04-03-attention-mechanisms.md"
}
```

---

## kb lint

Check wiki health.

### Synopsis

```bash
kb lint [--fix]
```

### Options

| Option | Description |
|--------|-------------|
| `--fix` | Attempt to fix issues automatically |

### Checks Performed

- **Broken links**: Wikilinks that don't resolve
- **Orphan articles**: Articles with no sources or backlinks
- **Stale articles**: Sources changed since compilation
- **Invalid frontmatter**: Schema validation errors

### Examples

```bash
# Check health
kb lint

# Check and fix
kb lint --fix
```

### Output

**TTY:**
```
Checking wiki health...

✗ Broken link: wiki/concepts/foo.md → [[Nonexistent]]
✗ Orphan: wiki/entities/orphaned-article.md
⚠ Stale: wiki/concepts/attention.md (source changed)

Found 2 errors, 1 warning
```

**JSON:**
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

---

## kb status

Show wiki statistics.

### Synopsis

```bash
kb status
```

### Examples

```bash
kb status
kb status | jq '.articles.total'
```

### Output

**TTY:**
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

**JSON:**
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

---

## kb promote

Move a query output into the wiki.

### Synopsis

```bash
kb promote <file> [--as <type>]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `file` | Yes | Path to query file in queries/ |

### Options

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `--as` | `concept`, `entity`, `synthesis` | `synthesis` | Target article type |

### Examples

```bash
# Promote as synthesis (default)
kb promote queries/2026-04-03-attention.md

# Promote as concept
kb promote queries/2026-04-03-attention.md --as concept
```

### Output

**TTY:**
```
✓ Promoted: queries/2026-04-03-attention.md
  → wiki/syntheses/attention-mechanisms.md
  Added backlinks to 3 cited articles
```

**JSON:**
```json
{
  "source": "queries/2026-04-03-attention.md",
  "destination": "wiki/syntheses/attention-mechanisms.md",
  "backlinks_added": 3
}
```
