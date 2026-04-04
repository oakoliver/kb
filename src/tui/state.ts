/**
 * Shared TUI state definitions
 * @module tui/state
 */

import type { WikiPaths } from '../core/resolver';

// =============================================================================
// Pane & Overlay Types
// =============================================================================

export type ActivePane = 'explorer' | 'editor' | 'search' | 'ingest' | 'bottomPanel';

export type OverlayKind = 'none' | 'quickOpen' | 'commandPalette';

export type BottomPanelTab = 'output' | 'problems' | 'progress';

export type SidebarView = 'explorer' | 'search' | 'ingest';

// =============================================================================
// Terminal Capabilities
// =============================================================================

export interface TerminalState {
  width: number;
  height: number;
}

// =============================================================================
// Workspace Snapshot
// =============================================================================

export interface WorkspaceSnapshot {
  root: string;
  paths: WikiPaths;
  name: string;
  sourceCount: number;
  articleCount: number;
  queryCount: number;
}

// =============================================================================
// Explorer State
// =============================================================================

export interface ExplorerItem {
  name: string;
  path: string;
  isDir: boolean;
  depth: number;
  expanded?: boolean;
  children?: ExplorerItem[];
  articleType?: string;
}

export interface ExplorerState {
  items: ExplorerItem[];
  selectedIndex: number;
  scrollOffset: number;
}

// =============================================================================
// Editor State
// =============================================================================

export interface LinkPosition {
  target: string;
  row: number;
  colStart: number;
  colEnd: number;
  displayText: string;
}

export interface OpenDocument {
  path: string;
  title: string;
  content: string;
  renderedContent: string;
  links: LinkPosition[];
  scrollY: number;
  focusedLinkIndex: number;
}

export interface HistoryEntry {
  path: string;
  scrollY: number;
}

export interface EditorState {
  document: OpenDocument | null;
  history: HistoryEntry[];
  historyIndex: number;
}

// =============================================================================
// Search State
// =============================================================================

export interface SearchResultItem {
  path: string;
  title: string;
  score: number;
  snippet: string;
}

export interface SearchState {
  query: string;
  results: SearchResultItem[];
  selectedIndex: number;
  isSearching: boolean;
}

// =============================================================================
// Bottom Panel State
// =============================================================================

export interface OutputLine {
  text: string;
  timestamp: number;
  kind: 'info' | 'error' | 'success' | 'stream';
}

export interface ProblemItem {
  path: string;
  line: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface BottomPanelState {
  visible: boolean;
  activeTab: BottomPanelTab;
  output: OutputLine[];
  problems: ProblemItem[];
  selectedProblemIndex: number;
  progressPercent: number;
  progressLabel: string;
}

// =============================================================================
// Command Palette State
// =============================================================================

export interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
}

export interface CommandPaletteState {
  query: string;
  items: PaletteItem[];
  filteredItems: PaletteItem[];
  selectedIndex: number;
}

// =============================================================================
// Ingest State
// =============================================================================

export interface IngestQueueItem {
  source: string;
  status: 'pending' | 'ingesting' | 'done' | 'error';
  error?: string;
}

export interface IngestState {
  source: string;
  queue: IngestQueueItem[];
  isIngesting: boolean;
}

// =============================================================================
// Status Bar State
// =============================================================================

export interface StatusBarState {
  workspaceName: string;
  branch: string;
  articleCount: number;
  sourceCount: number;
  activeOperation: string | null;
  provider: string;
  errorCount: number;
  warningCount: number;
}

// =============================================================================
// Root Studio State
// =============================================================================

export interface StudioState {
  // Terminal
  terminal: TerminalState;

  // Workspace
  workspace: WorkspaceSnapshot;

  // Layout
  activePane: ActivePane;
  overlay: OverlayKind;
  sidebarVisible: boolean;
  sidebarView: SidebarView;
  bottomPanel: BottomPanelState;

  // Component states
  explorer: ExplorerState;
  editor: EditorState;
  search: SearchState;
  ingest: IngestState;
  palette: CommandPaletteState;
  statusBar: StatusBarState;
}

// =============================================================================
// Initial State Factory
// =============================================================================

export function createInitialState(wikiRoot: string, paths: WikiPaths): StudioState {
  const name = wikiRoot.split('/').pop() || 'wiki';

  return {
    terminal: { width: 0, height: 0 },

    workspace: {
      root: wikiRoot,
      paths,
      name,
      sourceCount: 0,
      articleCount: 0,
      queryCount: 0,
    },

    activePane: 'explorer',
    overlay: 'none',
    sidebarVisible: true,
    sidebarView: 'explorer',
    bottomPanel: {
      visible: false,
      activeTab: 'output',
      output: [],
      problems: [],
      selectedProblemIndex: 0,
      progressPercent: 0,
      progressLabel: '',
    },

    explorer: {
      items: [],
      selectedIndex: 0,
      scrollOffset: 0,
    },

    editor: {
      document: null,
      history: [],
      historyIndex: -1,
    },

    search: {
      query: '',
      results: [],
      selectedIndex: 0,
      isSearching: false,
    },

    ingest: {
      source: '',
      queue: [],
      isIngesting: false,
    },

    palette: {
      query: '',
      items: [],
      filteredItems: [],
      selectedIndex: 0,
    },

    statusBar: {
      workspaceName: name,
      branch: '',
      articleCount: 0,
      sourceCount: 0,
      activeOperation: null,
      provider: '',
      errorCount: 0,
      warningCount: 0,
    },
  };
}
