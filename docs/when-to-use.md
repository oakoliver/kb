# When to Use @oakoliver/kb

A guide to understanding when kb is the right tool for your needs.

## Ideal Use Cases

### 1. Research Synthesis

**When you have:**
- Multiple papers, articles, or documents on related topics
- Need to understand connections between concepts
- Want to query across all sources with natural language

**Example:**
```bash
# Building a knowledge base for ML research
kb init ml-research
kb ingest https://arxiv.org/abs/1706.03762  # Attention paper
kb ingest https://arxiv.org/abs/1810.04805  # BERT
kb ingest ./papers/*.pdf                     # Local papers
kb compile
kb query "How does BERT's attention differ from the original Transformer?"
```

### 2. Documentation Consolidation

**When you have:**
- Documentation scattered across multiple repos
- Need unified search across all docs
- Want to ask questions spanning multiple projects

**Example:**
```bash
kb init company-docs
kb ingest https://github.com/company/api
kb ingest https://github.com/company/frontend
kb ingest https://github.com/company/mobile
kb compile
kb query "How does authentication work across all services?"
```

### 3. Learning and Note-Taking

**When you want to:**
- Ingest articles and tutorials as you learn
- Build connected notes automatically
- Review and query your learning over time

**Example:**
```bash
kb init --global  # Personal global wiki
# Ingest as you learn
kb ingest https://rust-lang.org/learn
kb ingest https://tokio.rs/tutorial
# Later, query your accumulated knowledge
kb query "How do I handle async errors in Rust?"
```

### 4. Meeting Notes and Decisions

**When you need to:**
- Track decisions across multiple meetings
- Find historical context for decisions
- Generate summaries from meeting notes

**Example:**
```bash
kb init team-wiki
kb ingest ./meetings/2026-*.md
kb compile
kb query "What decisions were made about the database migration?"
```

### 5. Competitive Analysis

**When you're:**
- Researching competitors
- Collecting information from multiple sources
- Need to synthesize findings

**Example:**
```bash
kb init market-research
kb ingest https://competitor-a.com/docs
kb ingest https://competitor-b.com/blog
kb ingest ./reports/industry-analysis.pdf
kb compile
kb query "How do competitors approach pricing?"
```

---

## When NOT to Use kb

### Real-Time Collaboration

**Use instead:** Google Docs, Notion, Confluence

kb is designed for single-user workflows. It doesn't handle:
- Multiple simultaneous editors
- Real-time sync
- Conflict resolution

### Large Binary Files

**Use instead:** Git LFS, cloud storage

kb processes text content. Avoid:
- Video files
- Large images (small images in articles are fine)
- Binary data

### Frequently Changing Content

**Use instead:** Traditional databases, CMS

kb works best with relatively stable source material. If your content changes every few minutes, the recompilation overhead isn't worth it.

### Simple Note-Taking

**Use instead:** Obsidian directly, Notion, Apple Notes

If you just want to write and organize notes without:
- Automatic concept extraction
- Cross-source synthesis
- LLM-powered Q&A

...then kb adds unnecessary complexity.

### Production Web Search

**Use instead:** Elasticsearch, Algolia, dedicated search services

kb's BM25 search is good for personal wikis (1000s of articles) but not designed for:
- High-traffic websites
- Millisecond response times
- Complex relevance tuning

---

## Decision Matrix

| Need | kb? | Alternative |
|------|-----|-------------|
| Synthesize research papers | ✅ Yes | - |
| Search across documents | ✅ Yes | - |
| Ask questions about docs | ✅ Yes | - |
| Auto-link related concepts | ✅ Yes | - |
| Real-time collaboration | ❌ No | Notion, Confluence |
| High-traffic search | ❌ No | Elasticsearch |
| Simple notes | ❌ No | Obsidian alone |
| Video/audio content | ❌ No | Specialized tools |

---

## Scaling Considerations

### Sweet Spot: 10-1000 Articles

kb is optimized for personal and small team knowledge bases:
- Fast BM25 search
- Reasonable compilation times
- Manageable LLM costs

### Beyond 1000 Articles

Still works, but consider:
- Compilation takes longer (incremental helps)
- Search remains fast (BM25 is efficient)
- More LLM API costs

### Very Large Scale (10,000+)

Possible but may need:
- More aggressive incremental compilation
- Patience during full recompiles
- Budget for LLM API usage

---

## Cost Considerations

### LLM API Costs

kb uses LLM for:
1. **Compilation** - Extracting concepts/entities from sources
2. **Query** - Answering questions with synthesis

**Rough estimates:**
- Compilation: ~$0.01-0.05 per source (depends on length)
- Query: ~$0.01-0.03 per question

**Tips to reduce costs:**
- Use incremental compilation (default)
- Avoid `--full` unless necessary
- Use `kb find` for simple searches (no LLM)

### Time Costs

| Operation | Time |
|-----------|------|
| Init | < 1 second |
| Ingest URL | 5-30 seconds |
| Ingest PDF | 2-10 seconds |
| Compile (per source) | 5-15 seconds |
| Find (BM25) | < 1 second |
| Query (LLM) | 3-30 seconds |

---

## Integration Patterns

### With Obsidian

```bash
# Create wiki
kb init obsidian-vault

# Open wiki/ folder in Obsidian
# kb manages wiki/, Obsidian provides UI
```

### With CI/CD

```yaml
# Auto-compile on doc changes
on:
  push:
    paths: ['docs/**']
jobs:
  compile:
    steps:
      - run: kb compile
      - run: kb lint
```

### With Scripts

```bash
# Batch processing
for url in $(cat urls.txt); do
  kb ingest "$url"
done
kb compile
```

### With LLM Agents

kb is designed to work well with LLM agents:
- JSON output for parsing
- Clear exit codes
- Deterministic behavior
- No interactive prompts (when piped)

---

## Comparison with Alternatives

### vs. Obsidian (alone)

| Feature | kb + Obsidian | Obsidian alone |
|---------|---------------|----------------|
| Auto-extract concepts | ✅ | ❌ |
| Ingest URLs/PDFs | ✅ | Plugin needed |
| Q&A with LLM | ✅ | Plugin needed |
| Visual editing | Via Obsidian | ✅ |
| Graph view | Via Obsidian | ✅ |

### vs. Notion

| Feature | kb | Notion |
|---------|-----|--------|
| Local-first | ✅ | ❌ |
| LLM synthesis | ✅ | Limited |
| Collaboration | ❌ | ✅ |
| API access | ✅ (CLI) | ✅ |
| Git-friendly | ✅ | ❌ |

### vs. RAG Systems

| Feature | kb | Custom RAG |
|---------|-----|------------|
| Setup time | Minutes | Hours/Days |
| Maintenance | Low | High |
| Customization | Limited | Full |
| Scale | 1000s docs | Millions |
| Cost | Per-query | Infrastructure |

---

## Summary: When to Choose kb

✅ **Choose kb when you want to:**
- Build a searchable knowledge base from diverse sources
- Let LLM extract and connect concepts automatically
- Ask natural language questions across all your sources
- Work locally with git-friendly files
- Integrate with Obsidian for visualization

❌ **Choose something else when you need:**
- Real-time collaboration
- Production-scale search
- Video/audio processing
- Zero LLM costs
