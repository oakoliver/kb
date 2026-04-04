# Implementation Plan: KB Studio TUI

**Branch**: `003-kb-studio-tui` | **Date**: 2026-04-03 | **Spec**: `/Users/oliveiraantoniocc/Documents/projects/kb/specs/003-kb-studio-tui/spec.md`
**Input**: Feature specification from `/Users/oliveiraantoniocc/Documents/projects/kb/specs/003-kb-studio-tui/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Build a VSCode-like terminal workspace for `@oakoliver/kb` that reuses the existing CLI/core services for browsing wiki content, searching with BM25, streaming LLM query responses, ingesting sources, and running compile/lint/status workflows. The implementation will add a new TUI application layer under `src/tui/`, integrate `@oakoliver/bubbles`, `@oakoliver/lipgloss`, `@oakoliver/glamour`, and `@oakoliver/huh`, and ship in phases that first establish core layout, explorer, editor, and command routing before adding streaming operations and richer mouse-first interactions.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript on Bun >= 1.0.0  
**Primary Dependencies**: `@oakoliver/bubbletea`, `@oakoliver/bubbles`, `@oakoliver/lipgloss`, `@oakoliver/glamour`, `@oakoliver/huh`, `bm25s`, `pageindex`, `zod`  
**Storage**: Local filesystem only; JSON manifests/config plus markdown content in `.kb/`, `raw/`, `wiki/`, and `queries/`  
**Testing**: `bun test` integration and unit tests, plus TypeScript typecheck via `bun run tsc --noEmit`  
**Target Platform**: Interactive terminal environments on macOS and Linux with 256-color and mouse support  
**Project Type**: CLI application with full-screen TUI mode  
**Performance Goals**: Initial screen renders under 1 second for normal workspaces, BM25 results visible within 200ms after 150ms debounce, mouse/keyboard viewport updates remain visually smooth, LLM streaming starts surfacing output within 2 seconds when provider/network allow  
**Constraints**: JSON/files only, reuse existing command/core logic instead of duplicating kb business rules, minimum terminal size 80x24, no in-TUI provider configuration, must keep memory under 100MB for ~1000 article workspaces, upstream `@oakoliver/bubbles` mouse limitations must be addressed during implementation  
**Scale/Scope**: One local workspace at a time, up to roughly 1000 wiki articles, 7 user stories and 40 functional requirements in this feature

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- `bun test` remains the test runner for all new coverage.
- Every user story must map to acceptance coverage before release; planning will preserve that by defining story-aligned integration tests for studio launch, explorer/editor navigation, search, query, ingest, compile, and lint/problem flows.
- TypeScript compilation must pass before commit; the design keeps all new code in typed modules under `src/` and avoids dynamic runtime-only contracts.
- All tests must pass before commit; no constitution violations are required by this plan.

**Gate Status (Pre-Research)**: PASS

## Project Structure

### Documentation (this feature)

```text
specs/003-kb-studio-tui/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── cli.ts
├── commands/
├── core/
├── index/
├── ingest/
├── llm/
├── output/
└── tui/

tests/
├── fixtures/
├── integration/
└── unit/
```

**Structure Decision**: Keep the existing single-project CLI structure. Add TUI-specific code under `src/tui/` with submodules for app model, layout, explorer, editor, palette, search, operations, and rendering helpers; keep story-level integration coverage under `tests/integration/` and focused parser/state helpers under `tests/unit/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
