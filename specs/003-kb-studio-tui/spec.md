# Feature Specification: KB Studio TUI

**Feature Branch**: `003-kb-studio-tui`  
**Created**: 2026-04-03  
**Status**: Draft  
**Input**: User description: "KB Studio TUI - VSCode-like terminal interface for knowledge base management"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse and Read Wiki Articles (Priority: P1)

As a developer or researcher, I want to browse my knowledge base in a visual file explorer and read wiki articles with proper markdown rendering, so I can quickly navigate and understand my compiled research.

**Why this priority**: This is the core read-only experience. Without the ability to browse and read content, the TUI has no value. This establishes the foundation for all other features.

**Independent Test**: Launch `kb` or `kb studio` in a valid knowledge base directory, navigate the file tree, and view rendered markdown articles. Delivers immediate value as a documentation browser.

**Acceptance Scenarios**:

1. **Given** a valid `.kb` workspace with wiki articles, **When** user launches `kb studio`, **Then** a VSCode-like interface appears with file explorer showing `wiki/`, `raw/`, and `queries/` directories.

2. **Given** the explorer sidebar is focused, **When** user presses `j`/`k` or arrow keys, **Then** selection moves between files/folders with visual highlight.

3. **Given** a file is selected in explorer, **When** user presses Enter or double-clicks, **Then** the file content renders in the editor viewport with proper markdown styling.

4. **Given** an article contains `[[wikilinks]]`, **When** user presses Tab, **Then** focus cycles between wikilinks with distinct visual highlight.

5. **Given** a wikilink is focused, **When** user presses Enter, **Then** the linked article opens and the previous article is pushed to history stack.

6. **Given** user has navigated to multiple articles, **When** user presses Alt+Left or Backspace, **Then** previous article loads with scroll position restored.

---

### User Story 2 - Quick Open and Command Palette (Priority: P1)

As a power user, I want to quickly find files and execute commands without navigating the tree, so I can work efficiently using familiar VSCode shortcuts.

**Why this priority**: The command palette is essential for efficient navigation in larger knowledge bases. It's a critical VSCode UX pattern that users expect.

**Independent Test**: Press Ctrl+P to fuzzy-find files, press Ctrl+Shift+P to access commands. Delivers immediate value as a fast navigation mechanism.

**Acceptance Scenarios**:

1. **Given** user is in any context, **When** user presses Ctrl+P, **Then** command palette overlay appears with file list and text input.

2. **Given** command palette is open in file mode, **When** user types partial filename, **Then** results filter in real-time using fuzzy matching.

3. **Given** filtered results are shown, **When** user presses Down/Up and Enter, **Then** selected file opens in editor and palette closes.

4. **Given** user is in any context, **When** user presses Ctrl+Shift+P, **Then** command palette shows available commands (compile, lint, status, etc.).

5. **Given** a command is selected, **When** user presses Enter, **Then** the command executes and appropriate feedback is shown.

---

### User Story 3 - Search Knowledge Base (Priority: P1)

As a researcher, I want to search my wiki using keywords and see matching results instantly, so I can find relevant information without browsing the entire tree.

**Why this priority**: Search is fundamental to knowledge base utility. BM25 search already exists in the CLI; this surfaces it in the TUI.

**Independent Test**: Switch to search view, type a query, see BM25 results with snippets. Click or select a result to open the article.

**Acceptance Scenarios**:

1. **Given** user is in any context, **When** user presses Ctrl+Shift+F, **Then** sidebar switches to Search view with text input focused.

2. **Given** search input is focused, **When** user types a query, **Then** BM25 search executes (debounced 150ms) and results appear with file names and snippets.

3. **Given** search results are displayed, **When** user clicks or presses Enter on a result, **Then** the article opens in the editor viewport.

4. **Given** search input has text, **When** user presses Escape, **Then** search clears and returns to previous view.

---

### User Story 4 - LLM Query with Streaming Response (Priority: P2)

As a researcher, I want to ask natural language questions about my knowledge base and see the LLM response stream in real-time, so I can get synthesized answers from my compiled research.

**Why this priority**: LLM Q&A is a key differentiator of kb, but depends on the core reading/navigation experience being solid first.

**Independent Test**: In search view, type a question and press Ctrl+Enter. LLM response streams into an untitled document with source citations.

**Acceptance Scenarios**:

1. **Given** search input has a question, **When** user presses Ctrl+Enter, **Then** editor shows "Untitled Query" and bottom panel opens with "Thinking..." status.

2. **Given** LLM is processing, **When** response chunks arrive, **Then** editor viewport updates in real-time showing streamed markdown.

3. **Given** LLM response completes, **When** answer includes sources, **Then** sources appear as `[[wikilinks]]` that can be followed.

4. **Given** a query result is displayed, **When** user presses Ctrl+S, **Then** a form prompts for filename and saves to `queries/` directory.

---

### User Story 5 - Ingest New Sources (Priority: P2)

As a knowledge base author, I want to add new sources (URLs, files) directly from the TUI, so I can build my knowledge base without switching to the command line.

**Why this priority**: Ingestion is a write operation that depends on the read experience being complete. Important for workflow continuity.

**Independent Test**: Switch to Ingest view, paste a URL or select a file, see it added to the source list with "pending" status.

**Acceptance Scenarios**:

1. **Given** user is in any context, **When** user presses Ctrl+Shift+I, **Then** sidebar switches to Ingest view showing current sources.

2. **Given** Ingest view is active, **When** user pastes a URL in the input, **Then** system fetches content, saves to `raw/`, and updates source list.

3. **Given** Ingest view is active, **When** user activates file picker, **Then** filesystem browser opens allowing file/PDF selection.

4. **Given** a source is ingested, **Then** source list shows entry with "pending compilation" status.

---

### User Story 6 - Compile Wiki with Progress UI (Priority: P2)

As a knowledge base author, I want to trigger wiki compilation from the TUI and see real-time progress, so I can watch my sources transform into wiki articles.

**Why this priority**: Compilation is the core kb workflow, but viewing results (P1) should work before building new content.

**Independent Test**: Execute compile command, see progress bar and streaming logs in bottom panel, explorer refreshes when complete.

**Acceptance Scenarios**:

1. **Given** user triggers compile (via palette or shortcut), **When** compilation starts, **Then** bottom panel expands showing progress bar and status.

2. **Given** compilation is running, **When** LLM processes each source, **Then** panel streams logs showing current file and extracted concepts.

3. **Given** compilation completes, **Then** explorer tree refreshes showing new articles and status bar updates article count.

4. **Given** compilation fails, **Then** error message appears in panel with details.

---

### User Story 7 - View Lint Problems (Priority: P3)

As a wiki maintainer, I want to see lint warnings (broken links, missing frontmatter) in a Problems panel, so I can fix wiki health issues.

**Why this priority**: Quality control feature that enhances the authoring experience but is not essential for core reading/writing workflows.

**Independent Test**: Open Problems tab in bottom panel, see list of lint issues, click to navigate to the problematic file.

**Acceptance Scenarios**:

1. **Given** bottom panel Problems tab is selected, **When** lint runs, **Then** issues appear as a list with severity, file, and message.

2. **Given** a problem is selected, **When** user presses Enter or clicks, **Then** the problematic file opens in editor.

---

### Edge Cases

- What happens when terminal size is below 80x24? Display error overlay requesting resize.
- What happens when no `.kb` workspace is found? Display error with instructions to run `kb init`.
- What happens when LLM API key is missing during query/compile? Show error in panel, allow other features to work.
- What happens when a `[[wikilink]]` target doesn't exist? Show visual indicator (different color), do not crash on follow.
- What happens when user clicks outside any interactive element? Click sets focus to containing pane.
- What happens when workspace has zero wiki articles? Editor displays a welcome screen with getting-started hints guiding the user to ingest their first source.
- What happens when multiple operations run concurrently (e.g. compile + query)? All operations proceed in parallel. Each operation surfaces its own status in the bottom panel and status bar independently.

---

## Requirements *(mandatory)*

### Functional Requirements

**Core Application**
- **FR-001**: System MUST launch a full-screen terminal UI when user runs `kb` (no args) or `kb studio` in a valid workspace.
- **FR-002**: System MUST display an error if terminal size is below 80 columns x 24 rows.
- **FR-003**: System MUST exit gracefully when user presses Ctrl+Q.

**Layout & Focus**
- **FR-004**: System MUST display 5 zones: Activity Bar (3 cols), Primary Side Bar (25% width, collapsible), Editor Group (remaining), Bottom Panel (30% height, collapsible), Status Bar (1 row).
- **FR-005**: System MUST show a visually distinct border (using `theme.borderFocused` token) on the active/focused pane.
- **FR-006**: System MUST toggle Side Bar visibility when user presses Ctrl+B.
- **FR-007**: System MUST toggle Bottom Panel visibility when user presses Ctrl+J.

**File Explorer**
- **FR-008**: System MUST display hierarchical tree of `wiki/`, `raw/`, and `queries/` directories in Side Bar Explorer view.
- **FR-009**: System MUST allow navigation with j/k/Up/Down keys and folder expand/collapse with Space or h/l.
- **FR-010**: System MUST open selected file in Editor when user presses Enter.

**Markdown Viewing**
- **FR-011**: System MUST render markdown content in Editor viewport using glamour styling (colors, headers, code blocks).
- **FR-012**: System MUST highlight `[[wikilinks]]` with distinct styling (cyan, bold).
- **FR-013**: System MUST allow scrolling with j/k, Page Up/Down, and mouse wheel.

**Wikilink Navigation**
- **FR-014**: System MUST cycle focus between wikilinks when user presses Tab/Shift+Tab in Editor.
- **FR-015**: System MUST open linked article when user presses Enter on a focused wikilink.
- **FR-016**: System MUST maintain navigation history stack with scroll positions.
- **FR-017**: System MUST navigate back/forward in history with Alt+Left/Alt+Right.

**Command Palette**
- **FR-018**: System MUST open Quick Open (file mode) when user presses Ctrl+P.
- **FR-019**: System MUST open Command Palette (command mode) when user presses Ctrl+Shift+P.
- **FR-020**: System MUST filter results in real-time using fuzzy matching as user types.
- **FR-021**: System MUST close palette and execute selection when user presses Enter.

**Search**
- **FR-022**: System MUST switch to Search view when user presses Ctrl+Shift+F.
- **FR-023**: System MUST execute BM25 search on keystroke (debounced 150ms) and display results with snippets.
- **FR-024**: System MUST open selected result in Editor.

**LLM Query**
- **FR-025**: System MUST submit query to LLM when user presses Ctrl+Enter in Search input.
- **FR-026**: System MUST stream LLM response into Editor viewport in real-time.
- **FR-027**: System MUST display streaming status in Bottom Panel.
- **FR-028**: System MUST allow saving query result to `queries/` directory.

**Ingestion**
- **FR-029**: System MUST switch to Ingest view when user presses Ctrl+Shift+I.
- **FR-030**: System MUST ingest URL when user pastes and confirms in input.
- **FR-031**: System MUST display ingested sources with compilation status.

**Compilation**
- **FR-032**: System MUST execute `kb compile` when user selects compile command from palette.
- **FR-033**: System MUST display progress bar and streaming logs in Bottom Panel during compilation.
- **FR-034**: System MUST refresh Explorer tree when compilation completes.

**Linting**
- **FR-035**: System MUST display lint issues in Bottom Panel Problems tab.
- **FR-036**: System MUST navigate to problematic file when user selects an issue.

**Mouse Support**
- **FR-037**: System MUST scroll viewports when user uses mouse wheel.
- **FR-038**: System MUST set focus to pane when user clicks within it.
- **FR-039**: System MUST select items when user clicks in Explorer/List components.

**Status Bar**
- **FR-040**: System MUST display workspace name, LLM provider, article count, and background activity spinner.

### Key Entities

- **AppState**: Root state containing all pane states, focus management, history stack, and background operation flags.
- **PaneId**: Enumeration of focusable zones (activity_bar, sidebar, editor, bottom_panel, command_palette).
- **HistoryEntry**: Navigation history item with file path, scroll offset, and focused link index.
- **LinkPosition**: Wikilink coordinate mapping for click detection (target, row, col_start, col_end).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can navigate from launch to reading an article in under 5 seconds (3 keypresses or clicks).
- **SC-002**: Users can find any file using Quick Open (Ctrl+P) in under 3 seconds regardless of knowledge base size.
- **SC-003**: BM25 search results appear within 200ms of typing (after debounce).
- **SC-004**: LLM responses begin streaming within 2 seconds of query submission (network permitting).
- **SC-005**: Compilation progress updates reflect actual progress within 1 second accuracy.
- **SC-006**: All 30+ keyboard shortcuts work consistently across macOS and Linux terminals.
- **SC-007**: Viewport renders within 16ms of any scroll or key event (equivalent to 60fps responsiveness).
- **SC-008**: 100% of P1 user stories pass acceptance scenarios before release.
- **SC-009**: Application uses less than 100MB memory with knowledge bases up to 1000 articles.

---

## Clarifications

### Session 2026-04-03

- Q: What should the editor area display when launched in a workspace with zero wiki articles? → A: Show a welcome screen with getting-started hints (e.g. "Ingest a source to begin").
- Q: Should the studio write runtime logs or crash reports? → A: Entirely ephemeral - no logs persisted, errors shown only in-UI.
- Q: Can the user trigger multiple background operations simultaneously? → A: Fully concurrent - allow any combination of operations (compile, ingest, query, search) simultaneously.
- Q: Should the TUI require 256-color/Nerd Fonts or support fallback? → A: Support all OpenCode built-in themes from source: opencode (default), catppuccin, dracula, flexoki, gruvbox, monokai, onedark, tokyonight, tron. Each theme defines 57 adaptive color tokens (dark+light) across 7 categories: base (primary, secondary, accent), status (error, warning, success, info), text (text, textMuted, textEmphasized), background (background, backgroundSecondary, backgroundDarker), border (borderNormal, borderFocused, borderDim), markdown (14 tokens), and syntax (9 tokens). Auto-detect truecolor; graceful degradation for reduced terminals.
- Q: How should "smooth scrolling at 60fps" be measured? → A: Viewport renders within 16ms of any scroll/key event (equivalent to 60fps responsiveness).

---

## Assumptions

- Users have terminal emulators supporting 256 colors and mouse events (iTerm2, Terminal.app, GNOME Terminal, etc.).
- Knowledge bases are local (no remote/cloud knowledge bases in v1).
- `@oakoliver/bubbles` will be patched to handle `MouseWheelMsg` and `MouseClickMsg` before TUI development begins.
- Existing `kb` CLI command logic can be reused as internal services (no rewrite needed).
- Users are familiar with VSCode keyboard shortcuts (no onboarding/help system in v1).
- LLM API keys are configured via environment variables (no in-TUI configuration).
- Studio is entirely ephemeral: no runtime logs, crash reports, or session state persisted to disk. All errors are surfaced in-UI only.

---

### Epic 6: Modern UI/UX Enhancements

**Goal:** Deliver a visually stunning and highly productive environment utilizing modern TUI capabilities.

| Feature | Description | Priority |
|---------|-------------|----------|
| Nerd Font Icons | Distinct icons for files, folders, and UI states | P1 |
| Modern Themes | Support for Catppuccin, Nord, or TokyoNight color palettes | P1 |
| Contextual Help Bar | Dynamic bottom bar showing active pane shortcuts using `@oakoliver/bubbles/help` | P0 |
| Terminal Images | Inline image rendering (Sixel/iTerm protocols) for PDF figures/charts | P2 |
| Layout Animations | Smooth pane transitions and hover effects | P3 |

---

## Appendix A: UI Architecture & Layout

The UI strictly follows the **VSCode spatial model**, rendered entirely with `@oakoliver/lipgloss` flex-box style composition.

### Layout Zones

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [A]│                        [C] Editor Group                            │
│    │                                                                    │
│    │  ┌──────────────────────────────────────────────────────────────┐  │
│ A  │  │                                                              │  │
│ c  │  │                                                              │  │
│ t  │  │                      Markdown Viewport                       │  │
│ i  │ [B]                     (glamour rendered)                      │  │
│ v  │  │                                                              │  │
│ i  │ P │                                                              │  │
│ t  │ r │                                                              │  │
│ y  │ i │                                                              │  │
│    │ m │                                                              │  │
│ B  │ a │                                                              │  │
│ a  │ r │                                                              │  │
│ r  │ y │                                                              │  │
│    │   │                                                              │  │
│    │ S │                                                              │  │
│    │ i │                                                              │  │
│    │ d │                                                              │  │
│    │ e │                                                              │  │
│    │ b │                                                              │  │
│    │ a │                                                              │  │
│    │ r │                                                              │  │
│    │  └──────────────────────────────────────────────────────────────┘  │
│    ├────────────────────────────────────────────────────────────────────│
│    │                        [D] Bottom Panel                            │
│    │  Logs, LLM Stream, Linter Output, Compilation Progress            │
├────┴────────────────────────────────────────────────────────────────────┤
│ [E] Status Bar                                                          │
│ 📁 my-research  │  🤖 anthropic  │  ✓ 12 articles  │  ⟳ compiling...    │
├─────────────────────────────────────────────────────────────────────────┤
│ [F] Contextual Help Bar (bubbles/help)                                  │
│ ^B Toggle Sidebar • ? Help • ^Q Quit • Enter Select • / Filter          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Zone Definitions

| Zone | Name | Width/Height | Collapsible | Toggle Key |
|------|------|--------------|-------------|------------|
| A | Activity Bar | Fixed 3 cols | No | - |
| B | Primary Side Bar | 25% width (min 20, max 60 cols) | Yes | `Ctrl+B` |
| C | Editor Group | Remaining width | No | - |
| D | Bottom Panel | 30% height (min 5, max 20 rows) | Yes | `Ctrl+J` |
| E | Status Bar | Fixed 1 row | No | - |
| F | Contextual Help Bar | Fixed 1 row (bottom-most) | No | `?` |

### Responsive Behavior

- **Minimum Terminal Size:** 80 columns x 24 rows
- **Below Minimum:** Display error message requesting resize
- **Window Resize:** `WindowSizeMsg` triggers full layout recalculation
- **Sidebar Collapse:** When collapsed, Activity Bar remains visible (3 cols)

---

## Appendix B: Component Library Mapping

### Zone A: Activity Bar

| Element | Library | Component | Notes |
|---------|---------|-----------|-------|
| Icon buttons | `lipgloss` | Styled text blocks | Vertical stack of 3-char badges |
| Active indicator | `lipgloss` | Left border accent | Blue bar on active view |

**Content:**
```
┌───┐
│ 📁│  Explorer (Ctrl+Shift+E)
├───┤
│ 🔍│  Search (Ctrl+Shift+F)
├───┤
│ 📥│  Ingest (Ctrl+Shift+I)
└───┘
```

### Zone B: Primary Side Bar

| View | Library | Component | Data Source |
|------|---------|-----------|-------------|
| Explorer Tree | `bubbles` | `list.Model` | `wiki/`, `raw/`, `queries/` dirs |
| Search Results | `bubbles` | `list.Model` + `textinput.Model` | BM25 index |
| Ingest Queue | `bubbles` | `list.Model` | `raw/_manifest.json` |

**Explorer Tree Structure:**
```
▼ wiki/
  ▼ concepts/
    attention-mechanism.md
    transformer.md
  ▼ entities/
    openai.md
  ▼ syntheses/
    llm-comparison.md
  _index.md
▶ raw/
▶ queries/
```

### Zone C: Editor Group

| Element | Library | Component | Notes |
|---------|---------|-----------|-------|
| Tab bar | `lipgloss` | Horizontal join | Shows open file names |
| Active tab | `lipgloss` | Highlighted style | Different background |
| Viewport | `bubbles` | `viewport.Model` | Scrollable, mouse wheel support |
| Content | `glamour` | `renderWithStyle()` | Dark theme, custom link styling |

### Zone D: Bottom Panel

| View | Library | Component | Trigger |
|------|---------|-----------|---------|
| Output | `bubbles` | `viewport.Model` | LLM streaming, compile logs |
| Problems | `bubbles` | `list.Model` | `kb lint` results |
| Progress | `bubbles` | `progress.Model` | During `kb compile` |

**Tabs:**
```
┌─────────┬──────────┬──────────┐
│ OUTPUT  │ PROBLEMS │ PROGRESS │
└─────────┴──────────┴──────────┘
```

### Zone E: Status Bar

| Segment | Library | Component | Content |
|---------|---------|-----------|---------|
| Workspace | `lipgloss` | Text | Current `.kb` directory name |
| LLM Provider | `lipgloss` | Text + icon | `🤖 anthropic` or `🤖 openai` |
| Wiki Stats | `lipgloss` | Text | Article count from status |
| Background Activity | `bubbles` | `spinner.Model` | During async operations |
| Errors/Warnings | `lipgloss` | Text | Lint issue counts |

### Overlay: Command Palette

| Element | Library | Component | Notes |
|---------|---------|-----------|-------|
| Container | `lipgloss` | `Place()` centered | 60% width, drops from top |
| Input | `bubbles` | `textinput.Model` | Fuzzy search input |
| Results | `bubbles` | `list.Model` | Filtered file/command list |
| Backdrop | `lipgloss` | Dim overlay | Optional: darken background |

### Zone F: Contextual Help Bar

| Element | Library | Component | Notes |
|---------|---------|-----------|-------|
| Keybinds | `bubbles` | `help.Model` | Automatically updates based on `activePane` |
| View | `lipgloss` | `JoinHorizontal` | Icons, keys, and descriptions |

---

## Appendix C: UX Flows

### Flow 1: Opening and Navigating an Article

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER launches `kb` (no args) or `kb studio`                  │
│    └─▶ TUI initializes, reads .kb/config.json                   │
│    └─▶ Explorer sidebar loads wiki/ tree                        │
│    └─▶ Editor shows welcome or last opened file                 │
├─────────────────────────────────────────────────────────────────┤
│ 2. USER navigates Explorer with keyboard (j/k or arrows)        │
│    └─▶ List selection moves, highlighted item changes           │
│    └─▶ USER presses Enter                                       │
│    └─▶ File content loads into Editor viewport                  │
│    └─▶ Focus shifts to Editor (blue border)                     │
│    └─▶ History stack pushes: ["wiki/concepts/attention.md"]     │
├─────────────────────────────────────────────────────────────────┤
│ 3. USER scrolls with j/k, Page Up/Down, or mouse wheel          │
│    └─▶ Viewport scrolls, scroll position tracked                │
├─────────────────────────────────────────────────────────────────┤
│ 4. USER sees [[transformer]] wikilink, presses Tab              │
│    └─▶ First link in document highlights (inverted colors)      │
│    └─▶ Tab again cycles to next link                            │
│    └─▶ Enter follows the link                                   │
│    └─▶ History stack: ["attention.md", "transformer.md"]        │
├─────────────────────────────────────────────────────────────────┤
│ 5. USER presses Alt+Left (or Backspace in Editor)               │
│    └─▶ History pops, returns to attention.md                    │
│    └─▶ Scroll position restored                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 2: Using the Command Palette

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER presses Ctrl+P from any context                         │
│    └─▶ Command Palette overlay appears (centered, top)          │
│    └─▶ Focus moves to TextInput                                 │
│    └─▶ Full file list shown below input                         │
├─────────────────────────────────────────────────────────────────┤
│ 2. USER types "trans"                                           │
│    └─▶ List filters in real-time                                │
│    └─▶ Shows: transformer.md, transfer-learning.md              │
├─────────────────────────────────────────────────────────────────┤
│ 3. USER presses Down to select, then Enter                      │
│    └─▶ Overlay closes                                           │
│    └─▶ Selected file opens in Editor                            │
│    └─▶ History stack updated                                    │
├─────────────────────────────────────────────────────────────────┤
│ 4. USER presses Ctrl+Shift+P (Command mode)                     │
│    └─▶ Palette shows commands: "> kb: compile", "> kb: lint"    │
│    └─▶ USER selects "> kb: compile", presses Enter              │
│    └─▶ Compile flow triggers (see Flow 4)                       │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 3: Searching and Querying

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER presses Ctrl+Shift+F                                    │
│    └─▶ Sidebar switches to Search view                          │
│    └─▶ Activity Bar shows Search icon active                    │
│    └─▶ Focus moves to search TextInput                          │
├─────────────────────────────────────────────────────────────────┤
│ 2. USER types "attention mechanism"                             │
│    └─▶ BM25 search executes on each keystroke (debounced 150ms) │
│    └─▶ Results list populates with file + snippet               │
│    └─▶ USER clicks a result or presses Enter                    │
│    └─▶ Article opens in Editor                                  │
├─────────────────────────────────────────────────────────────────┤
│ 3. USER wants LLM synthesis, presses Ctrl+Enter                 │
│    └─▶ Query mode activates                                     │
│    └─▶ Editor switches to "Untitled Query" document             │
│    └─▶ Bottom Panel opens showing "Thinking..."                 │
│    └─▶ LLM response streams into Editor viewport                │
│    └─▶ Citations appear as [[wikilinks]] in response            │
├─────────────────────────────────────────────────────────────────┤
│ 4. USER likes the answer, presses Ctrl+S (or palette command)   │
│    └─▶ Prompt for filename (huh form)                           │
│    └─▶ Saved to queries/ or promoted to wiki/                   │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 4: Compiling the Wiki

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER triggers compile (Ctrl+Shift+P > "kb: compile")         │
│    └─▶ Bottom Panel opens and expands                           │
│    └─▶ Progress bar appears in Panel                            │
│    └─▶ Status Bar shows spinner + "Compiling..."                │
├─────────────────────────────────────────────────────────────────┤
│ 2. SYSTEM processes each source                                 │
│    └─▶ Panel streams: "Processing: arxiv-1706.03762.md"         │
│    └─▶ Progress bar updates: [████████░░░░░░░░] 50%             │
│    └─▶ LLM reasoning streams (if anthropic extended thinking)   │
├─────────────────────────────────────────────────────────────────┤
│ 3. SYSTEM completes                                             │
│    └─▶ Panel shows: "✓ Compiled 5 articles"                     │
│    └─▶ Explorer tree refreshes to show new files                │
│    └─▶ Status Bar: spinner stops, shows "✓ 17 articles"         │
│    └─▶ Bottom Panel can be dismissed with Ctrl+J                │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 5: Ingesting a New Source

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER presses Ctrl+Shift+I (or clicks Ingest in Activity Bar) │
│    └─▶ Sidebar switches to Ingest view                          │
│    └─▶ Shows current sources from manifest                      │
│    └─▶ "Add Source" input at top                                │
├─────────────────────────────────────────────────────────────────┤
│ 2. USER pastes URL: "https://arxiv.org/abs/2301.00001"          │
│    └─▶ System detects URL type                                  │
│    └─▶ Status Bar shows spinner: "Fetching..."                  │
│    └─▶ Content downloaded and saved to raw/                     │
│    └─▶ Source list updates with new entry                       │
│    └─▶ Status: "pending compilation"                            │
├─────────────────────────────────────────────────────────────────┤
│ 3. USER selects local file (Tab to file picker button)          │
│    └─▶ FilePicker overlay opens (bubbles filepicker)            │
│    └─▶ Navigate filesystem, select PDF                          │
│    └─▶ File ingested to raw/papers/                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Appendix D: Keyboard Shortcuts

### Global Shortcuts (Work in Any Context)

| Shortcut | Action | Notes |
|----------|--------|-------|
| `Ctrl+P` | Quick Open (files) | Opens Command Palette in file mode |
| `Ctrl+Shift+P` | Command Palette | Opens Command Palette in command mode |
| `Ctrl+B` | Toggle Side Bar | Show/hide primary sidebar |
| `Ctrl+J` | Toggle Bottom Panel | Show/hide output/problems panel |
| `Ctrl+Shift+E` | Focus Explorer | Switch sidebar to Explorer view |
| `Ctrl+Shift+F` | Focus Search | Switch sidebar to Search view |
| `Ctrl+Shift+I` | Focus Ingest | Switch sidebar to Ingest view |
| `Ctrl+Q` | Quit | Exit the TUI |
| `Escape` | Dismiss/Defocus | Close overlay, clear input, or unfocus |

### Explorer Shortcuts (When Sidebar Focused)

| Shortcut | Action |
|----------|--------|
| `j` / `Down` | Move selection down |
| `k` / `Up` | Move selection up |
| `Enter` / `l` | Open selected file |
| `h` | Collapse folder / Go to parent |
| `Space` | Toggle folder expand/collapse |
| `/` | Quick filter within tree |

### Editor Shortcuts (When Editor Focused)

| Shortcut | Action |
|----------|--------|
| `j` / `Down` | Scroll down |
| `k` / `Up` | Scroll up |
| `Ctrl+D` / `Page Down` | Scroll half page down |
| `Ctrl+U` / `Page Up` | Scroll half page up |
| `g` `g` | Jump to top |
| `G` | Jump to bottom |
| `Tab` | Focus next wikilink |
| `Shift+Tab` | Focus previous wikilink |
| `Enter` | Follow focused wikilink |
| `Alt+Left` / `Backspace` | Navigate back in history |
| `Alt+Right` | Navigate forward in history |
| `Ctrl+Shift+O` | Go to symbol (headers) |

### Search Shortcuts (When Search Input Focused)

| Shortcut | Action |
|----------|--------|
| `Enter` | Open first/selected result |
| `Ctrl+Enter` | Submit as LLM query |
| `Down` | Move to results list |
| `Escape` | Clear search / Return to previous view |

### Command Palette Shortcuts

| Shortcut | Action |
|----------|--------|
| `Down` / `Ctrl+N` | Select next item |
| `Up` / `Ctrl+P` | Select previous item |
| `Enter` | Execute selected item |
| `Escape` | Close palette |

---

## Appendix E: Mouse & Touch Interaction

### General Mouse Behaviors

| Interaction | Zone | Behavior |
|-------------|------|----------|
| **Left Click** | Activity Bar icon | Switch sidebar view |
| **Left Click** | Sidebar item | Select item |
| **Double Click** | Sidebar item | Open file in editor |
| **Left Click** | Editor viewport | Set focus to editor |
| **Left Click** | Wikilink in editor | Follow link (see Link Mapping) |
| **Left Click** | Bottom Panel tab | Switch panel tab |
| **Mouse Wheel** | Any viewport | Scroll content |
| **Mouse Wheel** | Sidebar list | Scroll list |

### Focus Ring Behavior

- Clicking any pane sets that pane as `activePane`
- Active pane displays focused border (using `theme.borderFocused` token)
- Inactive panes display normal border (using `theme.borderNormal` token)

### Wikilink Click Detection (Technical)

Terminal emulators report mouse clicks as `(x, y)` grid coordinates. To make wikilinks clickable:

1. **Parse Phase:** When loading markdown, extract all `[[wikilinks]]` with their text positions
2. **Render Phase:** After glamour renders, calculate the final (row, col_start, col_end) of each link accounting for:
   - Word wrapping
   - ANSI escape sequences (zero-width)
   - Viewport scroll offset
3. **Click Phase:** On `MouseClickMsg`, check if `(click_x, click_y + scroll_offset)` intersects any link boundary
4. **Execute:** If intersection found, trigger navigation to that wiki page

**Fallback:** If coordinate mapping proves unreliable, Tab navigation remains the primary link traversal method.

---

## Appendix F: State Machine

### Root Application State

```typescript
// src/tui/state.ts

import type { Model as ViewportModel } from "@oakoliver/bubbles/viewport";
import type { Model as ListModel } from "@oakoliver/bubbles/list";
import type { Model as TextInputModel } from "@oakoliver/bubbles/textinput";
import type { Model as SpinnerModel } from "@oakoliver/bubbles/spinner";
import type { Model as ProgressModel } from "@oakoliver/bubbles/progress";

// Pane identifiers
type PaneId = 
  | "activity_bar" 
  | "sidebar" 
  | "editor" 
  | "bottom_panel" 
  | "command_palette";

// Sidebar view modes
type SidebarView = "explorer" | "search" | "ingest";

// Bottom panel tabs
type PanelTab = "output" | "problems" | "progress";

// History entry for navigation
interface HistoryEntry {
  filePath: string;
  scrollOffset: number;
  focusedLinkIndex: number;
}

// Parsed link position for click detection
interface LinkPosition {
  target: string;        // The wikilink target (e.g., "transformer")
  row: number;           // Line number in rendered output
  colStart: number;      // Starting column
  colEnd: number;        // Ending column
}

// Main application state
interface AppState {
  // Layout
  dimensions: {
    width: number;
    height: number;
  };
  
  // Focus management
  activePane: PaneId;
  previousPane: PaneId;
  
  // Activity Bar
  activityBar: {
    selectedView: SidebarView;
  };
  
  // Primary Side Bar
  sidebar: {
    isVisible: boolean;
    width: number;
    currentView: SidebarView;
    
    // Explorer state
    explorer: {
      tree: ListModel;
      expandedFolders: Set<string>;
      selectedPath: string | null;
    };
    
    // Search state
    search: {
      input: TextInputModel;
      results: ListModel;
      query: string;
      isLoading: boolean;
    };
    
    // Ingest state
    ingest: {
      input: TextInputModel;
      sourceList: ListModel;
      isIngesting: boolean;
    };
  };
  
  // Editor Group
  editor: {
    // Current document
    currentFile: string | null;
    content: string;
    renderedContent: string;
    viewport: ViewportModel;
    
    // Link navigation
    links: LinkPosition[];
    focusedLinkIndex: number;
    
    // History
    history: HistoryEntry[];
    historyIndex: number;
    
    // Tabs (for future multi-tab support)
    openTabs: string[];
    activeTabIndex: number;
  };
  
  // Bottom Panel
  bottomPanel: {
    isVisible: boolean;
    height: number;
    activeTab: PanelTab;
    
    output: {
      viewport: ViewportModel;
      content: string;
    };
    
    problems: {
      list: ListModel;
      items: LintIssue[];
    };
    
    progress: {
      bar: ProgressModel;
      current: number;
      total: number;
      message: string;
    };
  };
  
  // Status Bar
  statusBar: {
    workspaceName: string;
    llmProvider: "anthropic" | "openai" | null;
    articleCount: number;
    spinner: SpinnerModel;
    isLoading: boolean;
    loadingMessage: string;
    errorCount: number;
    warningCount: number;
  };
  
  // Command Palette
  commandPalette: {
    isOpen: boolean;
    mode: "files" | "commands";
    input: TextInputModel;
    results: ListModel;
    allFiles: string[];
    allCommands: Command[];
  };
  
  // Background operations
  operations: {
    isCompiling: boolean;
    isQuerying: boolean;
    streamBuffer: string;
  };
}

// Command definition
interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
}

// Lint issue from kb lint
interface LintIssue {
  file: string;
  line: number;
  severity: "error" | "warning";
  message: string;
}
```

### Message Types

```typescript
// src/tui/messages.ts

import type { Msg, KeyMsg, MouseMsg, WindowSizeMsg } from "@oakoliver/bubbletea";

// Custom application messages
type AppMsg =
  // Navigation
  | { type: "OPEN_FILE"; path: string }
  | { type: "NAVIGATE_BACK" }
  | { type: "NAVIGATE_FORWARD" }
  | { type: "FOLLOW_LINK"; target: string }
  
  // Sidebar
  | { type: "SET_SIDEBAR_VIEW"; view: SidebarView }
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "TOGGLE_FOLDER"; path: string }
  
  // Search
  | { type: "SEARCH_UPDATE"; query: string }
  | { type: "SEARCH_RESULTS"; results: SearchResult[] }
  | { type: "SUBMIT_QUERY" }
  
  // LLM
  | { type: "LLM_STREAM_CHUNK"; chunk: string }
  | { type: "LLM_STREAM_END" }
  | { type: "LLM_ERROR"; error: string }
  
  // Compile
  | { type: "COMPILE_START" }
  | { type: "COMPILE_PROGRESS"; current: number; total: number; file: string }
  | { type: "COMPILE_END"; success: boolean }
  
  // Ingest
  | { type: "INGEST_START"; source: string }
  | { type: "INGEST_END"; success: boolean }
  
  // Panel
  | { type: "TOGGLE_BOTTOM_PANEL" }
  | { type: "SET_PANEL_TAB"; tab: PanelTab }
  
  // Command Palette
  | { type: "OPEN_PALETTE"; mode: "files" | "commands" }
  | { type: "CLOSE_PALETTE" }
  | { type: "PALETTE_SELECT"; index: number }
  
  // Focus
  | { type: "SET_FOCUS"; pane: PaneId }
  
  // Refresh
  | { type: "REFRESH_TREE" }
  | { type: "REFRESH_STATUS" };
```

---

## Appendix G: Visual Specifications

### Color Palette (OpenCode Theme System)

KB Studio uses the same theme system as OpenCode, with 9 built-in themes and 57 adaptive color tokens per theme. Each token provides both `dark` and `light` hex values. The default theme is `opencode`.

**Built-in Themes:** opencode, catppuccin, dracula, flexoki, gruvbox, monokai, onedark, tokyonight, tron

**Token-to-UI Mapping (using semantic tokens, not hardcoded hex):**

| UI Element | Theme Token |
|---------|-------|
| Background | `background` |
| Sidebar background | `backgroundSecondary` |
| Active border (focus ring) | `borderFocused` |
| Inactive border | `borderNormal` |
| Dim border | `borderDim` |
| Text primary | `text` |
| Text muted | `textMuted` |
| Text accent | `accent` |
| Wikilink | `markdownLink` |
| Wikilink text | `markdownLinkText` |
| Error | `error` |
| Warning | `warning` |
| Success | `success` |
| Info | `info` |
| Selection highlight | `backgroundDarker` |
| Markdown headings | `markdownHeading` |
| Markdown code | `markdownCode` |
| Markdown emphasis | `markdownEmph` |
| Markdown strong | `markdownStrong` |

### Typography & Iconography

- **Nerd Fonts:** Required for file/folder icons (`nf-fa-folder`, `nf-seti-markdown`), status badges, and the contextual help bar keys.
- **Headers:** Bold + color (glamour handles this)
- **Code blocks:** Distinct background, syntax highlighting
- **Links:** Underline + Teal color
- **Wikilinks:** Bold Teal, inverted when focused

### Border Styles

```typescript
// Active pane (uses theme.borderFocused token)
lipgloss.newStyle()
  .border(lipgloss.RoundedBorder)
  .borderForeground(theme.borderFocused())

// Inactive pane (uses theme.borderNormal token)
lipgloss.newStyle()
  .border(lipgloss.RoundedBorder)
  .borderForeground(theme.borderNormal())

// Command Palette overlay (uses theme.borderFocused token)
lipgloss.newStyle()
  .border(lipgloss.RoundedBorder)
  .borderForeground(theme.borderFocused())
  .padding(0, 1)
```

---

## Appendix H: Technology Stack

### Runtime

| Component | Technology |
|-----------|------------|
| Runtime | Bun >= 1.0.0 |
| Language | TypeScript (pure, no transpilation for CLI) |

### Core Dependencies

| Package | Version | Role |
|---------|---------|------|
| `@oakoliver/bubbletea` | ^1.0.0 | Elm-architecture TUI framework (event loop, rendering) |
| `@oakoliver/bubbles` | ^1.0.3 | Pre-built TUI components (viewport, list, textinput, spinner, progress) |
| `@oakoliver/lipgloss` | ^1.0.3 | CSS-like terminal styling (borders, colors, layout) |
| `@oakoliver/glamour` | ^1.0.1 | Markdown-to-ANSI rendering |
| `@oakoliver/huh` | ^1.0.1 | Interactive forms and prompts |
| `bm25s` | ^1.0.1 | BM25 search index |
| `zod` | ^3.x | Schema validation |

### Existing `kb` Core (Reused)

- `src/core/` - Schemas, config, manifest, graph, markdown parsing
- `src/index/` - BM25 and PageIndex search
- `src/llm/` - LLM provider abstraction (Anthropic/OpenAI)
- `src/ingest/` - URL, PDF, file, git ingestion
- `src/commands/` - Existing CLI command logic (reused as "services")

---

## Appendix I: Feature Epics

### Epic 1: Core Navigation & Reading

**Goal:** Users can browse and read wiki articles with full VSCode-style navigation.

| Feature | Description | Priority |
|---------|-------------|----------|
| File Explorer | Hierarchical tree view of workspace directories | P0 |
| Markdown Viewer | Render articles with glamour in viewport | P0 |
| Wikilink Highlighting | Distinct color for `[[wikilinks]]` | P0 |
| Wikilink Navigation (Keyboard) | Tab cycles links, Enter follows | P0 |
| Wikilink Navigation (Mouse) | Click to follow link | P1 |
| History Stack | Back/Forward navigation with scroll position memory | P0 |
| Breadcrumb | Show current file path above editor | P2 |

### Epic 2: Search & Query

**Goal:** Fast keyword search and LLM-powered Q&A from within the TUI.

| Feature | Description | Priority |
|---------|-------------|----------|
| BM25 Search Bar | Instant filtering in sidebar | P0 |
| Search Result Snippets | Show matching text excerpts | P1 |
| LLM Query Input | Natural language question box | P0 |
| Streaming Response | Real-time LLM output in editor | P0 |
| Source Citations | Show which articles informed the answer | P1 |
| Promote to Wiki | Save query result as wiki article | P1 |

### Epic 3: Ingestion & Compilation

**Goal:** Add sources and compile the wiki without leaving the TUI.

| Feature | Description | Priority |
|---------|-------------|----------|
| Source List View | Show all ingested sources with status | P0 |
| Quick Ingest | Paste URL or path to add source | P0 |
| File Picker | Browse filesystem to select files | P1 |
| Compile Trigger | Run compilation with progress UI | P0 |
| Streaming Logs | Show LLM reasoning in bottom panel | P0 |
| Incremental Status | Visual diff of what changed | P2 |

### Epic 4: Command Palette & Quick Actions

**Goal:** VSCode-style command palette for power users.

| Feature | Description | Priority |
|---------|-------------|----------|
| Quick Open (`Ctrl+P`) | Fuzzy find any file | P0 |
| Command Palette (`Ctrl+Shift+P`) | Execute any kb command | P0 |
| Recent Files | Show recently opened in palette | P1 |
| Go to Symbol | Jump to headers within article | P2 |

### Epic 5: Linting & Health

**Goal:** Surface wiki health issues within the TUI.

| Feature | Description | Priority |
|---------|-------------|----------|
| Lint on Open | Auto-run lint, show in Problems tab | P1 |
| Problem Navigation | Click problem to jump to file | P1 |
| Inline Warnings | Highlight broken links in editor | P2 |

---

## Appendix J: Technical Risks & Prerequisites

### Risk 1: Mouse Event Handling in Bubbles (CRITICAL)

**Issue:** The `@oakoliver/bubbles` `Viewport` component has `mouseWheelEnabled` configuration but the `update()` method does not handle `MouseWheelMsg`. Similarly, `List` does not handle `MouseClickMsg`.

**Impact:** Without fixing this, mouse scrolling and clicking are non-functional.

**Mitigation:** 
1. Patch `@oakoliver/bubbles` to add mouse event handling
2. Publish new version (e.g., `1.0.4`)
3. Update `kb` dependency

**Files to modify:**
- `bubbles/src/viewport/viewport.ts` - Add `MouseWheelMsg` handling
- `bubbles/src/list/list.ts` - Add `MouseClickMsg` handling

### Risk 2: Wikilink Coordinate Mapping (HIGH)

**Issue:** After glamour renders markdown to ANSI strings, we lose knowledge of where links are positioned. ANSI escape codes are zero-width, and word wrapping changes line positions.

**Impact:** Click-to-follow-link may not work reliably across all terminal emulators.

**Mitigation:**
1. Build a parallel "link position calculator" that processes the same markdown
2. Account for ANSI sequence stripping when calculating widths
3. If unreliable, default to Tab navigation as primary method

### Risk 3: Terminal Size Variability (MEDIUM)

**Issue:** Users may have very small terminal windows (< 80x24).

**Impact:** Layout breaks, UI becomes unusable.

**Mitigation:**
1. Define minimum size (80x24)
2. Show error overlay if terminal is too small
3. Graceful degradation: hide sidebar if width < 60

### Risk 4: LLM Streaming Complexity (MEDIUM)

**Issue:** Streaming LLM responses while maintaining UI responsiveness requires careful async handling.

**Impact:** UI may freeze during long responses.

**Mitigation:**
1. Use Bubbletea's `Cmd` system for async operations
2. Chunk updates to avoid flooding the render loop
3. Debounce viewport updates during streaming (every 100ms)

---

## Appendix K: ASCII Wireframes

### Wireframe A: Full Layout (Explorer + Article)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📁│ EXPLORER                    │ wiki/concepts/attention-mechanism.md      │
│───│─────────────────────────────│────────────────────────────────────────────│
│   │ ▼ wiki/                     │ # Attention Mechanism                      │
│ 🔍│   ▼ concepts/               │                                            │
│   │     ● attention-mechanism.md│ The attention mechanism is a component    │
│ 📥│     ○ transformer.md        │ in neural network architectures that      │
│   │     ○ embeddings.md         │ allows the model to focus on different    │
│   │   ▶ entities/               │ parts of the input sequence.              │
│   │   ▶ syntheses/              │                                            │
│   │   ○ _index.md               │ ## How It Works                           │
│   │ ▶ raw/                      │                                            │
│   │ ▶ queries/                  │ In [[transformer]] architectures, the     │
│   │                             │ attention function can be described as    │
│   │                             │ mapping a query and key-value pairs to    │
│   │                             │ an output.                                │
│   │                             │                                            │
│   │                             │ See also: [[self-attention]],             │
│   │                             │ [[multi-head-attention]]                  │
│   │                             │                                            │
│   │─────────────────────────────│────────────────────────────────────────────│
│   │                             │ OUTPUT                                     │
│   │                             │ ✓ Loaded attention-mechanism.md            │
├───┴─────────────────────────────┴────────────────────────────────────────────┤
│ 📁 my-research │ 🤖 anthropic │ ✓ 12 articles │ 0 errors │ 2 warnings       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe B: Command Palette Open

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📁│ EXPLORER        ┌───────────────────────────────────────────┐           │
│───│─────────────────│ > trans                                   │───────────│
│   │ ▼ wiki/         │───────────────────────────────────────────│           │
│ 🔍│   ▼ concepts/   │   transformer.md                          │           │
│   │     ● attentio  │   transfer-learning.md                    │           │
│ 📥│     ○ transform │   translation-models.md                   │           │
│   │     ○ embedding └───────────────────────────────────────────┘           │
│   │   ▶ entities/               │ allows the model to focus on different    │
│   │   ▶ syntheses/              │ parts of the input sequence.              │
│   │   ○ _index.md               │                                            │
│   │ ▶ raw/                      │ ## How It Works                           │
│   │ ▶ queries/                  │                                            │
│   │                             │ In [[transformer]] architectures, the     │
│   │                             │ attention function can be described as    │
│   │                             │ mapping a query and key-value pairs to    │
│   │                             │ an output.                                │
│   │                             │                                            │
│   │                             │ See also: [[self-attention]],             │
│   │                             │ [[multi-head-attention]]                  │
│   │─────────────────────────────│────────────────────────────────────────────│
│   │                             │ OUTPUT                                     │
├───┴─────────────────────────────┴────────────────────────────────────────────┤
│ 📁 my-research │ 🤖 anthropic │ ✓ 12 articles │ 0 errors │ 2 warnings       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe C: Search View with LLM Query

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📁│ SEARCH                      │ Query Result (Untitled)                    │
│───│─────────────────────────────│────────────────────────────────────────────│
│   │ ┌─────────────────────────┐ │ # How does attention work?                 │
│ 🔍│ │ How does attention work │ │                                            │
│   │ └─────────────────────────┘ │ The attention mechanism works by computing │
│ 📥│                             │ compatibility scores between a query and   │
│   │ Press Ctrl+Enter for LLM    │ a set of keys. These scores are then used  │
│   │                             │ to weight the corresponding values.        │
│   │ ─── BM25 Results ───        │                                            │
│   │                             │ ## Key Concepts                            │
│   │ ● attention-mechanism.md    │                                            │
│   │   "...allows the model to   │ 1. **Query, Key, Value**: The three       │
│   │   focus on different..."    │    components of attention. See            │
│   │                             │    [[attention-mechanism]] for details.   │
│   │ ○ transformer.md            │                                            │
│   │   "...multi-head attention  │ 2. **Softmax**: Normalizes scores to      │
│   │   sublayer..."              │    create a probability distribution.     │
│   │                             │                                            │
│   │ ○ self-attention.md         │ ## Sources                                │
│   │   "...each position in      │ - [[attention-mechanism]]                 │
│   │   the sequence..."          │ - [[transformer]]                         │
│   │─────────────────────────────│────────────────────────────────────────────│
│   │                             │ OUTPUT ──────────────────────────────────  │
│   │                             │ ✓ Query completed (1.2s) │ Ctrl+S to save  │
├───┴─────────────────────────────┴────────────────────────────────────────────┤
│ 📁 my-research │ 🤖 anthropic │ ✓ 12 articles │ ⟳ streaming...              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe D: Compilation in Progress

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📁│ EXPLORER                    │ wiki/concepts/attention-mechanism.md      │
│───│─────────────────────────────│────────────────────────────────────────────│
│   │ ▼ wiki/                     │ # Attention Mechanism                      │
│ 🔍│   ▼ concepts/               │                                            │
│   │     ● attention-mechanism.md│ The attention mechanism is a component    │
│ 📥│     ○ transformer.md        │ in neural network architectures that      │
│   │   ▶ entities/               │ allows the model to focus on different    │
│   │   ▶ syntheses/              │ parts of the input sequence.              │
│   │ ▶ raw/                      │                                            │
│   │ ▶ queries/                  │                                            │
│   │                             │                                            │
│   │─────────────────────────────│────────────────────────────────────────────│
│   │                             │ PROGRESS ────────────────────────────────  │
│   │                             │ Compiling knowledge base...                │
│   │                             │                                            │
│   │                             │ [████████████░░░░░░░░░░░░░░░░] 42%         │
│   │                             │                                            │
│   │                             │ Current: arxiv-2301.00001.md               │
│   │                             │ ├─ Extracting concepts...                  │
│   │                             │ ├─ Found: "retrieval augmented generation" │
│   │                             │ └─ Writing: wiki/concepts/rag.md           │
│   │                             │                                            │
│   │                             │ Completed: 5/12 sources                    │
├───┴─────────────────────────────┴────────────────────────────────────────────┤
│ 📁 my-research │ 🤖 anthropic │ ⟳ Compiling... (5/12)                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe E: Ingest View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📁│ INGEST SOURCES              │ Preview: arxiv-2301.00001                  │
│───│─────────────────────────────│────────────────────────────────────────────│
│   │ ┌─────────────────────────┐ │ # Retrieval-Augmented Generation          │
│ 🔍│ │ Paste URL or path...    │ │                                            │
│   │ └─────────────────────────┘ │ **Source:** https://arxiv.org/abs/2301... │
│ 📥│ [Browse Files] [Add Git]    │ **Type:** PDF (converted)                  │
│   │                             │ **Status:** Pending compilation            │
│   │ ─── Ingested Sources ───    │ **Size:** 24 KB                           │
│   │                             │                                            │
│   │ ✓ arxiv-1706.03762.md       │ ---                                        │
│   │   url • compiled            │                                            │
│   │                             │ Abstract: We present a novel approach to   │
│   │ ✓ research-notes.md         │ retrieval-augmented generation that...    │
│   │   file • compiled           │                                            │
│   │                             │                                            │
│   │ ⟳ arxiv-2301.00001.md       │                                            │
│   │   url • pending             │                                            │
│   │                             │                                            │
│   │ ○ meeting-notes.md          │                                            │
│   │   file • pending            │                                            │
│   │─────────────────────────────│────────────────────────────────────────────│
│   │                             │ OUTPUT                                     │
│   │                             │ ✓ Ingested arxiv-2301.00001 (24 KB)        │
├───┴─────────────────────────────┴────────────────────────────────────────────┤
│ 📁 my-research │ 🤖 anthropic │ 4 sources │ 2 pending compilation           │
└─────────────────────────────────────────────────────────────────────────────┘
```
