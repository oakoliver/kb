# Feature Specification: @oakoliver/kb CLI Tool

**Feature Branch**: `001-kb-cli-tool`  
**Created**: 2026-04-03  
**Status**: Draft  
**Input**: User description: "A CLI tool that enables LLMs to build, maintain, and query structured knowledge bases from raw source material."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Initialize Knowledge Base (Priority: P1)

A user (human or LLM agent) wants to create a new knowledge base to organize and compile information from various sources. They run a single command to scaffold the complete directory structure with configuration files.

**Why this priority**: Without initialization, no other functionality can be used. This is the entry point for all users.

**Independent Test**: Can be fully tested by running `kb init` and verifying the directory structure exists with valid configuration files.

**Acceptance Scenarios**:

1. **Given** an empty directory, **When** user runs `kb init`, **Then** a `./kb/` directory is created with `raw/`, `wiki/`, `queries/`, and `.kb/` subdirectories, plus a valid `config.json`
2. **Given** an empty directory, **When** user runs `kb init my-research`, **Then** a `./my-research/` directory is created with the full wiki structure
3. **Given** no global wiki exists, **When** user runs `kb init --global`, **Then** a `~/.kb/` directory is created as the global knowledge base
4. **Given** a wiki already exists at target location, **When** user runs `kb init`, **Then** an error is shown without overwriting existing data

---

### User Story 2 - Ingest Sources (Priority: P1)

A user wants to add raw source material (URLs, PDFs, markdown files, git repos) to their knowledge base so the LLM can later compile them into wiki articles.

**Why this priority**: Ingestion is the primary way to populate the knowledge base. Without sources, there's nothing to compile or query.

**Independent Test**: Can be fully tested by running `kb ingest <source>` and verifying the file appears in `raw/` with a manifest entry.

**Acceptance Scenarios**:

1. **Given** an initialized wiki, **When** user runs `kb ingest https://example.com/article`, **Then** the URL content is fetched, converted to markdown, and saved to `raw/articles/` with manifest updated
2. **Given** an initialized wiki, **When** user runs `kb ingest ./paper.pdf`, **Then** the PDF text is extracted and saved to `raw/papers/` with manifest updated
3. **Given** an initialized wiki, **When** user runs `kb ingest ./notes.md`, **Then** the file is copied to `raw/` with manifest updated
4. **Given** a source that was previously ingested, **When** user runs `kb ingest` with same source, **Then** the system detects duplicate by hash and skips re-ingestion
5. **Given** a URL with images, **When** user runs `kb ingest`, **Then** images are downloaded to `raw/media/` and references updated

---

### User Story 3 - Compile Wiki (Priority: P1)

An LLM agent wants to transform raw sources into structured wiki articles (concepts, entities, syntheses) with proper wikilinks, frontmatter, and an index.

**Why this priority**: Compilation is the core value proposition - turning raw sources into organized, queryable knowledge.

**Independent Test**: Can be fully tested by running `kb compile` after ingesting sources and verifying wiki articles are created with valid frontmatter and wikilinks.

**Acceptance Scenarios**:

1. **Given** new sources in `raw/`, **When** user runs `kb compile`, **Then** concept and entity articles are created in `wiki/` with YAML frontmatter and source citations
2. **Given** no changes since last compile, **When** user runs `kb compile`, **Then** no files are modified (idempotent operation)
3. **Given** sources in `raw/`, **When** user runs `kb compile --dry-run`, **Then** a preview of changes is shown without writing files
4. **Given** an existing wiki, **When** user runs `kb compile --full`, **Then** all articles are recompiled regardless of cache
5. **Given** compiled articles, **When** compilation completes, **Then** all `[[wikilinks]]` resolve to existing articles and `_index.md` lists all articles

---

### User Story 4 - Keyword Search (Priority: P2)

A user wants to quickly find relevant articles using keyword search without LLM involvement.

**Why this priority**: Fast lookup is essential for daily use, but requires compiled wiki content to be useful.

**Independent Test**: Can be fully tested by running `kb find "term"` and verifying ranked results with file paths and snippets.

**Acceptance Scenarios**:

1. **Given** a compiled wiki, **When** user runs `kb find "attention mechanism"`, **Then** relevant articles are returned ranked by relevance with file paths and matching snippets
2. **Given** a compiled wiki, **When** user runs `kb find "term" --limit 5`, **Then** at most 5 results are returned
3. **Given** no matching articles, **When** user runs `kb find "nonexistent"`, **Then** exit code is 1 (no results)
4. **Given** output is piped, **When** user runs `kb find "term" | jq`, **Then** JSON output is returned

---

### User Story 5 - Query with LLM Synthesis (Priority: P2)

A user wants to ask a natural language question and receive a synthesized answer citing wiki articles.

**Why this priority**: Deep Q&A is the advanced use case that leverages the compiled knowledge effectively.

**Independent Test**: Can be fully tested by running `kb query "question"` and verifying a streaming answer with citations and filed output.

**Acceptance Scenarios**:

1. **Given** a compiled wiki and LLM API key, **When** user runs `kb query "What is X?"`, **Then** a synthesized answer streams to terminal citing wiki articles
2. **Given** a query completes, **When** answer is generated, **Then** output is saved to `queries/YYYY-MM-DD-<slug>.md`
3. **Given** user runs `kb query "question" --no-file`, **When** answer completes, **Then** output is not saved to disk

---

### User Story 6 - Wiki Health Check (Priority: P3)

A user wants to validate wiki integrity - checking for broken links, orphan articles, stale content, and invalid frontmatter.

**Why this priority**: Maintenance is important but not critical for initial MVP functionality.

**Independent Test**: Can be fully tested by running `kb lint` and verifying issues are detected and reported with exit codes.

**Acceptance Scenarios**:

1. **Given** a wiki with broken wikilinks, **When** user runs `kb lint`, **Then** broken links are reported with file locations
2. **Given** a wiki with orphan articles, **When** user runs `kb lint`, **Then** orphans are detected and listed
3. **Given** a healthy wiki, **When** user runs `kb lint`, **Then** exit code is 0
4. **Given** issues found, **When** user runs `kb lint`, **Then** exit code is 1

---

### User Story 7 - Wiki Status Overview (Priority: P3)

A user wants a quick overview of their knowledge base statistics.

**Why this priority**: Informational feature that provides visibility but doesn't affect core functionality.

**Independent Test**: Can be fully tested by running `kb status` and verifying counts are displayed.

**Acceptance Scenarios**:

1. **Given** a populated wiki, **When** user runs `kb status`, **Then** article counts by type, source count, stale count, and orphan count are displayed
2. **Given** an empty wiki, **When** user runs `kb status`, **Then** zero counts are shown gracefully

---

### User Story 8 - Promote Query to Wiki (Priority: P3)

A user wants to move a particularly valuable query response into the permanent wiki.

**Why this priority**: Enhancement feature for curating knowledge but not required for core workflow.

**Independent Test**: Can be fully tested by running `kb promote queries/file.md` and verifying the file moves to `wiki/` with backlinks.

**Acceptance Scenarios**:

1. **Given** a query file in `queries/`, **When** user runs `kb promote queries/file.md`, **Then** file is moved to `wiki/` with backlinks added to cited articles
2. **Given** a promotion completes, **When** index is checked, **Then** `_index.md` includes the promoted article

---

### Edge Cases

- What happens when LLM API key is missing? System shows clear error with instructions to set `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`
- What happens when LLM API call fails mid-operation (rate limit, timeout, network error)? System fails immediately with clear error message and produces no partial output; user must retry the full operation
- How does system handle network failures during URL ingestion? Graceful error with retry suggestion
- What happens with malformed source files (invalid markdown, corrupted PDF)? Skip with warning, continue with valid sources
- How does system handle very large wikis (1000+ articles)? Incremental compilation and efficient indexing prevent performance degradation
- What happens when running commands outside a wiki directory? System searches up directory tree, falls back to global wiki, or shows "no wiki found"

## Requirements *(mandatory)*

### Functional Requirements

**Initialization**
- **FR-001**: System MUST create a knowledge base directory structure with `raw/`, `wiki/`, `queries/`, and `.kb/` subdirectories
- **FR-002**: System MUST support creating wiki at current directory (`kb init`), specified path (`kb init <path>`), or global location (`kb init --global` → `~/.kb/`)
- **FR-003**: System MUST generate a valid `.kb/config.json` with LLM provider configuration
- **FR-004**: System MUST generate a default `instructions.md` template

**Ingestion**
- **FR-005**: System MUST fetch URLs and convert HTML content to markdown
- **FR-006**: System MUST extract text from PDFs
- **FR-007**: System MUST copy local markdown files to `raw/`
- **FR-008**: System MUST clone git repositories and extract README content
- **FR-009**: System MUST download and store images from web sources to `raw/media/`
- **FR-010**: System MUST update `raw/_manifest.json` with source metadata (path, URL, title, date, hash, type)
- **FR-011**: System MUST detect duplicate ingestion by content hash and skip re-processing

**Compilation**
- **FR-012**: System MUST detect new/changed sources via manifest hash comparison
- **FR-013**: System MUST extract concepts and create `wiki/concepts/*.md` articles
- **FR-014**: System MUST extract entities and create `wiki/entities/*.md` articles
- **FR-015**: System MUST generate `[[wikilinks]]` between related articles
- **FR-016**: System MUST build synthesis articles from multiple sources in `wiki/syntheses/`
- **FR-017**: System MUST regenerate `wiki/_index.md` table of contents
- **FR-018**: System MUST update dependency graph in `wiki/meta/graph.json`
- **FR-019**: System MUST support `--full` flag for complete recompilation
- **FR-020**: System MUST support `--dry-run` flag to preview changes without writing

**Search**
- **FR-021**: System MUST provide BM25 keyword search via `kb find` command
- **FR-022**: System MUST return ranked results with file paths and matching snippets
- **FR-023**: System MUST support `--limit <n>` to restrict result count
- **FR-024**: System MUST provide LLM-powered question answering via `kb query` command
- **FR-025**: System MUST stream LLM responses to terminal in real-time
- **FR-026**: System MUST auto-file query output to `queries/YYYY-MM-DD-<slug>.md`
- **FR-027**: System MUST support `--no-file` flag to skip filing query output

**Maintenance**
- **FR-028**: System MUST validate all wikilinks resolve to existing articles
- **FR-029**: System MUST detect orphan articles (no backlinks)
- **FR-030**: System MUST detect stale articles (source changed since compilation)
- **FR-031**: System MUST validate frontmatter schema on all articles
- **FR-032**: System MUST show article counts by type via `kb status`
- **FR-033**: System MUST support promoting queries to wiki via `kb promote`

**Output**
- **FR-034**: System MUST output JSON when stdout is piped to another process
- **FR-035**: System MUST output human-readable formatted text when running in TTY
- **FR-036**: System MUST support `--json` flag to force JSON output
- **FR-037**: System MUST render markdown with styling in TTY mode
- **FR-038**: System MUST display progress spinners for long-running operations

**LLM Integration**
- **FR-039**: System MUST support Anthropic API via `ANTHROPIC_API_KEY` environment variable
- **FR-040**: System MUST support OpenAI API via `OPENAI_API_KEY` environment variable
- **FR-041**: System MUST allow configurable model selection in `.kb/config.json`
- **FR-042**: System MUST fail immediately on LLM API errors (rate limit, timeout, network failure) with clear error message and no partial output

### Key Entities

- **Source**: Raw material ingested into the knowledge base (URL, PDF, markdown, repo). Key attributes: path, sourceUrl, title, dateAdded, hash, type (article/paper/code/media)
- **Article**: Compiled wiki content derived from sources. Key attributes: title, type (concept/entity/synthesis/query), created, updated, sources (array of raw paths), related (wikilinks), tags
- **Manifest**: Tracks all ingested sources with metadata for change detection
- **Dependency Graph**: Maps relationships between articles and their source dependencies for incremental compilation
- **Config**: User/system configuration including LLM provider and wiki settings

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can initialize a new knowledge base in under 5 seconds
- **SC-002**: Users can ingest a typical web article (URL) in under 30 seconds
- **SC-003**: Incremental compilation processes only changed sources, completing in under 10 seconds for 1-5 changes regardless of total wiki size
- **SC-004**: Keyword search returns results in under 1 second for wikis with up to 1000 articles
- **SC-005**: LLM query responses begin streaming within 3 seconds of command execution
- **SC-006**: 100% of wikilinks in compiled wiki resolve to existing articles
- **SC-007**: All wiki articles contain valid YAML frontmatter conforming to schema
- **SC-008**: Second compilation with no changes produces zero file modifications (idempotent)
- **SC-009**: System handles wikis with 1000+ articles without performance degradation
- **SC-010**: Exit codes are correct for scripting: 0 for success, 1 for failures/no results, non-zero for errors

## Clarifications

### Session 2026-04-03

- Q: When an LLM API call fails during `kb compile` or `kb query` (e.g., rate limit, timeout, network error mid-stream), what should the system do? → A: Fail immediately with clear error message and no partial output

## Assumptions

- Users have Bun >= 1.0.0 installed as the runtime environment
- Users provide their own LLM API keys via environment variables (`ANTHROPIC_API_KEY` or `OPENAI_API_KEY`)
- Users have stable internet connectivity for URL ingestion and LLM API calls
- The tool is single-user (no real-time collaboration features)
- Users manage version control externally via git (no auto-commit)
- Obsidian is the assumed frontend for viewing wiki content (wikilinks and YAML frontmatter)
- Interactive prompts are available in TTY mode; non-interactive fallbacks exist for scripting
- Dependencies are limited to @oakoliver/* packages, zod, bm25s, and pageindex per project constraints
