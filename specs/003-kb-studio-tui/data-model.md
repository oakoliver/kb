# Data Model: KB Studio TUI

## Overview

The studio introduces an application-layer state model over the existing kb workspace files. Persistent domain data continues to live in `.kb/config.json`, `raw/_manifest.json`, `wiki/**/*.md`, `wiki/meta/graph.json`, and `queries/**/*.md`. The TUI adds transient runtime models for layout, focus, open documents, overlays, and background operations.

## Entities

### StudioAppState

- Purpose: Root runtime state for the full-screen application.
- Fields:
  - `workspaceRoot: string`
  - `dimensions: { width: number; height: number }`
  - `activePane: PaneId`
  - `previousPane: PaneId`
  - `sidebar: SidebarState`
  - `editor: EditorState`
  - `bottomPanel: BottomPanelState`
  - `statusBar: StatusBarState`
  - `commandPalette: CommandPaletteState`
  - `operations: OperationState`
  - `capabilities: TerminalCapabilities`
- Relationships:
  - Owns all interactive pane state.
  - Reads from `WorkspaceSnapshot` and operation results.
- Validation rules:
  - Terminal dimensions must satisfy `width >= 80` and `height >= 24` for normal rendering.
  - `activePane` must always reference a visible or overlay pane.

### WorkspaceSnapshot

- Purpose: Derived view of the current kb workspace used by explorer, status bar, search, and operations.
- Fields:
  - `config: WorkspaceConfig`
  - `manifestEntries: SourceEntry[]`
  - `graphNodes: GraphNodeSummary[]`
  - `wikiFiles: WorkspaceFile[]`
  - `queryFiles: WorkspaceFile[]`
  - `articleCounts: { total: number; concepts: number; entities: number; syntheses: number }`
- Relationships:
  - Derived from existing kb resolver/config/manifest/graph/file readers.
  - Refreshes after ingest, compile, promote, or lint operations.
- Validation rules:
  - Workspace root must contain a valid `.kb` directory.

### SidebarState

- Purpose: Represents the collapsible primary side bar and its current mode.
- Fields:
  - `isVisible: boolean`
  - `width: number`
  - `view: SidebarView`
  - `explorer: ExplorerState`
  - `search: SearchState`
  - `ingest: IngestState`
- Relationships:
  - One active `SidebarView` at a time.
- Validation rules:
  - Width stays within configured min/max bounds.

### ExplorerState

- Purpose: Hierarchical browse state for `wiki/`, `raw/`, and `queries/`.
- Fields:
  - `items: ExplorerItem[]`
  - `expandedPaths: Set<string>`
  - `selectedPath: string | null`
  - `filter: string`
- Relationships:
  - `ExplorerItem.path` maps to a `WorkspaceFile` or logical folder.
- Validation rules:
  - Selected path must exist in `items` when non-null.

### ExplorerItem

- Purpose: Flattened row in the explorer tree.
- Fields:
  - `path: string`
  - `name: string`
  - `kind: "folder" | "file"`
  - `depth: number`
  - `isExpanded: boolean`
  - `isDirectory: boolean`
  - `icon: string`
- Relationships:
  - Derived from workspace filesystem snapshot.

### EditorState

- Purpose: Current article/query viewer and navigation history.
- Fields:
  - `openDocuments: OpenDocument[]`
  - `activeDocumentId: string | null`
  - `history: HistoryEntry[]`
  - `historyIndex: number`
  - `focusedLinkIndex: number`
- Relationships:
  - Active document points to one `OpenDocument`.
  - History entries reference workspace paths or transient query documents.
- Validation rules:
  - `historyIndex` must be within `history` bounds when history is non-empty.
  - `focusedLinkIndex` must be `-1` or a valid index in the active document's links.

### OpenDocument

- Purpose: Renderable article, query output, or transient streamed response shown in the editor.
- Fields:
  - `id: string`
  - `path: string | null`
  - `title: string`
  - `sourceKind: "wiki" | "raw" | "query" | "transient"`
  - `rawMarkdown: string`
  - `renderedAnsi: string`
  - `viewportOffset: number`
  - `links: LinkPosition[]`
  - `headers: DocumentHeader[]`
  - `isDirty: boolean`
- Relationships:
  - Link positions drive keyboard and mouse wikilink navigation.
- Validation rules:
  - `path` is null only for transient unsaved query responses.

### LinkPosition

- Purpose: Tracks interactive wikilink hitboxes within a rendered document.
- Fields:
  - `target: string`
  - `label: string`
  - `row: number`
  - `colStart: number`
  - `colEnd: number`
- Relationships:
  - Belongs to an `OpenDocument`.
- Validation rules:
  - `colStart < colEnd`
  - Coordinates must be relative to the rendered viewport content.

### HistoryEntry

- Purpose: Supports back/forward navigation.
- Fields:
  - `documentId: string`
  - `path: string | null`
  - `scrollOffset: number`
  - `focusedLinkIndex: number`
- Relationships:
  - References an `OpenDocument` by id when available.

### SearchState

- Purpose: Sidebar search UI and BM25/LLM query input state.
- Fields:
  - `query: string`
  - `results: SearchResultItem[]`
  - `selectedIndex: number`
  - `isLoading: boolean`
  - `mode: "keyword" | "question"`
- Relationships:
  - Keyword results open documents.
  - Question submissions create `QuerySession` operations.

### SearchResultItem

- Purpose: Renderable BM25 result row.
- Fields:
  - `path: string`
  - `title: string`
  - `snippet: string`
  - `score: number`

### IngestState

- Purpose: Sidebar ingest workflow state.
- Fields:
  - `draftSource: string`
  - `items: IngestQueueItem[]`
  - `selectedIndex: number`
  - `isBusy: boolean`
  - `showFilePicker: boolean`
- Relationships:
  - Queue items derive from manifest entries and recent ingest outcomes.

### IngestQueueItem

- Purpose: Display source ingestion status.
- Fields:
  - `path: string`
  - `title: string`
  - `type: string`
  - `status: "pending" | "compiled" | "skipped" | "error"`
  - `detail: string | null`

### BottomPanelState

- Purpose: Multi-tab area for output, problems, and progress.
- Fields:
  - `isVisible: boolean`
  - `height: number`
  - `activeTab: PanelTab`
  - `output: OutputStreamState`
  - `problems: ProblemsState`
  - `progress: ProgressState`
- Validation rules:
  - Height stays within configured min/max bounds.

### OutputStreamState

- Purpose: Scrollable logs or streaming LLM output metadata.
- Fields:
  - `content: string`
  - `viewportOffset: number`
  - `status: "idle" | "running" | "success" | "error"`

### ProblemsState

- Purpose: Lint issue display and navigation.
- Fields:
  - `items: ProblemItem[]`
  - `selectedIndex: number`
  - `lastUpdatedAt: string | null`

### ProblemItem

- Purpose: Renderable lint issue entry.
- Fields:
  - `type: "broken_link" | "orphan" | "stale" | "frontmatter"`
  - `severity: "error" | "warning"`
  - `file: string`
  - `message: string`
  - `linkTarget: string | null`

### ProgressState

- Purpose: Progress UI for compile and other long-running operations.
- Fields:
  - `current: number`
  - `total: number`
  - `message: string`
  - `percent: number`

### StatusBarState

- Purpose: Always-visible summary of workspace and background activity.
- Fields:
  - `workspaceName: string`
  - `llmProvider: "anthropic" | "openai" | null`
  - `articleCount: number`
  - `spinnerActive: boolean`
  - `activityMessage: string`
  - `errorCount: number`
  - `warningCount: number`

### CommandPaletteState

- Purpose: Overlay for quick open and command execution.
- Fields:
  - `isOpen: boolean`
  - `mode: "files" | "commands"`
  - `query: string`
  - `results: PaletteItem[]`
  - `selectedIndex: number`

### PaletteItem

- Purpose: Selectable command or file row in the overlay.
- Fields:
  - `id: string`
  - `label: string`
  - `detail: string`
  - `kind: "file" | "command"`
  - `path: string | null`
  - `commandId: string | null`

### OperationState

- Purpose: Tracks background execution lifecycle.
- Fields:
  - `activeOperation: "none" | "search" | "query" | "ingest" | "compile" | "lint" | "status"`
  - `isBusy: boolean`
  - `streamBuffer: string`
  - `lastError: string | null`

### TerminalCapabilities

- Purpose: Runtime feature detection for richer UX.
- Fields:
  - `isTTY: boolean`
  - `supportsMouse: boolean`
  - `supportsImages: boolean`
  - `supportsNerdFont: boolean`

## Relationships Summary

- `StudioAppState` aggregates all runtime entities.
- `WorkspaceSnapshot` feeds `ExplorerState`, `StatusBarState`, `SearchState`, and `IngestState`.
- `EditorState.activeDocumentId` resolves to one `OpenDocument`.
- `OpenDocument.links` are `LinkPosition` entries used by editor focus and click handling.
- `BottomPanelState.problems.items` derive from lint results.
- `CommandPaletteState.results` are derived from workspace files or registered studio commands.

## State Transitions

### Application Launch

1. Resolve workspace.
2. Validate terminal size and capabilities.
3. Build `WorkspaceSnapshot`.
4. Initialize `StudioAppState` with explorer visible and either welcome or last-opened content.

### Open File

1. User selects explorer item, search result, palette file, or wikilink.
2. Load markdown/text from filesystem.
3. Render to ANSI and compute `LinkPosition[]`.
4. Add or activate `OpenDocument`.
5. Push `HistoryEntry` with scroll/link context.

### Run Keyword Search

1. Update `SearchState.query`.
2. Debounce 150ms.
3. Call BM25 service.
4. Replace `SearchState.results`.

### Run LLM Query

1. Capture question from search input.
2. Set `OperationState.activeOperation = "query"` and open bottom panel.
3. Create transient `OpenDocument`.
4. Stream response chunks into document content/output panel.
5. On completion, allow save to `queries/`.

### Run Compile

1. Start compile operation from command palette.
2. Show progress/output tabs.
3. Stream progress into `ProgressState` and output text.
4. Refresh `WorkspaceSnapshot`, explorer, and status counts when done.

### Run Ingest

1. Submit URL/path or file picker result.
2. Execute ingest service.
3. Append/update `IngestQueueItem` state.
4. Refresh workspace snapshot on success.

### Run Lint

1. Execute lint service.
2. Populate `ProblemsState.items` with severity mapping.
3. Update status bar warning/error counts.

## Validation Rules Derived From Requirements

- Studio must not enter normal render mode below 80x24.
- Only one overlay (`CommandPaletteState` or file picker/form flow) may be active at a time in v1.
- Background operations must surface status in both `StatusBarState` and `BottomPanelState`.
- Missing API keys block query/compile operations only; browsing/searching must remain available.
