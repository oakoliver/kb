# Getting Started

## Prerequisites

- **Bun** >= 1.0.0 ([install](https://bun.sh))
- **LLM API Key**: Either `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`

## Installation

### From npm (recommended)

```bash
bun add -g @oakoliver/kb
```

### From source

```bash
git clone https://github.com/oakoliver/kb
cd kb
bun install
bun link
```

### Verify installation

```bash
kb --version
# Output: kb version 0.1.0
```

## Set Up API Key

```bash
# For Anthropic (Claude)
export ANTHROPIC_API_KEY="sk-ant-..."

# OR for OpenAI (GPT)
export OPENAI_API_KEY="sk-..."
```

Add to your shell profile (`~/.bashrc`, `~/.zshrc`) for persistence.

## Your First Knowledge Base

### 1. Initialize

```bash
# Create a new knowledge base
kb init my-research

# Output:
# ✓ Knowledge base initialized at ./my-research/
#
# Created:
#   raw/           Source documents
#   wiki/          Compiled articles
#   queries/       Query outputs
#   .kb/config.json Configuration
```

### 2. Add Sources

```bash
cd my-research

# Ingest a web article
kb ingest https://arxiv.org/abs/1706.03762

# Output:
# ⣾ Fetching https://arxiv.org/abs/1706.03762...
# ✓ Ingested: Attention Is All You Need
#   → raw/articles/attention-is-all-you-need.md

# Ingest a local file
kb ingest ./notes/meeting-notes.md

# Ingest a PDF
kb ingest ./papers/research-paper.pdf

# Ingest a git repository
kb ingest https://github.com/user/project
```

### 3. Compile to Wiki

```bash
kb compile

# Output:
# ⣾ Compiling 3 changed sources...
#   ✓ Created: wiki/concepts/attention-mechanism.md
#   ✓ Created: wiki/entities/transformer.md
#   ✓ Created: wiki/syntheses/neural-architecture-comparison.md
#
# Compiled 3 articles in 4.2s
```

### 4. Search Your Knowledge

```bash
# Fast keyword search
kb find "attention mechanism"

# Output:
# wiki/concepts/attention-mechanism.md (0.95)
#   ...allows models to focus on relevant parts of the input...
#
# wiki/entities/transformer.md (0.82)
#   ...the Transformer architecture uses self-attention...
```

### 5. Ask Questions

```bash
kb query "How does attention work in transformers?"

# Output (streaming):
# Based on the knowledge base articles, attention in transformers...
#
# [detailed answer streams in real-time]
#
# ---
# Sources: [[Attention Mechanism]], [[Transformer Architecture]]
# Saved to: queries/2026-04-03-attention-in-transformers.md
```

## Directory Structure

After initialization, your knowledge base looks like:

```
my-research/
├── .kb/
│   └── config.json       # Configuration (LLM provider, settings)
├── raw/
│   ├── _manifest.json    # Source tracking
│   ├── articles/         # Ingested web articles
│   ├── papers/           # Ingested PDFs
│   ├── code/             # Ingested git repos
│   └── media/            # Downloaded images
├── wiki/
│   ├── _index.md         # Table of contents
│   ├── meta/
│   │   └── graph.json    # Dependency graph
│   ├── concepts/         # Concept articles
│   ├── entities/         # Entity articles
│   └── syntheses/        # Synthesis articles
└── queries/              # Saved Q&A outputs
```

## Next Steps

- Read [How It Works](./how-it-works.md) to understand the architecture
- See [Examples](./examples.md) for real-world workflows
- Check [Commands Reference](./commands.md) for all options
