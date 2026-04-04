# Research: KB Studio TUI

## Decision 1: Reuse Existing Command/Core Modules Through TUI Service Adapters

- Decision: Build `src/tui/operations/` adapters that call existing kb modules for status, search, ingest, compile, query, and lint instead of reimplementing domain logic inside the TUI.
- Rationale: Existing command modules already encode workspace resolution, manifest/graph handling, BM25 search, LLM usage, and output-side effects. Wrapping those behaviors behind TUI-specific service functions minimizes logic drift and keeps the CLI and studio mode consistent.
- Alternatives considered:
  - Reimplement domain workflows directly in `src/tui/`: rejected because it would duplicate core behavior and create divergence risk.
  - Shell out to `kb` subprocesses from the TUI: rejected because it would complicate streaming, state updates, and typed integration.

## Decision 2: Add a Dedicated `studio` Command and Treat No-Arg Launch as Studio Entry

- Decision: Add a `studio` command and route bare `kb` invocation into studio mode when running in a valid workspace and interactive TTY; keep JSON/help behavior for non-interactive contexts.
- Rationale: The spec requires `kb` and `kb studio` to launch the TUI, but the current CLI treats no-command as help. A dedicated command keeps the interface explicit while still allowing the ergonomic default in terminal usage.
- Alternatives considered:
  - Only support `kb studio`: rejected because it does not satisfy FR-001.
  - Replace help output for all no-arg usage: rejected because piped/non-TTY workflows still benefit from current machine-readable help behavior.

## Decision 3: Implement the TUI Under `src/tui/` With a Single Root Bubble Tea Model

- Decision: Add `src/tui/` with a root application model that owns layout, pane focus, explorer state, editor state, bottom-panel state, and async operation coordination.
- Rationale: The feature is a single full-screen application with tightly coupled keyboard, mouse, and streaming behavior. A root model with focused submodules fits Bubble Tea architecture and keeps update/render responsibilities explicit.
- Alternatives considered:
  - Independent programs per pane/view: rejected because cross-pane focus, overlays, and history would become harder to coordinate.
  - Put TUI logic into `src/output/`: rejected because output formatting is currently stateless CLI rendering, not interactive application state.

## Decision 4: Patch Upstream `@oakoliver/bubbles` for Mouse Wheel and Click Support Before Full TUI Build

- Decision: Treat mouse support fixes in `@oakoliver/bubbles` as a prerequisite dependency task before implementing click-first explorer and viewport interactions in kb.
- Rationale: The spec depends on working wheel scrolling and click selection. Current upstream limitations would otherwise force kb to maintain workarounds or ship incomplete mouse support.
- Alternatives considered:
  - Implement kb-local forks/shims around viewport/list behavior: rejected because the shared component library should own input behavior.
  - Defer mouse support to later phases: rejected because FR-037 through FR-039 are in scope for the feature.

## Decision 9: Local Integration Plan for Mouse-Enabled `@oakoliver/bubbles`

- Decision: Depend on `@oakoliver/bubbles >=1.0.3` which includes `AllMotion` mouse mode support in viewport and list components. If upstream regresses mouse handling, use the TUI's own `MouseClickMsg`/`MouseWheelMsg` dispatch in `app.ts` as the authoritative layer with components receiving pre-processed coordinates.
- Rationale: The spec requires click-to-focus, wheel-to-scroll, and click-to-select across explorer, editor, search, and bottom panel. Bubbles >=1.0.3 exposes viewport scroll methods and list selection APIs that the TUI adapters call directly, making mouse handling reliable without internal forks.
- Integration notes:
  - `@oakoliver/bubbles ^1.0.3` in `package.json` provides `ViewportModel.scrollDown/scrollUp`, `ListModel`, `SpinnerModel`, and `ProgressModel` — all used by TUI panels.
  - Mouse events are handled at the root `StudioApp.update()` level: `MouseClickMsg` resolves target pane from x/y coordinates via `calculateLayout()`, `MouseWheelMsg` dispatches scroll commands to the focused viewport.
  - If a future bubbles release changes mouse event propagation, the root model's coordinate-based dispatch remains the fallback and only the bubbles component calls would need updating.
- Alternatives considered:
  - Fork `@oakoliver/bubbles` with custom mouse patches: rejected because the current published version already supports the required APIs.
  - Skip mouse support and rely on keyboard-only: rejected because the spec mandates mouse-first interaction (FR-037 through FR-039).

## Decision 5: Use `glamour` Rendering Plus a Parallel Wikilink Position Map

- Decision: Render article markdown through `@oakoliver/glamour`, then maintain a sidecar mapping of wikilink positions for keyboard focus and best-effort mouse click resolution.
- Rationale: `glamour` already gives consistent markdown styling and matches existing stack choices. A sidecar map is the only practical way to support interactive links without replacing the renderer.
- Alternatives considered:
  - Custom markdown renderer built only for kb: rejected because it is higher cost and unnecessary for v1.
  - Keyboard-only link navigation: rejected because mouse-follow is a feature requirement, though keyboard remains the fallback path if coordinate mapping is imperfect.

## Decision 6: Use Story-Aligned Integration Tests With Focused Unit Tests for Parsing and State Helpers

- Decision: Cover user stories primarily through integration tests that exercise studio launch, pane switching, explorer navigation, search, command palette, query streaming, ingest, compile progress, and lint/problem routing; supplement with unit tests for pure helpers like tree flattening, shortcut dispatch, and link mapping.
- Rationale: The constitution requires acceptance tests per user story. TUI behavior is driven by event sequences and visible state transitions, which are best captured at integration level.
- Alternatives considered:
  - Unit-test-only approach: rejected because it would not prove story-level user flows.
  - End-to-end terminal snapshot tests only: rejected because targeted unit tests are still useful for deterministic parsing/layout helpers.

## Decision 7: Keep Workspace Data Model File-Based and Read Through Existing Resolver/Manifest/Graph APIs

- Decision: Do not add new persistent stores for the studio. Use the same `.kb/config.json`, `raw/_manifest.json`, `wiki/meta/graph.json`, markdown files, and queries directory already used by the CLI.
- Rationale: Project guidance explicitly requires JSON/files only, and the current CLI already models all workspace state in the filesystem.
- Alternatives considered:
  - SQLite/cache database for TUI state: rejected because it violates project constraints and adds sync complexity.
  - Persist studio-only UI state in repo files for v1: rejected because not required for feature acceptance.

## Decision 8: Use a Contextual Help Bar and VSCode-Like Keymap as the Discoverability Layer

- Decision: Implement pane-specific keybindings through `@oakoliver/bubbles/help` and align default shortcuts with the VSCode-like mapping already defined in the spec.
- Rationale: The spec calls for VSCode familiarity and improved UX. A dynamic help bar keeps shortcuts visible without introducing a heavyweight onboarding flow.
- Alternatives considered:
  - Modal onboarding wizard: rejected because the spec assumptions explicitly avoid onboarding in v1.
  - Static footer text: rejected because it would not adapt to the active pane.
