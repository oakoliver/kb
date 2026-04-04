# Tasks: KB Studio TUI

**Input**: Design documents from `/specs/003-kb-studio-tui/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included. The specification and constitution require acceptance coverage for every user story, so each story phase includes executable integration and supporting unit tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. `US1`, `US2`, `US3`)
- Every task includes an exact file path

## Path Conventions

- Single project layout at repository root
- Application code in `src/`
- Tests in `tests/integration/` and `tests/unit/`
- Feature artifacts in `specs/003-kb-studio-tui/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the TUI module skeleton and wire the new studio entrypoints into the existing CLI.

- [x] T001 Create the TUI module directory structure in `src/tui/` with placeholder `index.ts`, `app.ts`, `state.ts`, `messages.ts`, `layout.ts`, `theme.ts`, `commands.ts`, and `operations/`
- [x] T002 Update CLI command parsing and help for `studio` launch behavior in `src/cli.ts`
- [x] T003 [P] Add a shared studio fixture workspace for TUI integration tests in `tests/fixtures/wikis/studio-wiki/`
- [x] T004 [P] Add a TUI test helper harness for Bubble Tea models in `tests/integration/helpers/studio.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared architecture every user story depends on.

**⚠️ CRITICAL**: No user story work should start until this phase is complete.

- [x] T005 Add the `studio` command registration and no-arg TTY workspace routing in `src/cli.ts`
- [x] T006 Implement the root studio application model and boot lifecycle in `src/tui/app.ts`
- [x] T007 [P] Define shared TUI types, state factories, and pane enums in `src/tui/state.ts`
- [x] T008 [P] Define shared studio message types and command intents in `src/tui/messages.ts`
- [x] T009 [P] Implement shared layout sizing, pane geometry, and minimum terminal guards in `src/tui/layout.ts`
- [x] T010 [P] Implement shared Catppuccin/Nerd Font-aware styles and focus borders in `src/tui/theme.ts`
- [x] T011 Implement workspace snapshot and status/loading adapters in `src/tui/operations/workspace.ts`
- [x] T012 [P] Implement command registry and palette command descriptors in `src/tui/commands.ts`
- [x] T013 [P] Implement a document loader/renderer abstraction with glamour integration in `src/tui/document.ts`
- [x] T014 [P] Implement a reusable link-map parser and coordinate calculator in `src/tui/link-map.ts`
- [x] T015 [P] Add foundational unit coverage for layout, state factories, and link mapping in `tests/unit/tui/layout.test.ts`, `tests/unit/tui/state.test.ts`, and `tests/unit/tui/link-map.test.ts`

**Checkpoint**: Foundation ready. User story work can now proceed independently.

---

## Phase 3: User Story 1 - Browse and Read Wiki Articles (Priority: P1) 🎯 MVP

**Goal**: Launch studio, browse workspace files, open articles, render markdown, and navigate wikilinks/history.

**Independent Test**: Launch `kb` or `kb studio` in a valid workspace, navigate the explorer, open an article, scroll, follow a wikilink, and go back with history restored.

### Tests for User Story 1

- [x] T016 [P] [US1] Add launch and resize acceptance coverage in `tests/integration/studio-launch.test.ts`
- [x] T017 [P] [US1] Add explorer and document navigation acceptance coverage in `tests/integration/studio-explorer.test.ts`
- [x] T018 [P] [US1] Add viewport/link-map helper coverage in `tests/unit/tui/document-view.test.ts`

### Implementation for User Story 1

- [x] T019 [P] [US1] Implement explorer tree flattening and selection state in `src/tui/explorer.ts`
- [x] T020 [P] [US1] Implement markdown editor viewport state and history helpers in `src/tui/editor.ts`
- [x] T021 [P] [US1] Implement the activity bar, status bar, and contextual help bar views in `src/tui/chrome.ts`
- [x] T022 [US1] Implement workspace file opening, explorer focus management, and initial document loading in `src/tui/app.ts`
- [x] T023 [US1] Implement markdown rendering, scrolling, and focused-link highlighting in `src/tui/document.ts`
- [x] T024 [US1] Implement back/forward history restoration and `Tab`/`Shift+Tab` wikilink traversal in `src/tui/editor.ts`
- [x] T025 [US1] Compose the full VSCode-like layout with sidebar, editor, bottom panel shell, status bar, and help bar in `src/tui/view.ts`
- [x] T026 [US1] Wire mouse focus and wheel handling for explorer/editor panes in `src/tui/app.ts`

**Checkpoint**: User Story 1 is fully functional and independently testable.

---

## Phase 4: User Story 2 - Quick Open and Command Palette (Priority: P1)

**Goal**: Open files and commands from a VSCode-style command palette with fuzzy filtering.

**Independent Test**: Press `Ctrl+P` to open files and `Ctrl+Shift+P` to execute commands without using the explorer.

### Tests for User Story 2

- [x] T027 [P] [US2] Add quick-open and command palette acceptance coverage in `tests/integration/studio-command-palette.test.ts`
- [x] T028 [P] [US2] Add palette filtering and keybinding unit coverage in `tests/unit/tui/palette.test.ts`

### Implementation for User Story 2

- [x] T029 [P] [US2] Implement palette state model and fuzzy filtering helpers in `src/tui/palette.ts`
- [x] T030 [P] [US2] Add command and file result providers for the palette in `src/tui/commands.ts`
- [x] T031 [US2] Implement palette overlay rendering, input focus, and selection behavior in `src/tui/palette.ts`
- [x] T032 [US2] Wire global shortcuts for `Ctrl+P`, `Ctrl+Shift+P`, and overlay dismissal in `src/tui/app.ts`
- [x] T033 [US2] Connect palette file opening and command execution to the root update loop in `src/tui/app.ts`

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Search Knowledge Base (Priority: P1)

**Goal**: Provide BM25-powered sidebar search with snippets and open-on-select behavior.

**Independent Test**: Switch to search view, type a query, see debounced results, and open a matching article from the results list.

### Tests for User Story 3

- [x] T034 [P] [US3] Add search flow acceptance coverage in `tests/integration/studio-search.test.ts`
- [x] T035 [P] [US3] Add debounced search adapter unit coverage in `tests/unit/tui/search.test.ts`

### Implementation for User Story 3

- [x] T036 [P] [US3] Implement BM25 search service adapter and result mapping in `src/tui/operations/search.ts`
- [x] T037 [P] [US3] Implement sidebar search state, results list, and input model in `src/tui/search.ts`
- [x] T038 [US3] Wire `Ctrl+Shift+F`, debounced search execution, and result selection in `src/tui/app.ts`
- [x] T039 [US3] Render search view content and result snippets in `src/tui/search.ts`

**Checkpoint**: User Stories 1 through 3 are independently testable and satisfy the P1 scope.

---

## Phase 6: User Story 4 - LLM Query with Streaming Response (Priority: P2)

**Goal**: Submit natural-language questions, stream answers into the editor, and save query documents.

**Independent Test**: In search view, submit a question with `Ctrl+Enter`, observe streaming output in the editor/bottom panel, and save the result to `queries/`.

### Tests for User Story 4

- [x] T040 [P] [US4] Add streaming query acceptance coverage in `tests/integration/studio-search-query.test.ts`
- [x] T041 [P] [US4] Add query operation and save-flow unit coverage in `tests/unit/tui/query-operations.test.ts`

### Implementation for User Story 4

- [x] T042 [P] [US4] Implement query and save-query service adapters in `src/tui/operations/query.ts`
- [x] T043 [P] [US4] Implement transient query document creation and streaming append helpers in `src/tui/editor.ts`
- [x] T044 [US4] Wire `Ctrl+Enter` query submission, bottom panel activation, and stream events in `src/tui/app.ts`
- [x] T045 [US4] Implement save-query prompt flow using huh in `src/tui/forms/save-query.ts`
- [x] T046 [US4] Render query status, citations, and save feedback in `src/tui/panels/output.ts`

**Checkpoint**: Querying works independently on top of the existing browsing/search foundation.

---

## Phase 7: User Story 5 - Ingest New Sources (Priority: P2)

**Goal**: Add URL/file ingestion workflows directly from the sidebar with visible pending status.

**Independent Test**: Switch to ingest view, paste a URL or pick a file, and verify the source appears in the list with pending compilation status.

### Tests for User Story 5

- [x] T047 [P] [US5] Add ingest flow acceptance coverage in `tests/integration/studio-ingest.test.ts`
- [x] T048 [P] [US5] Add ingest queue mapping and file-picker unit coverage in `tests/unit/tui/ingest.test.ts`

### Implementation for User Story 5

- [x] T049 [P] [US5] Implement ingest service adapter and queue-item mapping in `src/tui/operations/ingest.ts`
- [x] T050 [P] [US5] Implement ingest sidebar view, input, and manifest-backed list rendering in `src/tui/ingest.ts`
- [x] T051 [P] [US5] Implement file-picker integration for local source selection in `src/tui/forms/file-picker.ts`
- [x] T052 [US5] Wire `Ctrl+Shift+I`, ingest submission, file picker activation, and workspace refresh in `src/tui/app.ts`

**Checkpoint**: Ingest flows are independently functional without requiring compile.

---

## Phase 8: User Story 6 - Compile Wiki with Progress UI (Priority: P2)

**Goal**: Run compile from studio and surface progress, logs, and refreshed explorer/status data.

**Independent Test**: Execute compile from the command palette, observe progress/log updates in the bottom panel, and confirm the explorer refreshes after completion.

### Tests for User Story 6

- [x] T053 [P] [US6] Add compile progress acceptance coverage in `tests/integration/studio-compile.test.ts`
- [x] T054 [P] [US6] Add compile event mapping unit coverage in `tests/unit/tui/compile-operations.test.ts`

### Implementation for User Story 6

- [x] T055 [P] [US6] Implement compile service adapter with progress/log event emitters in `src/tui/operations/compile.ts`
- [x] T056 [P] [US6] Implement progress and output panel models in `src/tui/panels/progress.ts` and `src/tui/panels/output.ts`
- [x] T057 [US6] Wire palette compile command execution, panel expansion, and status spinner updates in `src/tui/app.ts`
- [x] T058 [US6] Refresh workspace snapshot, explorer tree, and article counts after compile in `src/tui/operations/workspace.ts`

**Checkpoint**: Compile workflow is independently testable from within the studio.

---

## Phase 9: User Story 7 - View Lint Problems (Priority: P3)

**Goal**: Show lint results in a Problems tab and navigate directly to the affected file.

**Independent Test**: Run lint from the command palette, open the Problems tab, and jump to the related file by selecting a problem.

### Tests for User Story 7

- [x] T059 [P] [US7] Add lint/problems acceptance coverage in `tests/integration/studio-lint-problems.test.ts`
- [x] T060 [P] [US7] Add lint issue mapping unit coverage in `tests/unit/tui/problems.test.ts`

### Implementation for User Story 7

- [x] T061 [P] [US7] Implement lint service adapter and problem-item mapping in `src/tui/operations/lint.ts`
- [x] T062 [P] [US7] Implement Problems tab state and rendering in `src/tui/panels/problems.ts`
- [x] T063 [US7] Wire lint command execution, warning/error counts, and problem navigation in `src/tui/app.ts`

**Checkpoint**: All seven user stories are independently functional.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Finish quality, UX, and release readiness across all stories.

- [x] T064 [P] Add upstream dependency note and local integration plan for mouse-enabled `@oakoliver/bubbles` in `specs/003-kb-studio-tui/research.md` and `package.json`
- [x] T065 Improve global keyboard shortcut discoverability and contextual help coverage in `src/tui/chrome.ts` and `src/tui/commands.ts`
- [x] T066 [P] Add performance-focused unit coverage for large explorer trees and search result lists in `tests/unit/tui/performance.test.ts`
- [x] T067 Run end-to-end quickstart validation and update `specs/003-kb-studio-tui/quickstart.md`
- [x] T068 Run the full validation suite and fix any regressions in `tests/` and `src/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories
- **User Stories (Phases 3-9)**: Depend on Foundational completion
- **Polish (Phase 10)**: Depends on completion of desired user stories

### User Story Dependencies

- **US1**: Starts after Phase 2 and is the MVP foundation
- **US2**: Starts after Phase 2; depends on shared document opening from US1 but remains independently testable
- **US3**: Starts after Phase 2; depends on shared workspace/document plumbing but remains independently testable
- **US4**: Depends on US3 search input and shared editor/bottom-panel infrastructure
- **US5**: Depends only on foundational workspace/app shell tasks
- **US6**: Depends on US2 command palette and shared bottom-panel/status infrastructure
- **US7**: Depends on US2 command palette and shared bottom-panel/document navigation infrastructure

### Within Each User Story

- Write tests first and confirm they fail before implementation
- Implement state/helpers before wiring the root app update loop
- Complete service adapters before UI integration
- Finish story-level validation before moving to the next story in sequence

### Parallel Opportunities

- Setup tasks `T003-T004` can run in parallel
- Foundational tasks `T007-T015` can run in parallel where file boundaries do not overlap
- Within each story, test tasks marked `[P]` can run in parallel
- Story helper/model tasks marked `[P]` can run in parallel before integration tasks
- After Phase 2, US5 can proceed in parallel with US1-US3 if staffing allows; later US6-US7 can proceed once their dependencies are met

---

## Parallel Example: User Story 1

```bash
# Tests
Task: "Add launch and resize acceptance coverage in tests/integration/studio-launch.test.ts"
Task: "Add explorer and document navigation acceptance coverage in tests/integration/studio-explorer.test.ts"
Task: "Add viewport/link-map helper coverage in tests/unit/tui/document-view.test.ts"

# Implementation
Task: "Implement explorer tree flattening and selection state in src/tui/explorer.ts"
Task: "Implement markdown editor viewport state and history helpers in src/tui/editor.ts"
Task: "Implement the activity bar, status bar, and contextual help bar views in src/tui/chrome.ts"
```

## Parallel Example: User Story 4

```bash
# Tests
Task: "Add streaming query acceptance coverage in tests/integration/studio-search-query.test.ts"
Task: "Add query operation and save-flow unit coverage in tests/unit/tui/query-operations.test.ts"

# Implementation
Task: "Implement query and save-query service adapters in src/tui/operations/query.ts"
Task: "Implement transient query document creation and streaming append helpers in src/tui/editor.ts"
```

## Parallel Example: User Story 6

```bash
# Tests
Task: "Add compile progress acceptance coverage in tests/integration/studio-compile.test.ts"
Task: "Add compile event mapping unit coverage in tests/unit/tui/compile-operations.test.ts"

# Implementation
Task: "Implement compile service adapter with progress/log event emitters in src/tui/operations/compile.ts"
Task: "Implement progress and output panel models in src/tui/panels/progress.ts and src/tui/panels/output.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate launch, explorer navigation, article rendering, scrolling, and wikilink history
5. Demo the read-only studio MVP

### Incremental Delivery

1. Setup + Foundational establish the reusable TUI shell
2. Deliver US1 for the initial studio browser MVP
3. Add US2 and US3 to complete the P1 productivity/search scope
4. Add US4-US6 for authoring workflows
5. Add US7 and polish for maintenance and release readiness

### Parallel Team Strategy

1. One developer handles Phase 1-2 architecture
2. After Phase 2:
   - Developer A: US1/US2 shell and palette
   - Developer B: US3/US4 search and query
   - Developer C: US5/US6/US7 ingestion, compile, and problems

---

## Notes

- All tasks follow the required checklist format
- `[P]` tasks target different files or clearly separable concerns
- Every user story has independent tests and a concrete validation checkpoint
- File paths intentionally target the planned `src/tui/` module layout
