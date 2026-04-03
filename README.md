# @oakoliver/kb

A CLI tool that enables LLMs to build, maintain, and query structured knowledge bases from raw source material.

## Installation

```bash
bun add -g @oakoliver/kb
```

## Quick Start

```bash
# Set your LLM API key
export ANTHROPIC_API_KEY="sk-ant-..."
# or
export OPENAI_API_KEY="sk-..."

# Create a knowledge base
kb init my-research
cd my-research

# Ingest sources
kb ingest https://arxiv.org/abs/1706.03762
kb ingest ./papers/research.pdf
kb ingest ./notes/meeting.md

# Compile to wiki
kb compile

# Search
kb find "attention mechanism"

# Ask questions
kb query "How does attention work in transformers?"
```

## Commands

| Command | Description |
|---------|-------------|
| `kb init [path]` | Initialize a new knowledge base |
| `kb ingest <source>` | Add a source (URL, PDF, markdown, git repo) |
| `kb compile` | Compile sources into wiki articles |
| `kb find <query>` | Fast keyword search using BM25 |
| `kb query <question>` | Ask a question with LLM synthesis |
| `kb lint` | Check wiki health |
| `kb status` | Show wiki statistics |
| `kb promote <file>` | Move a query output into the wiki |

## How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Sources   │────▶│  kb ingest  │────▶│    raw/     │
│ URLs, PDFs, │     │             │     │  Markdown   │
│  Markdown   │     └─────────────┘     └──────┬──────┘
└─────────────┘                                │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Answer    │◀────│  kb query   │◀────│ kb compile  │
│  + Sources  │     │   (LLM)     │     │    (LLM)    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌─────────────┐            ▼
                    │  kb find    │◀────┌─────────────┐
                    │   (BM25)    │     │   wiki/     │
                    └─────────────┘     │  Articles   │
                                        └─────────────┘
```

1. **Ingest** sources (URLs, PDFs, markdown, git repos) into `raw/`
2. **Compile** sources into wiki articles with LLM (concepts, entities, syntheses)
3. **Search** with BM25 keywords (`find`) or ask questions with LLM (`query`)

## Features

- **Multi-source ingestion**: URLs, PDFs, markdown files, git repositories
- **LLM-powered compilation**: Automatic concept/entity extraction with Anthropic or OpenAI
- **Obsidian-compatible**: Wiki articles with YAML frontmatter and `[[wikilinks]]`
- **Fast search**: BM25 keyword search without LLM involvement
- **Q&A synthesis**: Natural language questions with cited answers
- **Incremental updates**: Only recompile what changed
- **TTY-aware output**: Human-readable in terminal, JSON when piped

## Directory Structure

```
my-research/
├── .kb/
│   └── config.json       # LLM provider configuration
├── raw/
│   ├── _manifest.json    # Source tracking
│   ├── articles/         # Ingested web articles
│   ├── papers/           # Ingested PDFs
│   └── code/             # Ingested git repos
├── wiki/
│   ├── _index.md         # Table of contents
│   ├── concepts/         # Concept articles
│   ├── entities/         # Entity articles
│   └── syntheses/        # Synthesis articles
└── queries/              # Saved Q&A outputs
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key (for Claude) |
| `OPENAI_API_KEY` | OpenAI API key (for GPT) |

## Documentation

See the [docs/](./docs) directory for comprehensive documentation:

- [Getting Started](./docs/getting-started.md)
- [How It Works](./docs/how-it-works.md)
- [Commands Reference](./docs/commands.md)
- [Examples](./docs/examples.md)
- [Input/Output Reference](./docs/input-output.md)
- [When to Use](./docs/when-to-use.md)
- [Troubleshooting](./docs/troubleshooting.md)

## License

MIT
