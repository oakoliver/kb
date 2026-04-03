# @oakoliver/kb Documentation

A CLI tool that enables LLMs to build, maintain, and query structured knowledge bases from raw source material.

## Table of Contents

- [Getting Started](./getting-started.md) - Installation and first steps
- [How It Works](./how-it-works.md) - Architecture and data flow
- [Commands Reference](./commands.md) - Complete command documentation
- [Examples](./examples.md) - Real-world usage examples
- [Input/Output Reference](./input-output.md) - Expected formats and schemas
- [When to Use](./when-to-use.md) - Use cases and best practices
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions

## Quick Overview

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

## Core Workflow

1. **Initialize** - Create a knowledge base structure
2. **Ingest** - Add sources (URLs, PDFs, markdown, git repos)
3. **Compile** - Transform sources into wiki articles using LLM
4. **Search** - Find articles with keywords or ask questions
5. **Maintain** - Lint, check status, promote valuable content

## Key Features

- **Multi-source ingestion**: URLs, PDFs, markdown files, git repositories
- **LLM-powered compilation**: Automatic concept/entity extraction
- **Obsidian-compatible**: Wiki articles with frontmatter and wikilinks
- **Fast search**: BM25 keyword search without LLM
- **Q&A synthesis**: Natural language questions with cited answers
- **Incremental updates**: Only recompile what changed
- **TTY-aware output**: Human-readable or JSON for scripting
