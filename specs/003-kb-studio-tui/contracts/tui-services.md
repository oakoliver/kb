# Contract: TUI Service Adapters

## Purpose

Define the internal service boundaries between the TUI layer and existing kb domain logic.

## Service Interfaces

### `loadWorkspaceSnapshot(workspaceRoot: string): Promise<WorkspaceSnapshot>`

- Reads config, manifest, graph, article counts, queries, and explorer-visible files.
- Must not mutate workspace files.

### `openWorkspaceDocument(path: string): Promise<OpenDocumentSource>`

- Loads file content from `wiki/`, `raw/`, or `queries/`.
- Returns title, raw markdown/text, document kind, and optional metadata.

### `searchWorkspace(query: string, options: { limit: number }): Promise<SearchResultItem[]>`

- Uses existing BM25 index logic.
- Returns empty array if no matches.

### `runWorkspaceQuery(question: string, onChunk: (chunk: string) => void): Promise<{ answer: string; sources: string[] }>`

- Uses existing provider/config/pageindex/query prompt logic.
- Streams chunks through `onChunk`.
- Throws typed error when API key/provider setup is invalid.

### `saveQueryDocument(question: string, answer: string, sources: string[]): Promise<string>`

- Persists a query markdown file under `queries/`.
- Returns workspace-relative saved path.

### `ingestSource(input: string, options?: { type?: string; title?: string }): Promise<IngestQueueItem>`

- Reuses current ingest workflow.
- Persists manifest changes and new `raw/` file content.
- Returns queue/list row shape for immediate UI refresh.

### `compileWorkspace(events: { onProgress: (event: CompileProgressEvent) => void; onLog: (line: string) => void }): Promise<CompileSummary>`

- Reuses current compile logic and emits structured progress/log updates for the bottom panel.
- Refreshes workspace snapshot after success.

### `lintWorkspace(): Promise<{ errors: ProblemItem[]; warnings: ProblemItem[] }>`

- Reuses existing lint checks.
- Maps CLI lint issues to bottom-panel problem items.

### `loadStatusSummary(): Promise<StatusBarState>`

- Reuses status-derived data for workspace name, provider, article count, and health counters.

## Error Handling Contract

- Service adapters throw typed or tagged errors with user-displayable messages.
- Query and compile errors must leave the rest of the UI usable.
- Workspace mutation services must refresh the snapshot or surface the failure clearly.
