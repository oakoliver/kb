/**
 * Custom messages for KB Studio TUI
 * @module tui/messages
 */

import type { ExplorerItem, SearchResultItem, ProblemItem, OutputLine } from './state';

// =============================================================================
// Workspace Messages
// =============================================================================

export class WorkspaceLoadedMsg {
  readonly _tag = 'WorkspaceLoadedMsg' as const;
  constructor(
    public readonly sourceCount: number,
    public readonly articleCount: number,
    public readonly queryCount: number,
    public readonly provider: string,
  ) {}
}

export class ExplorerItemsMsg {
  readonly _tag = 'ExplorerItemsMsg' as const;
  constructor(public readonly items: ExplorerItem[]) {}
}

// =============================================================================
// Document Messages
// =============================================================================

export class OpenDocumentMsg {
  readonly _tag = 'OpenDocumentMsg' as const;
  constructor(public readonly path: string) {}
}

export class DocumentLoadedMsg {
  readonly _tag = 'DocumentLoadedMsg' as const;
  constructor(
    public readonly path: string,
    public readonly title: string,
    public readonly content: string,
  ) {}
}

export class DocumentErrorMsg {
  readonly _tag = 'DocumentErrorMsg' as const;
  constructor(
    public readonly path: string,
    public readonly error: string,
  ) {}
}

// =============================================================================
// Navigation Messages
// =============================================================================

export class NavigateBackMsg {
  readonly _tag = 'NavigateBackMsg' as const;
}

export class NavigateForwardMsg {
  readonly _tag = 'NavigateForwardMsg' as const;
}

export class FollowLinkMsg {
  readonly _tag = 'FollowLinkMsg' as const;
  constructor(public readonly target: string) {}
}

// =============================================================================
// Pane Messages
// =============================================================================

export class FocusPaneMsg {
  readonly _tag = 'FocusPaneMsg' as const;
  constructor(public readonly pane: 'explorer' | 'editor' | 'search' | 'ingest' | 'bottomPanel') {}
}

export class ToggleSidebarMsg {
  readonly _tag = 'ToggleSidebarMsg' as const;
}

export class ToggleBottomPanelMsg {
  readonly _tag = 'ToggleBottomPanelMsg' as const;
}

export class SetSidebarViewMsg {
  readonly _tag = 'SetSidebarViewMsg' as const;
  constructor(public readonly view: 'explorer' | 'search' | 'ingest') {}
}

// =============================================================================
// Overlay Messages
// =============================================================================

export class ShowQuickOpenMsg {
  readonly _tag = 'ShowQuickOpenMsg' as const;
}

export class ShowCommandPaletteMsg {
  readonly _tag = 'ShowCommandPaletteMsg' as const;
}

export class DismissOverlayMsg {
  readonly _tag = 'DismissOverlayMsg' as const;
}

// =============================================================================
// Search Messages
// =============================================================================

export class SearchQueryMsg {
  readonly _tag = 'SearchQueryMsg' as const;
  constructor(public readonly query: string) {}
}

export class SearchResultsMsg {
  readonly _tag = 'SearchResultsMsg' as const;
  constructor(public readonly results: SearchResultItem[]) {}
}

// =============================================================================
// Operation Messages
// =============================================================================

export class CompileStartMsg {
  readonly _tag = 'CompileStartMsg' as const;
}

export class CompileProgressMsg {
  readonly _tag = 'CompileProgressMsg' as const;
  constructor(
    public readonly percent: number,
    public readonly label: string,
  ) {}
}

export class CompileDoneMsg {
  readonly _tag = 'CompileDoneMsg' as const;
  constructor(public readonly articlesCompiled: number) {}
}

export class CompileErrorMsg {
  readonly _tag = 'CompileErrorMsg' as const;
  constructor(public readonly error: string) {}
}

export class IngestStartMsg {
  readonly _tag = 'IngestStartMsg' as const;
  constructor(public readonly source: string) {}
}

export class IngestDoneMsg {
  readonly _tag = 'IngestDoneMsg' as const;
  constructor(
    public readonly source: string,
    public readonly title: string,
  ) {}
}

export class IngestErrorMsg {
  readonly _tag = 'IngestErrorMsg' as const;
  constructor(
    public readonly source: string,
    public readonly error: string,
  ) {}
}

export class LintResultsMsg {
  readonly _tag = 'LintResultsMsg' as const;
  constructor(public readonly problems: ProblemItem[]) {}
}

export class QueryStreamMsg {
  readonly _tag = 'QueryStreamMsg' as const;
  constructor(public readonly chunk: string) {}
}

export class QueryDoneMsg {
  readonly _tag = 'QueryDoneMsg' as const;
  constructor(public readonly fullAnswer: string) {}
}

export class QueryErrorMsg {
  readonly _tag = 'QueryErrorMsg' as const;
  constructor(public readonly error: string) {}
}

// =============================================================================
// Output Messages
// =============================================================================

export class AppendOutputMsg {
  readonly _tag = 'AppendOutputMsg' as const;
  constructor(public readonly line: OutputLine) {}
}

// =============================================================================
// Status Bar Messages
// =============================================================================

export class StatusUpdateMsg {
  readonly _tag = 'StatusUpdateMsg' as const;
  constructor(public readonly updates: Record<string, unknown>) {}
}
