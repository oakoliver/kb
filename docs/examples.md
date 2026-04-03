# Examples

Real-world usage examples for common workflows.

## Example 1: Research Paper Knowledge Base

Build a knowledge base from academic papers.

### Setup

```bash
# Create the knowledge base
kb init ml-research
cd ml-research

# Set your API key
export ANTHROPIC_API_KEY="sk-ant-..."
```

### Ingest Papers

```bash
# Ingest from arXiv
kb ingest https://arxiv.org/abs/1706.03762  # Attention paper
kb ingest https://arxiv.org/abs/1810.04805  # BERT paper
kb ingest https://arxiv.org/abs/2005.14165  # GPT-3 paper

# Ingest local PDFs
kb ingest ./papers/vision-transformer.pdf
kb ingest ./papers/llama.pdf

# Check what we have
kb status
# Sources: 5 (5 new)
# Articles: 0
```

### Compile

```bash
kb compile

# Output:
# ⣾ Compiling 5 changed sources...
#   ✓ Created: wiki/concepts/attention-mechanism.md
#   ✓ Created: wiki/concepts/transformer-architecture.md
#   ✓ Created: wiki/concepts/self-attention.md
#   ✓ Created: wiki/entities/bert.md
#   ✓ Created: wiki/entities/gpt-3.md
#   ✓ Created: wiki/entities/llama.md
#   ✓ Created: wiki/syntheses/language-model-evolution.md
#
# Compiled 7 articles in 12.3s
```

### Search and Query

```bash
# Fast keyword search
kb find "attention heads"

# Ask questions
kb query "What are the key differences between BERT and GPT?"
kb query "How does the Vision Transformer adapt attention for images?"
kb query "What scaling laws apply to large language models?"
```

### Maintain

```bash
# Check wiki health
kb lint

# Promote a good answer to permanent wiki
kb promote queries/2026-04-03-bert-vs-gpt.md --as synthesis
```

---

## Example 2: Project Documentation Hub

Consolidate documentation from multiple repositories.

### Setup

```bash
kb init docs-hub
cd docs-hub
```

### Ingest from Git Repos

```bash
# Ingest project READMEs
kb ingest https://github.com/company/api-service
kb ingest https://github.com/company/web-frontend
kb ingest https://github.com/company/mobile-app
kb ingest https://github.com/company/shared-components

# Ingest internal docs
kb ingest ./onboarding/getting-started.md
kb ingest ./onboarding/architecture.md
kb ingest ./runbooks/deployment.md
```

### Compile and Search

```bash
kb compile

# Find deployment info
kb find "deployment kubernetes"

# Ask about architecture
kb query "How do the frontend and API communicate?"
kb query "What authentication method does the mobile app use?"
```

---

## Example 3: Meeting Notes Synthesis

Turn scattered meeting notes into organized knowledge.

### Setup

```bash
kb init team-wiki
cd team-wiki
```

### Ingest Meeting Notes

```bash
# Ingest weekly meeting notes
kb ingest ./meetings/2026-01-week1.md
kb ingest ./meetings/2026-01-week2.md
kb ingest ./meetings/2026-01-week3.md
kb ingest ./meetings/2026-01-week4.md

# Ingest decision documents
kb ingest ./decisions/adr-001-database-choice.md
kb ingest ./decisions/adr-002-api-versioning.md
```

### Generate Synthesis

```bash
kb compile

# The LLM will extract:
# - Key decisions made
# - Action items mentioned
# - People and their responsibilities
# - Technical concepts discussed
```

### Query for Information

```bash
kb query "What decisions were made about the database?"
kb query "What are John's responsibilities?"
kb query "When was the API versioning decision made?"
```

---

## Example 4: Learning Journal

Build a personal learning knowledge base.

### Setup

```bash
kb init --global  # Global wiki at ~/.kb/
```

### Daily Learning Workflow

```bash
# Ingest interesting articles as you find them
kb ingest https://blog.example.com/rust-async-explained
kb ingest https://docs.example.com/kubernetes-networking
kb ingest ~/Downloads/ebook-chapter.pdf

# Periodically compile
kb compile

# Review what you've learned
kb status
kb find "kubernetes"
```

### Use Across Projects

Since it's a global wiki, you can query from anywhere:

```bash
cd ~/projects/new-project

# Query your global knowledge base
kb query "How do I set up async Rust?"
```

---

## Example 5: Scripting and Automation

Use kb in scripts with JSON output.

### Batch Ingestion

```bash
#!/bin/bash
# ingest-papers.sh

URLS=(
  "https://arxiv.org/abs/1706.03762"
  "https://arxiv.org/abs/1810.04805"
  "https://arxiv.org/abs/2005.14165"
)

for url in "${URLS[@]}"; do
  result=$(kb ingest "$url" --json)
  if echo "$result" | jq -e '.skipped == false' > /dev/null; then
    echo "Ingested: $(echo "$result" | jq -r '.title')"
  else
    echo "Skipped (duplicate): $url"
  fi
done
```

### Status Monitoring

```bash
#!/bin/bash
# check-health.sh

status=$(kb status --json)
stale=$(echo "$status" | jq '.health.stale')
orphan=$(echo "$status" | jq '.health.orphan')

if [ "$stale" -gt 0 ] || [ "$orphan" -gt 0 ]; then
  echo "Warning: $stale stale, $orphan orphan articles"
  kb lint
  exit 1
fi

echo "Wiki is healthy"
```

### CI Integration

```yaml
# .github/workflows/docs.yml
name: Update Knowledge Base

on:
  push:
    paths:
      - 'docs/**'

jobs:
  compile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v1
      
      - name: Install kb
        run: bun add -g @oakoliver/kb
      
      - name: Compile wiki
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          cd knowledge-base
          kb compile
          kb lint
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: wiki
          path: knowledge-base/wiki/
```

---

## Example 6: Multi-Source Research

Combine different source types for comprehensive research.

```bash
kb init market-research
cd market-research

# Academic papers
kb ingest https://arxiv.org/abs/2023.12345
kb ingest ./papers/industry-report.pdf

# News articles
kb ingest https://techcrunch.com/2026/01/01/ai-trends
kb ingest https://arstechnica.com/ai/2026/market-analysis

# Company documentation
kb ingest https://github.com/competitor/product
kb ingest ./notes/competitor-analysis.md

# Compile everything
kb compile

# Generate insights
kb query "What are the main trends in the AI market?"
kb query "How does competitor X compare to market leaders?"
kb query "What technical approaches are gaining traction?"
```

---

## Example 7: Obsidian Integration

View your compiled wiki in Obsidian.

### Setup

```bash
# Create wiki
kb init obsidian-vault
cd obsidian-vault

# Ingest and compile content
kb ingest https://example.com/article
kb compile
```

### Open in Obsidian

1. Open Obsidian
2. "Open folder as vault" → select `obsidian-vault/wiki/`
3. Articles appear with:
   - YAML frontmatter (metadata)
   - `[[Wikilinks]]` (clickable connections)
   - Graph view shows relationships

### Workflow

```bash
# Work in terminal
kb ingest <new-source>
kb compile

# View/edit in Obsidian
# Changes to wiki/ files are preserved
# Run kb lint to check integrity
```
