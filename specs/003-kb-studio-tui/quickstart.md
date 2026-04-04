# Quickstart: KB Studio TUI

## Prerequisites

1. Use Bun `>= 1.0.0`.
2. Work from a valid kb workspace created with `kb init`.
3. Set `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` for query/compile flows.
4. Use a terminal with mouse support and at least `80x24` dimensions.

## Run The Validation Suite

```bash
bun test        # 488 tests, 33 files
bun run lint    # TypeScript strict type check
```

All 488 tests pass with 0 failures (1018 expect() calls).

## Studio Validation Flow

### 1. Launch Studio

```bash
bun run ./src/cli.ts studio
```

Expected:
- Full-screen TUI opens.
- Explorer shows `wiki/`, `raw/`, and `queries/`.
- Status bar shows workspace/provider/article summary.

**Covered by**: `tests/integration/studio-launch.test.ts` (3 tests)

### 2. Browse and Open Files

1. Press `Ctrl+Shift+E` to focus Explorer.
2. Use `j`/`k` or arrow keys to move selection.
3. Press `Enter` to open a markdown file.
4. Scroll with keyboard and mouse wheel.
5. Press `Tab` to focus wikilinks and `Enter` to follow one.

**Covered by**: `tests/integration/studio-explorer.test.ts` (21 tests), `tests/unit/tui/document-view.test.ts` (17 tests), `tests/unit/tui/link-map.test.ts` (26 tests)

### 3. Use Quick Open and Command Palette

1. Press `Ctrl+P`.
2. Type part of a filename and press `Enter`.
3. Press `Ctrl+Shift+P`.
4. Run `kb.compile` or `kb.lint` from the palette.

**Covered by**: `tests/integration/studio-command-palette.test.ts` (8 tests), `tests/unit/tui/palette.test.ts` (18 tests)

### 4. Search and Query

1. Press `Ctrl+Shift+F`.
2. Type a keyword query and confirm results update.
3. Press `Ctrl+Enter` on a natural-language question.
4. Confirm response streaming appears in the editor and output panel.
5. Save the result to `queries/`.

**Covered by**: `tests/integration/studio-search.test.ts` (10 tests), `tests/integration/studio-search-query.test.ts` (9 tests), `tests/unit/tui/search.test.ts` (29 tests), `tests/unit/tui/query-operations.test.ts` (33 tests)

### 5. Ingest and Compile

1. Press `Ctrl+Shift+I`.
2. Paste a URL or select a local file.
3. Confirm the source appears with pending status.
4. Run compile from the command palette.
5. Confirm progress/log output and explorer refresh.

**Covered by**: `tests/integration/studio-ingest.test.ts`, `tests/integration/studio-compile.test.ts`, `tests/unit/tui/ingest.test.ts`, `tests/unit/tui/compile-operations.test.ts`

### 6. Lint and Problems

1. Run lint from the command palette.
2. Open the Problems tab in the bottom panel.
3. Select a problem and confirm navigation to the related file.

**Covered by**: `tests/integration/studio-lint-problems.test.ts` (16 tests), `tests/unit/tui/problems.test.ts` (29 tests)

## Test File Summary

| Test File | Tests | Scope |
|-----------|-------|-------|
| `tests/integration/studio-launch.test.ts` | 3 | Studio init, TTY checks |
| `tests/integration/studio-explorer.test.ts` | 21 | Tree nav, expand, open |
| `tests/integration/studio-command-palette.test.ts` | 8 | Quick open, palette |
| `tests/integration/studio-search.test.ts` | 10 | BM25 search flow |
| `tests/integration/studio-search-query.test.ts` | 9 | LLM query streaming |
| `tests/integration/studio-ingest.test.ts` | - | Ingest sidebar flow |
| `tests/integration/studio-compile.test.ts` | - | Compile progress flow |
| `tests/integration/studio-lint-problems.test.ts` | 16 | Lint, problems panel |
| `tests/unit/tui/layout.test.ts` | 10 | Layout geometry |
| `tests/unit/tui/state.test.ts` | 11 | Initial state factory |
| `tests/unit/tui/link-map.test.ts` | 26 | Wikilink extraction |
| `tests/unit/tui/document-view.test.ts` | 17 | Editor, chrome helpers |
| `tests/unit/tui/palette.test.ts` | 18 | Palette state & filter |
| `tests/unit/tui/search.test.ts` | 29 | Search state helpers |
| `tests/unit/tui/query-operations.test.ts` | 33 | Query exec, save, output |
| `tests/unit/tui/ingest.test.ts` | - | Ingest state helpers |
| `tests/unit/tui/compile-operations.test.ts` | - | Progress panel state |
| `tests/unit/tui/problems.test.ts` | 29 | Problems panel state |
| `tests/unit/tui/performance.test.ts` | 25 | Large data perf tests |
