# Implementation Plan: @oakoliver/kb CLI Tool

**Branch**: `001-kb-cli-tool` | **Date**: 2026-04-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-kb-cli-tool/spec.md`

## Summary

Build a CLI tool (`@oakoliver/kb`) that enables LLMs to build, maintain, and query structured knowledge bases from raw source material. The tool ingests URLs, PDFs, and markdown files into `raw/`, uses LLM to compile them into Obsidian-compatible wiki articles in `wiki/`, and provides BM25 keyword search plus LLM-powered Q&A. Core commands: `init`, `ingest`, `compile`, `find`, `query`, `lint`, `status`, `promote`.

## Technical Context

**Language/Version**: TypeScript (Bun >= 1.0.0, pure TypeScript with no transpilation)
**Primary Dependencies**: @oakoliver/lipgloss ^1.0.2, @oakoliver/glamour ^1.0.1, @oakoliver/huh ^1.0.1, @oakoliver/bubbles ^1.0.3, bm25s ^1.0.1, pageindex ^1.0.1, zod ^3.x
**Storage**: JSON files only (no SQLite), git-friendly diffs
**Testing**: bun test (per constitution)
**Target Platform**: macOS, Linux, Windows (WSL)
**Project Type**: CLI tool (npm package with bin entry)
**Performance Goals**: Init <5s, URL ingest <30s, incremental compile <10s, search <1s, LLM streaming starts <3s
**Constraints**: Only @oakoliver/* packages + zod allowed, no native dependencies, JSON output when piped
**Scale/Scope**: Support 1000+ articles without degradation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Requirement | Status |
|------|-------------|--------|
| Testing | Tests written using `bun test` | **PASS** - Will use bun test |
| User Stories | All user stories MUST have corresponding acceptance tests | **PASS** - 8 user stories with testable acceptance scenarios |
| Pre-Commit: TypeScript | TypeScript compilation MUST pass | **PASS** - Pure TypeScript with Bun |
| Pre-Commit: Tests | All tests MUST pass | **PASS** - Will ensure test suite passes |

**Gate Status**: All gates pass. No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/001-kb-cli-tool/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (CLI command schemas)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── cli.ts               # Entry point, arg parsing, command routing
├── commands/
│   ├── init.ts          # kb init command
│   ├── ingest.ts        # kb ingest command
│   ├── compile.ts       # kb compile command
│   ├── find.ts          # kb find command
│   ├── query.ts         # kb query command
│   ├── lint.ts          # kb lint command
│   ├── status.ts        # kb status command
│   └── promote.ts       # kb promote command
├── core/
│   ├── config.ts        # Load/validate .kb/config.json
│   ├── manifest.ts      # CRUD operations on raw/_manifest.json
│   ├── graph.ts         # Dependency tracking, stale propagation
│   ├── markdown.ts      # Frontmatter parse/serialize, wikilink extraction
│   ├── resolver.ts      # Find wiki root (traverse up, check global)
│   └── schemas.ts       # Zod schemas for config, manifest, frontmatter
├── index/
│   ├── bm25.ts          # Build/query BM25 index via bm25s
│   └── pageindex.ts     # Build/query tree index via pageindex
├── llm/
│   ├── provider.ts      # LLM API abstraction (Anthropic/OpenAI)
│   ├── prompts.ts       # System prompts for extraction/synthesis
│   └── stream.ts        # Streaming response handling
├── ingest/
│   ├── url.ts           # URL fetching → markdown conversion
│   ├── pdf.ts           # PDF text extraction via pageindex
│   ├── file.ts          # Local file copying
│   └── git.ts           # Git repo cloning and README extraction
└── output/
    ├── format.ts        # JSON vs TTY formatting
    ├── progress.ts      # Spinners via @oakoliver/bubbles
    └── render.ts        # Markdown rendering via @oakoliver/glamour

tests/
├── unit/
│   ├── core/            # Unit tests for core modules
│   ├── llm/             # Unit tests for LLM modules (mocked)
│   └── ingest/          # Unit tests for ingest modules
├── integration/
│   ├── init.test.ts     # Integration tests for init command
│   ├── ingest.test.ts   # Integration tests for ingest command
│   ├── compile.test.ts  # Integration tests for compile command
│   └── ...              # Other command integration tests
└── fixtures/
    ├── sources/         # Sample sources for testing
    └── wikis/           # Sample wiki structures for testing
```

**Structure Decision**: Single CLI project with modular source organization by domain (commands, core, index, llm, ingest, output). Tests split into unit and integration following bun test conventions.

## Complexity Tracking

No constitution violations requiring justification. All gates pass with standard patterns.
