/**
 * Root Bubble Tea model for KB Studio
 * Handles all message routing, state transitions, and pane focus management
 * @module tui/app
 */

import {
  Program,
  WithAltScreen,
  WithMouseMode,
  MouseMode,
  WindowSizeMsg,
  KeyPressMsg,
  KeyMod,
  MouseClickMsg,
  MouseWheelMsg,
  MouseButton,
  Quit,
  Batch,
  type Model,
  type Cmd,
  type Msg,
} from '@oakoliver/bubbletea';

import type { StudioState, ActivePane, OverlayKind } from './state';
import { createInitialState } from './state';
import type { WikiPaths } from '../core/resolver';
import {
  loadWorkspaceSnapshot,
  buildExplorerItems,
  collectArticlePaths,
  buildStatusBarState,
} from './operations/workspace';
import { loadDocument } from './document';
import { buildLinkTargetMap } from './link-map';
import {
  moveSelectionUp,
  moveSelectionDown,
  toggleExpand,
  getSelectedItem,
  getVisibleItems,
} from './explorer';
import {
  openDocument,
  navigateBack,
  scrollDocument,
  scrollToTop,
  scrollToBottom,
  pageDown,
  pageUp,
  focusNextLink,
  focusPrevLink,
  getFocusedLink,
  resolveLink,
} from './editor';
import { calculateLayout } from './layout';
import { renderStudio } from './view';
import {
  createQuickOpenState,
  createCommandPaletteState,
  updatePaletteQuery,
  appendToPaletteQuery,
  backspacePaletteQuery,
  paletteSelectUp,
  paletteSelectDown,
  getSelectedPaletteItem,
  articlePathsToPaletteItems,
} from './palette';
import {
  updateSearchQuery,
  appendToSearchQuery,
  backspaceSearchQuery,
  clearSearch,
  setSearchResults,
  setSearching,
  searchSelectUp,
  searchSelectDown,
  getSelectedSearchResult,
} from './search';
import { searchWorkspace } from './operations/search';
import { executeQuery, saveQueryDocument, buildQueryOutputLines } from './operations/query';
import { ingestSource } from './operations/ingest';
import { compileWorkspace } from './operations/compile';
import { lintWorkspace } from './operations/lint';
import { setProgress, resetProgress } from './panels/progress';
import { setProblems, getProblemAtIndex } from './panels/problems';
import {
  appendToIngestSource,
  backspaceIngestSource,
  clearIngestSource,
  addToQueue,
  updateQueueItem,
  setIngesting,
} from './ingest';
import {
  createQueryDocument,
  appendQueryStream,
  finalizeQueryDocument,
} from './editor';
import { appendOutput, appendOutputLines, infoLine, errorLine, successLine, streamLine } from './panels/output';
import { extractWikilinks } from './link-map';
import { renderWithStyle, DarkStyleName } from '@oakoliver/glamour';
import {
  WorkspaceLoadedMsg,
  ExplorerItemsMsg,
  OpenDocumentMsg,
  DocumentLoadedMsg,
  DocumentErrorMsg,
  NavigateBackMsg,
  FollowLinkMsg,
  FocusPaneMsg,
  ToggleSidebarMsg,
  ToggleBottomPanelMsg,
  SetSidebarViewMsg,
  ShowQuickOpenMsg,
  ShowCommandPaletteMsg,
  DismissOverlayMsg,
  SearchQueryMsg,
  SearchResultsMsg,
  QueryStreamMsg,
  QueryDoneMsg,
  QueryErrorMsg,
  AppendOutputMsg,
  IngestStartMsg,
  IngestDoneMsg,
  IngestErrorMsg,
  CompileStartMsg,
  CompileProgressMsg,
  CompileDoneMsg,
  CompileErrorMsg,
  LintResultsMsg,
} from './messages';

// =============================================================================
// Link Target Map (cached per workspace load)
// =============================================================================

let linkTargetMap = new Map<string, string>();

// Debounce timer for search
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const SEARCH_DEBOUNCE_MS = 150;

// =============================================================================
// Studio App Model
// =============================================================================

export class StudioApp implements Model {
  state: StudioState;

  constructor(wikiRoot: string, paths: WikiPaths) {
    this.state = createInitialState(wikiRoot, paths);
  }

  init(): Cmd {
    // Load workspace data on init
    return () => this._loadWorkspace();
  }

  update(msg: Msg): [Model, Cmd] {
    // Handle window resize
    if (msg instanceof WindowSizeMsg) {
      this.state = {
        ...this.state,
        terminal: { width: msg.width, height: msg.height },
      };
      return [this, null];
    }

    // Handle custom messages
    if (msg instanceof WorkspaceLoadedMsg) {
      return this._handleWorkspaceLoaded(msg);
    }
    if (msg instanceof ExplorerItemsMsg) {
      return this._handleExplorerItems(msg);
    }
    if (msg instanceof DocumentLoadedMsg) {
      return this._handleDocumentLoaded(msg);
    }
    if (msg instanceof DocumentErrorMsg) {
      return [this, null]; // TODO: show error in status bar
    }
    if (msg instanceof FocusPaneMsg) {
      this.state = { ...this.state, activePane: msg.pane };
      return [this, null];
    }
    if (msg instanceof ToggleSidebarMsg) {
      this.state = { ...this.state, sidebarVisible: !this.state.sidebarVisible };
      return [this, null];
    }
    if (msg instanceof ToggleBottomPanelMsg) {
      this.state = {
        ...this.state,
        bottomPanel: { ...this.state.bottomPanel, visible: !this.state.bottomPanel.visible },
      };
      return [this, null];
    }
    if (msg instanceof SetSidebarViewMsg) {
      this.state = { ...this.state, sidebarView: msg.view };
      return [this, null];
    }
    if (msg instanceof ShowQuickOpenMsg) {
      this.state = { ...this.state, overlay: 'quickOpen' };
      return [this, null];
    }
    if (msg instanceof ShowCommandPaletteMsg) {
      this.state = { ...this.state, overlay: 'commandPalette' };
      return [this, null];
    }
    if (msg instanceof DismissOverlayMsg) {
      this.state = { ...this.state, overlay: 'none' };
      return [this, null];
    }
    if (msg instanceof NavigateBackMsg) {
      return this._handleNavigateBack();
    }
    if (msg instanceof FollowLinkMsg) {
      return this._handleFollowLink(msg.target);
    }
    if (msg instanceof SearchResultsMsg) {
      this.state = {
        ...this.state,
        search: setSearchResults(this.state.search, msg.results),
      };
      return [this, null];
    }
    if (msg instanceof QueryStreamMsg) {
      return this._handleQueryStream(msg);
    }
    if (msg instanceof QueryDoneMsg) {
      return this._handleQueryDone(msg);
    }
    if (msg instanceof QueryErrorMsg) {
      return this._handleQueryError(msg);
    }
    if (msg instanceof AppendOutputMsg) {
      this.state = {
        ...this.state,
        bottomPanel: appendOutput(this.state.bottomPanel, msg.line),
      };
      return [this, null];
    }
    if (msg instanceof IngestStartMsg) {
      return this._handleIngestStart(msg);
    }
    if (msg instanceof IngestDoneMsg) {
      return this._handleIngestDone(msg);
    }
    if (msg instanceof IngestErrorMsg) {
      return this._handleIngestError(msg);
    }
    if (msg instanceof CompileProgressMsg) {
      return this._handleCompileProgress(msg);
    }
    if (msg instanceof CompileDoneMsg) {
      return this._handleCompileDone(msg);
    }
    if (msg instanceof CompileErrorMsg) {
      return this._handleCompileError(msg);
    }
    if (msg instanceof LintResultsMsg) {
      return this._handleLintResults(msg);
    }

    // Handle keyboard
    if (msg instanceof KeyPressMsg) {
      return this._handleKeyPress(msg);
    }

    // Handle mouse click
    if (msg instanceof MouseClickMsg) {
      return this._handleMouseClick(msg);
    }

    // Handle mouse wheel
    if (msg instanceof MouseWheelMsg) {
      return this._handleMouseWheel(msg);
    }

    return [this, null];
  }

  view(): string {
    return renderStudio(this.state);
  }

  // ===========================================================================
  // Workspace Loading
  // ===========================================================================

  private async _loadWorkspace(): Promise<Msg> {
    try {
      const { root, paths } = this.state.workspace;
      const snapshot = await loadWorkspaceSnapshot(root, paths);

      // Detect provider
      let provider = '';
      try {
        const { detectProvider } = await import('../core/config');
        provider = detectProvider() ?? '';
      } catch {
        // ignore
      }

      return new WorkspaceLoadedMsg(
        snapshot.sourceCount,
        snapshot.articleCount,
        snapshot.queryCount,
        provider,
      );
    } catch {
      return new WorkspaceLoadedMsg(0, 0, 0, '');
    }
  }

  private _handleWorkspaceLoaded(msg: WorkspaceLoadedMsg): [Model, Cmd] {
    this.state = {
      ...this.state,
      workspace: {
        ...this.state.workspace,
        sourceCount: msg.sourceCount,
        articleCount: msg.articleCount,
        queryCount: msg.queryCount,
      },
      statusBar: {
        ...this.state.statusBar,
        sourceCount: msg.sourceCount,
        articleCount: msg.articleCount,
        provider: msg.provider,
      },
    };

    // Load explorer items
    return [this, () => this._loadExplorerItems()];
  }

  private async _loadExplorerItems(): Promise<Msg> {
    try {
      const items = await buildExplorerItems(this.state.workspace.paths.wiki);

      // Also build link target map
      const articlePaths = await collectArticlePaths(this.state.workspace.paths.wiki);
      linkTargetMap = buildLinkTargetMap(articlePaths);

      return new ExplorerItemsMsg(items);
    } catch {
      return new ExplorerItemsMsg([]);
    }
  }

  private _handleExplorerItems(msg: ExplorerItemsMsg): [Model, Cmd] {
    this.state = {
      ...this.state,
      explorer: {
        ...this.state.explorer,
        items: msg.items,
        selectedIndex: 0,
        scrollOffset: 0,
      },
    };
    return [this, null];
  }

  // ===========================================================================
  // Document Loading
  // ===========================================================================

  private _handleDocumentLoaded(msg: DocumentLoadedMsg): [Model, Cmd] {
    // This is now handled via _openDocumentAsync
    return [this, null];
  }

  private _openDocumentCmd(path: string): Cmd {
    return async (): Promise<Msg> => {
      try {
        const doc = await loadDocument(path);
        return new DocumentLoadedMsg(doc.path, doc.title, '__OPEN_DOC__');
      } catch (e) {
        return new DocumentErrorMsg(path, String(e));
      }
    };
  }

  private async _openDocumentAsync(path: string): Promise<void> {
    const newEditor = await openDocument(this.state.editor, path);
    this.state = {
      ...this.state,
      editor: newEditor,
      activePane: 'editor',
    };
  }

  // ===========================================================================
  // Navigation
  // ===========================================================================

  private _handleNavigateBack(): [Model, Cmd] {
    return [this, async (): Promise<Msg> => {
      const newEditor = await navigateBack(this.state.editor);
      this.state = { ...this.state, editor: newEditor };
      return new DismissOverlayMsg(); // just a no-op message to trigger re-render
    }];
  }

  private _handleFollowLink(target: string): [Model, Cmd] {
    const wikiDir = this.state.workspace.paths.wiki;
    const resolved = resolveLink(target, wikiDir);

    if (!resolved) {
      // Check link target map
      const fromMap = linkTargetMap.get(target);
      if (!fromMap) return [this, null];
      return [this, async (): Promise<Msg> => {
        await this._openDocumentAsync(fromMap);
        return new DismissOverlayMsg();
      }];
    }

    return [this, async (): Promise<Msg> => {
      await this._openDocumentAsync(resolved);
      return new DismissOverlayMsg();
    }];
  }

  // ===========================================================================
  // Keyboard Handling
  // ===========================================================================

  private _handleKeyPress(msg: KeyPressMsg): [Model, Cmd] {
    const key = msg.toString();

    // Global shortcuts (always active)
    if (key === 'ctrl+q') return [this, Quit];
    if (key === 'ctrl+b') {
      this.state = { ...this.state, sidebarVisible: !this.state.sidebarVisible };
      return [this, null];
    }
    if (key === 'ctrl+j') {
      this.state = {
        ...this.state,
        bottomPanel: { ...this.state.bottomPanel, visible: !this.state.bottomPanel.visible },
      };
      return [this, null];
    }
    if (key === 'ctrl+p') {
      // Quick Open: populate with article file items
      const articleItems = articlePathsToPaletteItems(
        Array.from(linkTargetMap.values()),
        this.state.workspace.paths.wiki,
      );
      this.state = {
        ...this.state,
        overlay: 'quickOpen',
        palette: createQuickOpenState(articleItems),
      };
      return [this, null];
    }
    // Ctrl+Shift+P -- bubbletea encodes it as ctrl+shift+p
    if (key === 'ctrl+shift+p') {
      this.state = {
        ...this.state,
        overlay: 'commandPalette',
        palette: createCommandPaletteState(),
      };
      return [this, null];
    }
    // Ctrl+Shift+E - focus explorer
    if (key === 'ctrl+shift+e') {
      this.state = {
        ...this.state,
        activePane: 'explorer',
        sidebarVisible: true,
        sidebarView: 'explorer',
      };
      return [this, null];
    }
    // Ctrl+Shift+F - focus search
    if (key === 'ctrl+shift+f') {
      this.state = {
        ...this.state,
        activePane: 'search',
        sidebarVisible: true,
        sidebarView: 'search',
      };
      return [this, null];
    }
    // Ctrl+Shift+I - focus ingest
    if (key === 'ctrl+shift+i') {
      this.state = {
        ...this.state,
        activePane: 'ingest',
        sidebarVisible: true,
        sidebarView: 'ingest',
      };
      return [this, null];
    }

    // Overlay input handling
    if (this.state.overlay !== 'none') {
      if (key === 'esc' || key === 'escape') {
        this.state = { ...this.state, overlay: 'none' };
        return [this, null];
      }
      return this._handlePaletteKey(key, msg);
    }

    // Pane-specific handling
    switch (this.state.activePane) {
      case 'explorer':
        return this._handleExplorerKey(key);
      case 'editor':
        return this._handleEditorKey(key, msg);
      case 'search':
        return this._handleSearchKey(key, msg);
      case 'ingest':
        return this._handleIngestKey(key, msg);
      case 'bottomPanel':
        return this._handleBottomPanelKey(key);
      default:
        return [this, null];
    }
  }

  // ===========================================================================
  // Palette Key Handling
  // ===========================================================================

  private _handlePaletteKey(key: string, msg: KeyPressMsg): [Model, Cmd] {
    switch (key) {
      case 'up':
        this.state = {
          ...this.state,
          palette: paletteSelectUp(this.state.palette),
        };
        return [this, null];

      case 'down':
        this.state = {
          ...this.state,
          palette: paletteSelectDown(this.state.palette),
        };
        return [this, null];

      case 'enter': {
        const selected = getSelectedPaletteItem(this.state.palette);
        if (!selected) {
          this.state = { ...this.state, overlay: 'none' };
          return [this, null];
        }

        // Dismiss overlay
        this.state = { ...this.state, overlay: 'none' };

        if (this.state.overlay === 'none') {
          // Quick open: selected.id is a file path
          if (selected.id.endsWith('.md')) {
            return [this, async (): Promise<Msg> => {
              await this._openDocumentAsync(selected.id);
              return new DismissOverlayMsg();
            }];
          }

          // Command palette: execute command
          return this._executeCommand(selected.id);
        }
        return [this, null];
      }

      case 'backspace': {
        this.state = {
          ...this.state,
          palette: backspacePaletteQuery(this.state.palette),
        };
        return [this, null];
      }

      default: {
        // Type character into query
        if (msg.text && msg.text.length === 1 && !key.startsWith('ctrl+') && !key.startsWith('alt+')) {
          this.state = {
            ...this.state,
            palette: appendToPaletteQuery(this.state.palette, msg.text),
          };
          return [this, null];
        }
        return [this, null];
      }
    }
  }

  // ===========================================================================
  // Command Execution
  // ===========================================================================

  private _executeCommand(commandId: string): [Model, Cmd] {
    switch (commandId) {
      case 'kb.quit':
        return [this, Quit];

      case 'kb.toggleSidebar':
        this.state = { ...this.state, sidebarVisible: !this.state.sidebarVisible };
        return [this, null];

      case 'kb.toggleBottomPanel':
        this.state = {
          ...this.state,
          bottomPanel: { ...this.state.bottomPanel, visible: !this.state.bottomPanel.visible },
        };
        return [this, null];

      case 'kb.focusExplorer':
        this.state = {
          ...this.state,
          activePane: 'explorer',
          sidebarVisible: true,
          sidebarView: 'explorer',
        };
        return [this, null];

      case 'kb.focusSearch':
        this.state = {
          ...this.state,
          activePane: 'search',
          sidebarVisible: true,
          sidebarView: 'search',
        };
        return [this, null];

      case 'kb.focusIngest':
        this.state = {
          ...this.state,
          activePane: 'ingest',
          sidebarVisible: true,
          sidebarView: 'ingest',
        };
        return [this, null];

      case 'kb.compile':
        return this._startCompile();

      case 'kb.lint':
        return this._startLint();

      case 'kb.status':
      case 'kb.promote':
        // These will be wired in later phases
        return [this, null];

      case 'kb.query.save': {
        // Save current query document
        const doc = this.state.editor.document;
        if (!doc || doc.path !== '__query__') return [this, null];

        this.state = {
          ...this.state,
          statusBar: { ...this.state.statusBar, activeOperation: 'Saving query...' },
        };

        return [this, async (): Promise<Msg> => {
          try {
            const result = await saveQueryDocument({
              question: doc.title.replace(/^Query: /, ''),
              answer: doc.content,
              sources: [],
              queriesDir: this.state.workspace.paths.queries,
            });

            return new AppendOutputMsg(successLine(`Query saved to: ${result.relativePath}`));
          } catch (err) {
            return new AppendOutputMsg(errorLine(`Save failed: ${err}`));
          }
        }];
      }

      default:
        return [this, null];
    }
  }

  // ===========================================================================
  // Explorer Key Handling
  // ===========================================================================

  private _handleExplorerKey(key: string): [Model, Cmd] {
    switch (key) {
      case 'up':
      case 'k':
        this.state = {
          ...this.state,
          explorer: moveSelectionUp(this.state.explorer),
        };
        return [this, null];

      case 'down':
      case 'j':
        this.state = {
          ...this.state,
          explorer: moveSelectionDown(this.state.explorer),
        };
        return [this, null];

      case 'enter': {
        const selected = getSelectedItem(this.state.explorer);
        if (!selected) return [this, null];

        if (selected.isDir) {
          this.state = {
            ...this.state,
            explorer: toggleExpand(this.state.explorer),
          };
          return [this, null];
        }

        // Open file
        return [this, async (): Promise<Msg> => {
          await this._openDocumentAsync(selected.path);
          return new DismissOverlayMsg();
        }];
      }

      case ' ': {
        // Space toggles expand on dirs
        const selected = getSelectedItem(this.state.explorer);
        if (selected?.isDir) {
          this.state = {
            ...this.state,
            explorer: toggleExpand(this.state.explorer),
          };
        }
        return [this, null];
      }

      case 'l':
      case 'right':
        // Move to editor pane
        this.state = { ...this.state, activePane: 'editor' };
        return [this, null];

      case 'escape':
      case 'esc':
        this.state = { ...this.state, activePane: 'editor' };
        return [this, null];

      default:
        return [this, null];
    }
  }

  // ===========================================================================
  // Editor Key Handling
  // ===========================================================================

  private _handleEditorKey(key: string, msg: KeyPressMsg): [Model, Cmd] {
    if (!this.state.editor.document) return [this, null];

    // Ctrl+S to save query document
    if (key === 'ctrl+s') {
      return this._executeCommand('kb.query.save');
    }

    const layout = calculateLayout(
      this.state.terminal.width,
      this.state.terminal.height,
      this.state.sidebarVisible,
      this.state.bottomPanel.visible,
    );
    const viewportHeight = layout.editor.height - 4; // borders + title

    switch (key) {
      case 'up':
      case 'k': {
        const doc = scrollDocument(this.state.editor.document, -1, viewportHeight);
        this.state = {
          ...this.state,
          editor: { ...this.state.editor, document: doc },
        };
        return [this, null];
      }

      case 'down':
      case 'j': {
        const doc = scrollDocument(this.state.editor.document, 1, viewportHeight);
        this.state = {
          ...this.state,
          editor: { ...this.state.editor, document: doc },
        };
        return [this, null];
      }

      case 'pagedown':
      case 'ctrl+d': {
        const doc = pageDown(this.state.editor.document, viewportHeight);
        this.state = {
          ...this.state,
          editor: { ...this.state.editor, document: doc },
        };
        return [this, null];
      }

      case 'pageup':
      case 'ctrl+u': {
        const doc = pageUp(this.state.editor.document, viewportHeight);
        this.state = {
          ...this.state,
          editor: { ...this.state.editor, document: doc },
        };
        return [this, null];
      }

      case 'home':
      case 'g': {
        const doc = scrollToTop(this.state.editor.document);
        this.state = {
          ...this.state,
          editor: { ...this.state.editor, document: doc },
        };
        return [this, null];
      }

      case 'end': {
        const doc = scrollToBottom(this.state.editor.document, viewportHeight);
        this.state = {
          ...this.state,
          editor: { ...this.state.editor, document: doc },
        };
        return [this, null];
      }

      case 'tab': {
        const doc = focusNextLink(this.state.editor.document);
        this.state = {
          ...this.state,
          editor: { ...this.state.editor, document: doc },
        };
        return [this, null];
      }

      case 'shift+tab': {
        const doc = focusPrevLink(this.state.editor.document);
        this.state = {
          ...this.state,
          editor: { ...this.state.editor, document: doc },
        };
        return [this, null];
      }

      case 'enter': {
        const link = getFocusedLink(this.state.editor.document);
        if (link) {
          return this._handleFollowLink(link.target);
        }
        return [this, null];
      }

      case 'alt+left':
      case 'backspace':
        return this._handleNavigateBack();

      case 'h':
      case 'left':
        // Move to explorer pane
        if (this.state.sidebarVisible) {
          this.state = { ...this.state, activePane: 'explorer' };
        }
        return [this, null];

      default:
        return [this, null];
    }
  }

  // ===========================================================================
  // Search Key Handling
  // ===========================================================================

  private _handleSearchKey(key: string, msg: KeyPressMsg): [Model, Cmd] {
    switch (key) {
      case 'up':
      case 'k': {
        this.state = {
          ...this.state,
          search: searchSelectUp(this.state.search),
        };
        return [this, null];
      }

      case 'down':
      case 'j': {
        this.state = {
          ...this.state,
          search: searchSelectDown(this.state.search),
        };
        return [this, null];
      }

      case 'enter': {
        const selected = getSelectedSearchResult(this.state.search);
        if (!selected) return [this, null];

        // Resolve path: results have paths like "wiki/concepts/foo.md"
        const { join } = require('path');
        const fullPath = join(this.state.workspace.root, selected.path);
        return [this, async (): Promise<Msg> => {
          await this._openDocumentAsync(fullPath);
          return new DismissOverlayMsg();
        }];
      }

      case 'escape':
      case 'esc': {
        // If there's a query, clear it; otherwise switch to editor
        if (this.state.search.query) {
          this.state = {
            ...this.state,
            search: clearSearch(this.state.search),
          };
          return [this, null];
        }
        this.state = { ...this.state, activePane: 'editor' };
        return [this, null];
      }

      case 'ctrl+enter': {
        // Submit query to LLM
        const query = this.state.search.query.trim();
        if (!query) return [this, null];
        return this._submitQuery(query);
      }

      case 'backspace': {
        this.state = {
          ...this.state,
          search: backspaceSearchQuery(this.state.search),
        };
        return this._triggerDebouncedSearch();
      }

      case 'tab': {
        // Move to editor pane
        this.state = { ...this.state, activePane: 'editor' };
        return [this, null];
      }

      default: {
        // Type character into search query
        if (msg.text && msg.text.length === 1 && !key.startsWith('ctrl+') && !key.startsWith('alt+')) {
          this.state = {
            ...this.state,
            search: appendToSearchQuery(this.state.search, msg.text),
          };
          return this._triggerDebouncedSearch();
        }
        return [this, null];
      }
    }
  }

  // ===========================================================================
  // Debounced Search
  // ===========================================================================

  private _triggerDebouncedSearch(): [Model, Cmd] {
    const query = this.state.search.query;

    if (!query.trim()) {
      // Clear results immediately for empty query
      this.state = {
        ...this.state,
        search: {
          ...this.state.search,
          results: [],
          selectedIndex: 0,
          isSearching: false,
        },
      };
      return [this, null];
    }

    // Mark as searching
    this.state = {
      ...this.state,
      search: setSearching(this.state.search),
    };

    // Return a debounced search command
    const wikiDir = this.state.workspace.paths.wiki;
    return [this, (): Promise<Msg> => {
      return new Promise((resolve) => {
        if (searchDebounceTimer) {
          clearTimeout(searchDebounceTimer);
        }
        searchDebounceTimer = setTimeout(async () => {
          try {
            const results = await searchWorkspace(wikiDir, query);
            resolve(new SearchResultsMsg(results));
          } catch {
            resolve(new SearchResultsMsg([]));
          }
        }, SEARCH_DEBOUNCE_MS);
      });
    }];
  }

  // ===========================================================================
  // Query Submission & Streaming
  // ===========================================================================

  private _submitQuery(question: string): [Model, Cmd] {
    // Create a transient query document in the editor
    this.state = {
      ...this.state,
      editor: createQueryDocument(this.state.editor, question),
      activePane: 'editor',
      bottomPanel: {
        ...this.state.bottomPanel,
        visible: true,
        activeTab: 'output',
        output: [
          ...this.state.bottomPanel.output,
          infoLine(`Querying: ${question}`),
        ],
      },
      statusBar: {
        ...this.state.statusBar,
        activeOperation: 'Querying...',
      },
    };

    // Launch async query
    const ctx = {
      wikiRoot: this.state.workspace.root,
      paths: this.state.workspace.paths,
    };

    return [this, (): Promise<Msg> => {
      return new Promise((resolve) => {
        executeQuery(ctx, question, {
          onChunk: (text) => {
            // We can't send individual messages from within a command's callback
            // So we accumulate in the document via the final result
          },
          onComplete: (fullAnswer) => {
            resolve(new QueryDoneMsg(fullAnswer));
          },
          onError: (error) => {
            resolve(new QueryErrorMsg(error));
          },
          onSources: (sources) => {
            // Sources will be captured when query is done
          },
        }).catch((err) => {
          resolve(new QueryErrorMsg(String(err)));
        });
      });
    }];
  }

  private _handleQueryStream(msg: QueryStreamMsg): [Model, Cmd] {
    if (!this.state.editor.document) return [this, null];

    this.state = {
      ...this.state,
      editor: {
        ...this.state.editor,
        document: appendQueryStream(this.state.editor.document, msg.chunk),
      },
    };
    return [this, null];
  }

  private _handleQueryDone(msg: QueryDoneMsg): [Model, Cmd] {
    if (!this.state.editor.document) return [this, null];

    // Update document with full content
    const doc = {
      ...this.state.editor.document,
      content: msg.fullAnswer,
      renderedContent: msg.fullAnswer,
    };

    // Finalize: render with glamour and extract links
    const finalized = finalizeQueryDocument(
      doc,
      (content) => {
        try {
          return renderWithStyle(content, DarkStyleName);
        } catch {
          return content;
        }
      },
      (content) => extractWikilinks(content),
    );

    this.state = {
      ...this.state,
      editor: {
        ...this.state.editor,
        document: finalized,
      },
      bottomPanel: appendOutput(this.state.bottomPanel, successLine('Query complete')),
      statusBar: {
        ...this.state.statusBar,
        activeOperation: null,
      },
    };
    return [this, null];
  }

  private _handleQueryError(msg: QueryErrorMsg): [Model, Cmd] {
    this.state = {
      ...this.state,
      bottomPanel: appendOutput(this.state.bottomPanel, errorLine(`Query error: ${msg.error}`)),
      statusBar: {
        ...this.state.statusBar,
        activeOperation: null,
      },
    };
    return [this, null];
  }

  // ===========================================================================
  // Compile Operations
  // ===========================================================================

  private _startCompile(): [Model, Cmd] {
    this.state = {
      ...this.state,
      bottomPanel: {
        ...this.state.bottomPanel,
        visible: true,
        activeTab: 'progress',
        output: [
          ...this.state.bottomPanel.output,
          infoLine('Starting compilation...'),
        ],
      },
      statusBar: {
        ...this.state.statusBar,
        activeOperation: 'Compiling...',
      },
    };

    const ctx = {
      wikiRoot: this.state.workspace.root,
      paths: this.state.workspace.paths,
    };

    return [this, (): Promise<Msg> => {
      return new Promise((resolve) => {
        compileWorkspace(ctx, {
          onProgress: (percent, label) => {
            // Progress updates will be batched through CompileProgressMsg
            // but since we can only resolve once, we update inline
            this.state = {
              ...this.state,
              bottomPanel: setProgress(this.state.bottomPanel, percent, label),
            };
          },
          onLog: (line) => {
            this.state = {
              ...this.state,
              bottomPanel: appendOutput(this.state.bottomPanel, line),
            };
          },
          onComplete: (articlesCompiled) => {
            resolve(new CompileDoneMsg(articlesCompiled));
          },
          onError: (error) => {
            resolve(new CompileErrorMsg(error));
          },
        }).catch((err) => {
          resolve(new CompileErrorMsg(String(err)));
        });
      });
    }];
  }

  private _handleCompileProgress(msg: CompileProgressMsg): [Model, Cmd] {
    this.state = {
      ...this.state,
      bottomPanel: setProgress(this.state.bottomPanel, msg.percent, msg.label),
    };
    return [this, null];
  }

  private _handleCompileDone(msg: CompileDoneMsg): [Model, Cmd] {
    this.state = {
      ...this.state,
      bottomPanel: {
        ...resetProgress(this.state.bottomPanel),
        activeTab: 'output',
      },
      statusBar: {
        ...this.state.statusBar,
        activeOperation: null,
      },
    };

    // Refresh workspace to pick up new/updated articles
    return [this, () => this._refreshWorkspaceAfterIngest()];
  }

  private _handleCompileError(msg: CompileErrorMsg): [Model, Cmd] {
    this.state = {
      ...this.state,
      bottomPanel: {
        ...resetProgress(this.state.bottomPanel),
        output: [
          ...this.state.bottomPanel.output,
          errorLine(`Compile error: ${msg.error}`),
        ],
        activeTab: 'output',
      },
      statusBar: {
        ...this.state.statusBar,
        activeOperation: null,
      },
    };
    return [this, null];
  }

  // ===========================================================================
  // Lint Operations
  // ===========================================================================

  private _startLint(): [Model, Cmd] {
    this.state = {
      ...this.state,
      bottomPanel: {
        ...this.state.bottomPanel,
        visible: true,
        activeTab: 'problems',
        output: [
          ...this.state.bottomPanel.output,
          infoLine('Running lint checks...'),
        ],
      },
      statusBar: {
        ...this.state.statusBar,
        activeOperation: 'Linting...',
      },
    };

    const ctx = {
      wikiRoot: this.state.workspace.root,
      paths: this.state.workspace.paths,
    };

    return [this, async (): Promise<Msg> => {
      try {
        const problems = await lintWorkspace(ctx);
        return new LintResultsMsg(problems);
      } catch (err) {
        return new LintResultsMsg([{
          path: '',
          line: 0,
          message: `Lint failed: ${(err as Error).message}`,
          severity: 'error',
        }]);
      }
    }];
  }

  private _handleLintResults(msg: LintResultsMsg): [Model, Cmd] {
    const errors = msg.problems.filter((p) => p.severity === 'error').length;
    const warnings = msg.problems.filter((p) => p.severity === 'warning').length;

    let summaryLine: string;
    if (errors === 0 && warnings === 0) {
      summaryLine = 'Lint complete: no issues found';
    } else {
      const parts: string[] = [];
      if (errors > 0) parts.push(`${errors} error${errors !== 1 ? 's' : ''}`);
      if (warnings > 0) parts.push(`${warnings} warning${warnings !== 1 ? 's' : ''}`);
      summaryLine = `Lint complete: ${parts.join(', ')}`;
    }

    this.state = {
      ...this.state,
      bottomPanel: {
        ...setProblems(this.state.bottomPanel, msg.problems),
        selectedProblemIndex: 0,
        output: [
          ...this.state.bottomPanel.output,
          errors > 0 ? errorLine(summaryLine) : successLine(summaryLine),
        ],
        activeTab: 'problems',
      },
      statusBar: {
        ...this.state.statusBar,
        activeOperation: null,
        errorCount: errors,
        warningCount: warnings,
      },
    };
    return [this, null];
  }

  // ===========================================================================
  // Ingest Key Handling
  // ===========================================================================

  private _handleIngestKey(key: string, msg: KeyPressMsg): [Model, Cmd] {
    switch (key) {
      case 'enter': {
        // Submit source for ingestion
        const source = this.state.ingest.source.trim();
        if (!source) return [this, null];

        // Add to queue and start ingesting
        this.state = {
          ...this.state,
          ingest: addToQueue(this.state.ingest, source),
          bottomPanel: {
            ...this.state.bottomPanel,
            visible: true,
            activeTab: 'output',
            output: [
              ...this.state.bottomPanel.output,
              infoLine(`Ingesting: ${source}`),
            ],
          },
          statusBar: {
            ...this.state.statusBar,
            activeOperation: 'Ingesting...',
          },
        };

        return this._startIngest(source);
      }

      case 'escape':
      case 'esc': {
        // If there's input, clear it; otherwise switch to editor
        if (this.state.ingest.source) {
          this.state = {
            ...this.state,
            ingest: clearIngestSource(this.state.ingest),
          };
          return [this, null];
        }
        this.state = { ...this.state, activePane: 'editor' };
        return [this, null];
      }

      case 'backspace': {
        this.state = {
          ...this.state,
          ingest: backspaceIngestSource(this.state.ingest),
        };
        return [this, null];
      }

      case 'tab': {
        // Move to editor pane
        this.state = { ...this.state, activePane: 'editor' };
        return [this, null];
      }

      default: {
        // Type character into source input
        if (msg.text && msg.text.length === 1 && !key.startsWith('ctrl+') && !key.startsWith('alt+')) {
          this.state = {
            ...this.state,
            ingest: appendToIngestSource(this.state.ingest, msg.text),
          };
          return [this, null];
        }
        return [this, null];
      }
    }
  }

  // ===========================================================================
  // Ingest Operations
  // ===========================================================================

  private _startIngest(source: string): [Model, Cmd] {
    const ctx = {
      wikiRoot: this.state.workspace.root,
      paths: this.state.workspace.paths,
    };

    return [this, (): Promise<Msg> => {
      return new Promise((resolve) => {
        ingestSource(ctx, source, {
          onStart: (s) => {
            // Already handled in _handleIngestKey
          },
          onDone: (s, title) => {
            resolve(new IngestDoneMsg(s, title));
          },
          onError: (s, error) => {
            resolve(new IngestErrorMsg(s, error));
          },
        }).catch((err) => {
          resolve(new IngestErrorMsg(source, String(err)));
        });
      });
    }];
  }

  private _handleIngestStart(msg: IngestStartMsg): [Model, Cmd] {
    this.state = {
      ...this.state,
      ingest: updateQueueItem(this.state.ingest, msg.source, 'ingesting'),
    };
    return [this, null];
  }

  private _handleIngestDone(msg: IngestDoneMsg): [Model, Cmd] {
    this.state = {
      ...this.state,
      ingest: {
        ...updateQueueItem(this.state.ingest, msg.source, 'done'),
        isIngesting: false,
      },
      bottomPanel: appendOutput(
        this.state.bottomPanel,
        successLine(`Ingested: ${msg.title}`),
      ),
      statusBar: {
        ...this.state.statusBar,
        activeOperation: null,
      },
    };

    // Refresh workspace snapshot and explorer
    return [this, () => this._refreshWorkspaceAfterIngest()];
  }

  private _handleIngestError(msg: IngestErrorMsg): [Model, Cmd] {
    this.state = {
      ...this.state,
      ingest: {
        ...updateQueueItem(this.state.ingest, msg.source, 'error', msg.error),
        isIngesting: false,
      },
      bottomPanel: appendOutput(
        this.state.bottomPanel,
        errorLine(`Ingest failed: ${msg.source} - ${msg.error}`),
      ),
      statusBar: {
        ...this.state.statusBar,
        activeOperation: null,
      },
    };
    return [this, null];
  }

  private async _refreshWorkspaceAfterIngest(): Promise<Msg> {
    try {
      const { root, paths } = this.state.workspace;
      const snapshot = await loadWorkspaceSnapshot(root, paths);
      const items = await buildExplorerItems(paths.wiki);
      const articlePaths = await collectArticlePaths(paths.wiki);
      linkTargetMap = buildLinkTargetMap(articlePaths);

      // Update state inline since we return a message to trigger re-render
      this.state = {
        ...this.state,
        workspace: {
          ...this.state.workspace,
          sourceCount: snapshot.sourceCount,
          articleCount: snapshot.articleCount,
          queryCount: snapshot.queryCount,
        },
        explorer: {
          ...this.state.explorer,
          items,
        },
        statusBar: {
          ...this.state.statusBar,
          sourceCount: snapshot.sourceCount,
          articleCount: snapshot.articleCount,
        },
      };

      return new DismissOverlayMsg(); // no-op re-render trigger
    } catch {
      return new DismissOverlayMsg();
    }
  }

  // ===========================================================================
  // Bottom Panel Key Handling
  // ===========================================================================

  private _handleBottomPanelKey(key: string): [Model, Cmd] {
    switch (key) {
      case 'up':
      case 'k': {
        const newIndex = Math.max(0, this.state.bottomPanel.selectedProblemIndex - 1);
        this.state = {
          ...this.state,
          bottomPanel: {
            ...this.state.bottomPanel,
            selectedProblemIndex: newIndex,
          },
        };
        return [this, null];
      }

      case 'down':
      case 'j': {
        const maxIndex = Math.max(0, this.state.bottomPanel.problems.length - 1);
        const newIndex = Math.min(maxIndex, this.state.bottomPanel.selectedProblemIndex + 1);
        this.state = {
          ...this.state,
          bottomPanel: {
            ...this.state.bottomPanel,
            selectedProblemIndex: newIndex,
          },
        };
        return [this, null];
      }

      case 'enter': {
        const problem = getProblemAtIndex(
          this.state.bottomPanel.problems,
          this.state.bottomPanel.selectedProblemIndex,
        );
        if (!problem || !problem.path) return [this, null];

        // Resolve problem path to absolute path
        const { join } = require('path');
        const fullPath = join(this.state.workspace.root, problem.path);
        return [this, async (): Promise<Msg> => {
          await this._openDocumentAsync(fullPath);
          return new DismissOverlayMsg();
        }];
      }

      case 'escape':
      case 'esc':
        this.state = { ...this.state, activePane: 'editor' };
        return [this, null];

      default:
        return [this, null];
    }
  }

  // ===========================================================================
  // Mouse Handling
  // ===========================================================================

  private _handleMouseClick(msg: MouseClickMsg): [Model, Cmd] {
    if (msg.button !== MouseButton.Left) return [this, null];

    const layout = calculateLayout(
      this.state.terminal.width,
      this.state.terminal.height,
      this.state.sidebarVisible,
      this.state.bottomPanel.visible,
    );

    const { x, y } = msg;

    // Click in sidebar area?
    if (layout.sidebarVisible && x < layout.sidebar.width && y < layout.sidebar.height) {
      this.state = { ...this.state, activePane: 'explorer' };

      // Calculate which item was clicked (accounting for border and title)
      const itemY = y - 2; // 1 border + 1 title
      if (itemY >= 0) {
        const clickIndex = this.state.explorer.scrollOffset + itemY;
        const visible = getVisibleItems(this.state.explorer);
        if (clickIndex < visible.length) {
          const item = visible[clickIndex];
          this.state = {
            ...this.state,
            explorer: { ...this.state.explorer, selectedIndex: clickIndex },
          };

          if (item.isDir) {
            this.state = {
              ...this.state,
              explorer: toggleExpand(this.state.explorer),
            };
            return [this, null];
          }

          // Open file on click
          return [this, async (): Promise<Msg> => {
            await this._openDocumentAsync(item.path);
            return new DismissOverlayMsg();
          }];
        }
      }
      return [this, null];
    }

    // Click in editor area?
    if (x >= layout.editor.x && x < layout.editor.x + layout.editor.width &&
        y < layout.editor.height) {
      if (this.state.activePane !== 'editor') {
        this.state = { ...this.state, activePane: 'editor' };
      }
      return [this, null];
    }

    // Click in bottom panel?
    if (layout.bottomPanelVisible &&
        y >= layout.bottomPanel.y &&
        y < layout.bottomPanel.y + layout.bottomPanel.height) {
      this.state = { ...this.state, activePane: 'bottomPanel' };
      return [this, null];
    }

    return [this, null];
  }

  private _handleMouseWheel(msg: MouseWheelMsg): [Model, Cmd] {
    if (!this.state.editor.document) return [this, null];

    const layout = calculateLayout(
      this.state.terminal.width,
      this.state.terminal.height,
      this.state.sidebarVisible,
      this.state.bottomPanel.visible,
    );

    const viewportHeight = layout.editor.height - 4;
    const delta = msg.button === MouseButton.WheelDown ? 3 : -3;

    // Check if mouse is in editor area
    if (msg.x >= layout.editor.x && msg.x < layout.editor.x + layout.editor.width) {
      const doc = scrollDocument(this.state.editor.document, delta, viewportHeight);
      this.state = {
        ...this.state,
        editor: { ...this.state.editor, document: doc },
      };
      return [this, null];
    }

    // Check if mouse is in sidebar (scroll explorer)
    if (layout.sidebarVisible && msg.x < layout.sidebar.width) {
      if (delta > 0) {
        this.state = {
          ...this.state,
          explorer: moveSelectionDown(moveSelectionDown(moveSelectionDown(this.state.explorer))),
        };
      } else {
        this.state = {
          ...this.state,
          explorer: moveSelectionUp(moveSelectionUp(moveSelectionUp(this.state.explorer))),
        };
      }
      return [this, null];
    }

    return [this, null];
  }
}

// =============================================================================
// Launch Studio
// =============================================================================

/**
 * Launch the KB Studio TUI application
 */
export async function launchStudio(wikiRoot: string, paths: WikiPaths): Promise<void> {
  const model = new StudioApp(wikiRoot, paths);
  const program = new Program(
    model,
    WithAltScreen(),
    WithMouseMode(MouseMode.AllMotion),
  );
  await program.run();
}
