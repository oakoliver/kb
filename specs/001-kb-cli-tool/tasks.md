# Tasks: @oakoliver/kb CLI Tool

**Input**: Design documents from `/specs/001-kb-cli-tool/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Constitution requires all user stories have acceptance tests (`bun test`)

**Organization**: Tasks grouped by user story for independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US8)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and core CLI structure

- [x] T001 Create project structure with src/, tests/ directories per plan.md
- [x] T002 Initialize Bun project with package.json and bin entry for kb command
- [x] T003 [P] Install dependencies: @oakoliver/lipgloss, @oakoliver/glamour, @oakoliver/huh, @oakoliver/bubbles, bm25s, pageindex, zod
- [x] T004 [P] Configure TypeScript with tsconfig.json for Bun runtime
- [x] T005 [P] Create .gitignore with node_modules, .kb/, dist/ exclusions

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**CRITICAL**: No user story work can begin until this phase is complete

### Core Modules

- [x] T006 Implement Zod schemas (Config, Manifest, Frontmatter, Graph) in src/core/schemas.ts
- [x] T007 [P] Implement output formatter with TTY detection in src/output/format.ts
- [x] T008 [P] Implement progress spinners wrapper in src/output/progress.ts
- [x] T009 [P] Implement markdown renderer wrapper in src/output/render.ts
- [x] T010 Implement argument parser with subcommand routing in src/cli.ts
- [x] T011 Implement wiki root resolver (traverse up, check global) in src/core/resolver.ts
- [x] T012 Implement config loader with validation in src/core/config.ts

### LLM Provider (needed for compile/query)

- [x] T013 Implement LLM provider interface and error types in src/llm/provider.ts
- [x] T014 [P] Implement Anthropic streaming provider in src/llm/provider.ts
- [x] T015 [P] Implement OpenAI streaming provider in src/llm/provider.ts
- [x] T016 Implement streaming response handler in src/llm/stream.ts

### Test Infrastructure

- [x] T017 [P] Create test fixtures directory with sample sources in tests/fixtures/sources/
- [x] T018 [P] Create test fixtures with sample wiki structures in tests/fixtures/wikis/

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: User Story 1 - Initialize Knowledge Base (Priority: P1) MVP

**Goal**: Users can create a new knowledge base with `kb init`

**Independent Test**: Run `kb init`, verify directory structure and valid config.json

### Tests for User Story 1

- [x] T019 [P] [US1] Integration test for `kb init` in tests/integration/init.test.ts
- [x] T020 [P] [US1] Integration test for `kb init <path>` in tests/integration/init.test.ts
- [x] T021 [P] [US1] Integration test for `kb init --global` in tests/integration/init.test.ts
- [x] T022 [P] [US1] Integration test for duplicate init error in tests/integration/init.test.ts

### Implementation for User Story 1

- [x] T023 [US1] Implement init command with directory creation in src/commands/init.ts
- [x] T024 [US1] Implement default config.json generation in src/commands/init.ts
- [x] T025 [US1] Implement instructions.md template generation in src/commands/init.ts
- [x] T026 [US1] Implement --global flag for ~/.kb/ creation in src/commands/init.ts
- [x] T027 [US1] Add duplicate wiki detection and error handling in src/commands/init.ts
- [x] T028 [US1] Wire init command to CLI router in src/cli.ts

**Checkpoint**: `kb init` works independently - MVP milestone

---

## Phase 4: User Story 2 - Ingest Sources (Priority: P1)

**Goal**: Users can add sources (URLs, PDFs, markdown) to their knowledge base

**Independent Test**: Run `kb ingest <source>`, verify file in raw/ with manifest entry

### Tests for User Story 2

- [x] T029 [P] [US2] Unit test for manifest operations in tests/unit/core/manifest.test.ts
- [x] T030 [P] [US2] Unit test for URL fetcher in tests/unit/ingest/url.test.ts
- [x] T031 [P] [US2] Unit test for file copier in tests/unit/ingest/file.test.ts
- [x] T032 [P] [US2] Integration test for `kb ingest <url>` in tests/integration/ingest.test.ts
- [x] T033 [P] [US2] Integration test for `kb ingest <file.md>` in tests/integration/ingest.test.ts
- [x] T034 [P] [US2] Integration test for duplicate detection in tests/integration/ingest.test.ts

### Implementation for User Story 2

- [x] T035 [US2] Implement manifest CRUD operations in src/core/manifest.ts
- [x] T036 [P] [US2] Implement URL fetcher with HTML-to-markdown in src/ingest/url.ts
- [x] T037 [P] [US2] Implement PDF text extraction via pageindex in src/ingest/pdf.ts
- [x] T038 [P] [US2] Implement local file copier in src/ingest/file.ts
- [x] T039 [P] [US2] Implement git repo cloner with README extraction in src/ingest/git.ts
- [x] T040 [US2] Implement image download and media storage in src/ingest/url.ts
- [x] T041 [US2] Implement hash computation for duplicate detection in src/core/manifest.ts
- [x] T042 [US2] Implement ingest command with source type detection in src/commands/ingest.ts
- [x] T043 [US2] Wire ingest command to CLI router in src/cli.ts

**Checkpoint**: `kb init && kb ingest <source>` works - can populate knowledge base

---

## Phase 5: User Story 3 - Compile Wiki (Priority: P1)

**Goal**: Transform raw sources into wiki articles with frontmatter and wikilinks

**Independent Test**: Run `kb compile` after ingesting, verify articles in wiki/ with valid frontmatter

### Tests for User Story 3

- [x] T044 [P] [US3] Unit test for markdown frontmatter parsing in tests/unit/core/markdown.test.ts
- [x] T045 [P] [US3] Unit test for dependency graph operations in tests/unit/core/graph.test.ts
- [x] T046 [P] [US3] Unit test for LLM prompts (mocked) in tests/unit/llm/prompts.test.ts
- [x] T047 [P] [US3] Integration test for `kb compile` in tests/integration/compile.test.ts
- [x] T048 [P] [US3] Integration test for idempotent compilation in tests/integration/compile.test.ts
- [x] T049 [P] [US3] Integration test for `kb compile --dry-run` in tests/integration/compile.test.ts

### Implementation for User Story 3

- [x] T050 [US3] Implement frontmatter parse/serialize in src/core/markdown.ts
- [x] T051 [US3] Implement wikilink extraction in src/core/markdown.ts
- [x] T052 [US3] Implement dependency graph CRUD in src/core/graph.ts
- [x] T053 [US3] Implement stale article detection in src/core/graph.ts
- [x] T054 [P] [US3] Implement concept extraction prompt in src/llm/prompts.ts
- [x] T055 [P] [US3] Implement entity extraction prompt in src/llm/prompts.ts
- [x] T056 [P] [US3] Implement synthesis generation prompt in src/llm/prompts.ts
- [x] T057 [US3] Implement index regeneration (_index.md) in src/commands/compile.ts
- [x] T058 [US3] Implement compile command with incremental mode in src/commands/compile.ts
- [x] T059 [US3] Implement --full flag for full recompilation in src/commands/compile.ts
- [x] T060 [US3] Implement --dry-run flag for preview in src/commands/compile.ts
- [x] T061 [US3] Wire compile command to CLI router in src/cli.ts

**Checkpoint**: Full init → ingest → compile workflow works - core MVP complete

---

## Phase 6: User Story 4 - Keyword Search (Priority: P2)

**Goal**: Fast BM25 keyword search without LLM involvement

**Independent Test**: Run `kb find "term"`, verify ranked results with snippets

### Tests for User Story 4

- [x] T062 [P] [US4] Unit test for BM25 index operations in tests/unit/index/bm25.test.ts
- [x] T063 [P] [US4] Integration test for `kb find` in tests/integration/find.test.ts
- [x] T064 [P] [US4] Integration test for `kb find --limit` in tests/integration/find.test.ts
- [x] T065 [P] [US4] Integration test for no results exit code in tests/integration/find.test.ts

### Implementation for User Story 4

- [x] T066 [US4] Implement BM25 index build from wiki articles in src/index/bm25.ts
- [x] T067 [US4] Implement BM25 search with ranking in src/index/bm25.ts
- [x] T068 [US4] Implement snippet extraction for results in src/index/bm25.ts
- [x] T069 [US4] Implement find command with --limit option in src/commands/find.ts
- [x] T070 [US4] Wire find command to CLI router in src/cli.ts

**Checkpoint**: Keyword search works independently

---

## Phase 7: User Story 5 - Query with LLM Synthesis (Priority: P2)

**Goal**: Natural language Q&A with streaming LLM responses

**Independent Test**: Run `kb query "question"`, verify streaming answer with citations

### Tests for User Story 5

- [x] T071 [P] [US5] Unit test for pageindex tree-search in tests/unit/index/pageindex.test.ts
- [x] T072 [P] [US5] Integration test for `kb query` (mocked LLM) in tests/integration/query.test.ts
- [x] T073 [P] [US5] Integration test for `kb query --no-file` in tests/integration/query.test.ts
- [x] T074 [P] [US5] Integration test for query output filing in tests/integration/query.test.ts

### Implementation for User Story 5

- [x] T075 [US5] Implement pageindex tree-search wrapper in src/index/pageindex.ts
- [x] T076 [US5] Implement Q&A synthesis prompt in src/llm/prompts.ts
- [x] T077 [US5] Implement query output file generation (YYYY-MM-DD-slug.md) in src/commands/query.ts
- [x] T078 [US5] Implement query command with streaming output in src/commands/query.ts
- [x] T079 [US5] Implement --no-file flag in src/commands/query.ts
- [x] T080 [US5] Wire query command to CLI router in src/cli.ts

**Checkpoint**: Q&A functionality works independently

---

## Phase 8: User Story 6 - Wiki Health Check (Priority: P3)

**Goal**: Validate wiki integrity with broken link and orphan detection

**Independent Test**: Run `kb lint` on wiki with issues, verify correct detection

### Tests for User Story 6

- [x] T081 [P] [US6] Integration test for broken link detection in tests/integration/lint.test.ts
- [x] T082 [P] [US6] Integration test for orphan article detection in tests/integration/lint.test.ts
- [x] T083 [P] [US6] Integration test for frontmatter validation in tests/integration/lint.test.ts
- [x] T084 [P] [US6] Integration test for healthy wiki exit code in tests/integration/lint.test.ts

### Implementation for User Story 6

- [x] T085 [US6] Implement wikilink resolution checker in src/commands/lint.ts
- [x] T086 [US6] Implement orphan article detector in src/commands/lint.ts
- [x] T087 [US6] Implement stale article detector in src/commands/lint.ts
- [x] T088 [US6] Implement frontmatter schema validator in src/commands/lint.ts
- [x] T089 [US6] Implement lint command with --fix option in src/commands/lint.ts
- [x] T090 [US6] Wire lint command to CLI router in src/cli.ts

**Checkpoint**: Wiki health checking works independently

---

## Phase 9: User Story 7 - Wiki Status Overview (Priority: P3)

**Goal**: Quick overview of knowledge base statistics

**Independent Test**: Run `kb status`, verify counts displayed correctly

### Tests for User Story 7

- [x] T091 [P] [US7] Integration test for `kb status` output in tests/integration/status.test.ts
- [x] T092 [P] [US7] Integration test for empty wiki status in tests/integration/status.test.ts

### Implementation for User Story 7

- [x] T093 [US7] Implement article count by type in src/commands/status.ts
- [x] T094 [US7] Implement source count and new detection in src/commands/status.ts
- [x] T095 [US7] Implement health summary (stale, orphan counts) in src/commands/status.ts
- [x] T096 [US7] Implement status command in src/commands/status.ts
- [x] T097 [US7] Wire status command to CLI router in src/cli.ts

**Checkpoint**: Status overview works independently

---

## Phase 10: User Story 8 - Promote Query to Wiki (Priority: P3)

**Goal**: Move valuable query responses into permanent wiki

**Independent Test**: Run `kb promote queries/file.md`, verify file in wiki/ with backlinks

### Tests for User Story 8

- [x] T098 [P] [US8] Integration test for promote command in tests/integration/promote.test.ts
- [x] T099 [P] [US8] Integration test for backlink addition in tests/integration/promote.test.ts
- [x] T100 [P] [US8] Integration test for index update after promote in tests/integration/promote.test.ts

### Implementation for User Story 8

- [x] T101 [US8] Implement query file parsing in src/commands/promote.ts
- [x] T102 [US8] Implement backlink injection into cited articles in src/commands/promote.ts
- [x] T103 [US8] Implement promote command with --as type option in src/commands/promote.ts
- [x] T104 [US8] Wire promote command to CLI router in src/cli.ts

**Checkpoint**: All 8 user stories complete

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements affecting all user stories

- [x] T105 [P] Add --help and --version global flags in src/cli.ts
- [x] T106 [P] Implement consistent error message formatting in src/output/format.ts
- [x] T107 Verify all exit codes match contract (0/1) in src/cli.ts
- [x] T108 [P] Run full test suite with `bun test`
- [x] T109 Build standalone binary with `bun build --compile`
- [x] T110 Validate against quickstart.md scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phases 3-10)**: All depend on Foundational completion
  - US1 (P1): Start first - MVP target
  - US2 (P1): Can start in parallel with US1
  - US3 (P1): Can start in parallel, integrates with US2
  - US4 (P2): Depends on compiled wiki from US3
  - US5 (P2): Depends on compiled wiki from US3
  - US6 (P3): Depends on compiled wiki from US3
  - US7 (P3): Can start after US1-US3 complete
  - US8 (P3): Depends on query output from US5
- **Polish (Phase 11)**: Depends on all user stories

### User Story Dependencies

```
US1 (init) ─────────────────────┐
                                ├──► US7 (status)
US2 (ingest) ──► US3 (compile) ─┤
                                ├──► US4 (find)
                                ├──► US5 (query) ──► US8 (promote)
                                └──► US6 (lint)
```

### Parallel Opportunities

**Within Phase 2 (Foundational)**:
- T007, T008, T009 (output modules)
- T014, T015 (LLM providers)
- T017, T018 (test fixtures)

**Within Each User Story**:
- All test tasks marked [P]
- Model/utility tasks marked [P]

**Across User Stories** (after Foundational):
- US1, US2, US3 can start in parallel
- US4, US5, US6 can start in parallel (after US3)

---

## Parallel Example: User Story 3

```bash
# Launch all tests together (they should fail initially):
Task: "T044 [P] [US3] Unit test for markdown frontmatter parsing"
Task: "T045 [P] [US3] Unit test for dependency graph operations"
Task: "T046 [P] [US3] Unit test for LLM prompts (mocked)"
Task: "T047 [P] [US3] Integration test for kb compile"

# Launch parallel implementation tasks:
Task: "T054 [P] [US3] Implement concept extraction prompt"
Task: "T055 [P] [US3] Implement entity extraction prompt"
Task: "T056 [P] [US3] Implement synthesis generation prompt"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: US1 - Init
4. **VALIDATE**: `kb init` works
5. Complete Phase 4: US2 - Ingest
6. **VALIDATE**: `kb init && kb ingest <url>` works
7. Complete Phase 5: US3 - Compile
8. **VALIDATE**: Full init → ingest → compile workflow
9. **MVP COMPLETE** - Deploy/demo

### Incremental Delivery

| Milestone | Stories | Capability |
|-----------|---------|------------|
| MVP | US1-US3 | Create, populate, compile wiki |
| Search | +US4 | Fast keyword search |
| Q&A | +US5 | LLM-powered Q&A |
| Maintenance | +US6-US8 | Lint, status, promote |

### Task Count Summary

| Phase | Tasks |
|-------|-------|
| Phase 1: Setup | 5 |
| Phase 2: Foundational | 13 |
| Phase 3: US1 - Init | 10 |
| Phase 4: US2 - Ingest | 15 |
| Phase 5: US3 - Compile | 18 |
| Phase 6: US4 - Find | 9 |
| Phase 7: US5 - Query | 10 |
| Phase 8: US6 - Lint | 10 |
| Phase 9: US7 - Status | 7 |
| Phase 10: US8 - Promote | 7 |
| Phase 11: Polish | 6 |
| **Total** | **110** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label (US1-US8) maps to spec.md user stories
- Each user story independently testable after completion
- Commit after each task or logical group
- Constitution requires all tests pass before commit
