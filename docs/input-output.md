# Input/Output Reference

Complete reference for all data formats used by kb.

## Input Formats

### Source Types

| Type | Extensions/Patterns | Processing |
|------|---------------------|------------|
| URL | `https://...`, `http://...` | Fetch HTML, convert to markdown |
| PDF | `*.pdf` | Extract text via pageindex |
| Markdown | `*.md` | Copy directly |
| Git Repo | `https://github.com/...` | Clone, extract README |

### URL Content

**Input:** Any HTTP/HTTPS URL

**Processing:**
1. Fetch HTML content
2. Extract main article content
3. Convert to markdown
4. Download images to `raw/media/`
5. Update image references in markdown

**Supported:**
- News articles
- Blog posts
- Documentation pages
- arXiv abstracts

**Limitations:**
- JavaScript-rendered content may not be captured
- Login-protected content not accessible
- Very large pages may be truncated

### PDF Content

**Input:** Local PDF file path

**Processing:**
1. Extract text using pageindex
2. Preserve basic structure
3. Handle multi-column layouts
4. OCR for scanned documents (if configured)

**Output Location:** `raw/papers/<slug>.md`

### Markdown Content

**Input:** Local `.md` file path

**Processing:**
1. Copy to `raw/`
2. Compute content hash
3. Extract title from first `#` heading or filename

**Output Location:** `raw/articles/<slug>.md` or `raw/<original-path>`

### Git Repository

**Input:** GitHub/GitLab URL

**Processing:**
1. Clone repository (shallow)
2. Extract README.md
3. Include basic project structure
4. Clean up clone

**Output Location:** `raw/code/<repo-name>.md`

---

## Output Formats

### Manifest (`raw/_manifest.json`)

```json
{
  "version": 1,
  "entries": [
    {
      "path": "articles/attention-paper.md",
      "sourceUrl": "https://arxiv.org/abs/1706.03762",
      "title": "Attention Is All You Need",
      "dateAdded": "2026-04-03T10:30:00Z",
      "hash": "a1b2c3d4e5f6789...",
      "type": "paper"
    }
  ]
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `path` | string | Relative path in `raw/` |
| `sourceUrl` | string? | Original URL (if from web) |
| `title` | string | Extracted or provided title |
| `dateAdded` | string | ISO 8601 timestamp |
| `hash` | string | SHA-256 of content |
| `type` | enum | `article`, `paper`, `code`, `media` |

### Article Frontmatter

```yaml
---
title: "Attention Mechanism"
type: concept
created: 2026-04-03T10:35:00Z
updated: 2026-04-03T10:35:00Z
sources:
  - raw/articles/attention-paper.md
  - raw/articles/bert-paper.md
related:
  - "[[Transformer Architecture]]"
  - "[[Self-Attention]]"
tags:
  - machine-learning
  - nlp
---
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Article title |
| `type` | enum | Yes | `concept`, `entity`, `synthesis`, `query` |
| `created` | string | Yes | ISO 8601 creation timestamp |
| `updated` | string | Yes | ISO 8601 last update timestamp |
| `sources` | array | Yes | Paths to source files in `raw/` |
| `related` | array | Yes | Wikilinks to related articles |
| `tags` | array | No | Optional categorization tags |

### Dependency Graph (`wiki/meta/graph.json`)

```json
{
  "version": 1,
  "nodes": {
    "wiki/concepts/attention-mechanism.md": {
      "dependsOn": [
        "raw/articles/attention-paper.md",
        "raw/articles/bert-paper.md"
      ],
      "dependents": [
        "wiki/concepts/transformer.md",
        "wiki/entities/gpt-4.md"
      ]
    }
  }
}
```

### Config (`/.kb/config.json`)

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

**LLM Options:**

| Provider | Models |
|----------|--------|
| `anthropic` | `claude-sonnet-4-20250514`, `claude-3-5-sonnet-20241022` |
| `openai` | `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo` |

### Index (`wiki/_index.md`)

```markdown
# Index

## Concepts

- [[Attention Mechanism]]
- [[Self-Attention]]
- [[Transformer Architecture]]

## Entities

- [[BERT]]
- [[GPT-4]]
- [[LLaMA]]

## Syntheses

- [[Evolution of Language Models]]
- [[Comparison of Attention Methods]]
```

### Query Output (`queries/YYYY-MM-DD-<slug>.md`)

```markdown
---
title: "How does attention work in transformers?"
type: query
created: 2026-04-03T14:20:00Z
updated: 2026-04-03T14:20:00Z
sources: []
related:
  - "[[Attention Mechanism]]"
  - "[[Transformer Architecture]]"
---

# How does attention work in transformers?

Based on the knowledge base articles, attention in transformers works by...

[LLM-generated answer]

## Sources Cited

- [[Attention Mechanism]]
- [[Transformer Architecture]]
```

---

## Command Output Schemas

### JSON Output (when piped or --json)

#### kb init

```json
{
  "path": "/absolute/path/to/wiki",
  "created": [".kb", "raw", "wiki", "queries"],
  "isGlobal": false
}
```

#### kb ingest

```json
{
  "path": "raw/papers/attention.md",
  "title": "Attention Is All You Need",
  "type": "paper",
  "hash": "a1b2c3d4...",
  "skipped": false
}
```

#### kb compile

```json
{
  "created": ["wiki/concepts/attention.md"],
  "updated": ["wiki/entities/transformer.md"],
  "deleted": [],
  "unchanged": 42,
  "duration_ms": 4200
}
```

#### kb find

```json
{
  "results": [
    {
      "path": "wiki/concepts/attention.md",
      "title": "Attention Mechanism",
      "score": 0.95,
      "snippet": "...relevant context..."
    }
  ],
  "total": 5
}
```

#### kb query

```json
{
  "answer": "Based on the knowledge base...",
  "sources": [
    "wiki/concepts/attention.md",
    "wiki/entities/transformer.md"
  ],
  "saved_to": "queries/2026-04-03-question.md"
}
```

#### kb lint

```json
{
  "errors": [
    {
      "type": "broken_link",
      "file": "wiki/concepts/foo.md",
      "link": "[[Nonexistent]]"
    }
  ],
  "warnings": [
    {
      "type": "stale",
      "file": "wiki/concepts/attention.md"
    }
  ],
  "healthy": false
}
```

#### kb status

```json
{
  "path": "/absolute/path/to/wiki",
  "sources": {
    "total": 42,
    "new": 3
  },
  "articles": {
    "total": 87,
    "concepts": 45,
    "entities": 32,
    "syntheses": 10
  },
  "queries": 23,
  "health": {
    "stale": 2,
    "orphan": 1
  }
}
```

#### kb promote

```json
{
  "source": "queries/2026-04-03-question.md",
  "destination": "wiki/syntheses/question.md",
  "backlinks_added": 3
}
```

### Error Output

```json
{
  "error": {
    "code": "missing_api_key",
    "message": "Missing API key",
    "suggestion": "Set ANTHROPIC_API_KEY or OPENAI_API_KEY"
  }
}
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | One of | Anthropic API key for Claude |
| `OPENAI_API_KEY` | One of | OpenAI API key for GPT |

---

## File Naming Conventions

### Source Files

```
raw/articles/<slug>.md      # Web articles
raw/papers/<slug>.md        # PDFs
raw/code/<repo-name>.md     # Git repos
raw/media/<hash>.<ext>      # Downloaded images
```

### Wiki Articles

```
wiki/concepts/<slug>.md     # Concept articles
wiki/entities/<slug>.md     # Entity articles
wiki/syntheses/<slug>.md    # Synthesis articles
```

### Query Files

```
queries/YYYY-MM-DD-<slug>.md
```

**Slug Generation:**
- Lowercase
- Replace spaces and special chars with hyphens
- Remove leading/trailing hyphens
- Max 50 characters

Example: "Attention Is All You Need" → `attention-is-all-you-need`
