/**
 * Full-screen view compositor: assembles sidebar, editor, bottom panel, status bar, help bar
 * @module tui/view
 */

import { joinHorizontal, joinVertical, newStyle, Left, Top, place, Center } from '@oakoliver/lipgloss';
import type { StudioState } from './state';
import { calculateLayout } from './layout';
import { renderExplorer } from './explorer';
import { renderEditor } from './editor';
import { renderSearchView } from './search';
import { renderIngestView } from './ingest';
import { renderStatusBar, renderHelpBar, renderPaneTitle } from './chrome';
import { renderPalette } from './palette';
import { renderProblemsPanel } from './panels/problems';
import { theme, colors, icons } from './theme';

// =============================================================================
// Main View Compositor
// =============================================================================

/**
 * Compose the full studio view from the current state
 */
export function renderStudio(state: StudioState): string {
  const { width, height } = state.terminal;
  if (width === 0 || height === 0) return 'Initializing...';

  const layout = calculateLayout(
    width,
    height,
    state.sidebarVisible,
    state.bottomPanel.visible,
  );

  // -- Sidebar --
  let sidebarView = '';
  if (layout.sidebarVisible && layout.sidebar.width > 0) {
    const sidebarFocused = state.activePane === 'explorer' ||
      state.activePane === 'search' ||
      state.activePane === 'ingest';

    const titleHeight = 1;
    const contentHeight = layout.sidebar.height - titleHeight;

    // Sidebar title
    let sidebarTitle: string;
    let sidebarIcon: string;
    if (state.sidebarView === 'explorer') {
      sidebarTitle = 'EXPLORER';
      sidebarIcon = icons.folderOpen;
    } else if (state.sidebarView === 'search') {
      sidebarTitle = 'SEARCH';
      sidebarIcon = icons.search;
    } else {
      sidebarTitle = 'INGEST';
      sidebarIcon = icons.ingest;
    }

    const titleBar = renderPaneTitle(
      sidebarTitle,
      sidebarIcon,
      layout.sidebar.width - 2, // account for border
      sidebarFocused,
    );

    // Sidebar content
    let sidebarContent: string;
    if (state.sidebarView === 'explorer') {
      sidebarContent = renderExplorer(
        state.explorer,
        layout.sidebar.width - 2, // border
        Math.max(1, contentHeight - 2), // border
        state.activePane === 'explorer',
      );
    } else if (state.sidebarView === 'search') {
      sidebarContent = renderSearchView(
        state.search,
        layout.sidebar.width - 2,
        Math.max(1, contentHeight - 2),
        state.activePane === 'search',
      );
    } else {
      sidebarContent = renderIngestView(
        state.ingest,
        layout.sidebar.width - 2,
        Math.max(1, contentHeight - 2),
        state.activePane === 'ingest',
      );
    }

    const fullSidebar = titleBar + '\n' + sidebarContent;

    // Apply border
    const borderStyle = sidebarFocused ? theme.focusedBorder : theme.unfocusedBorder;
    sidebarView = borderStyle
      .width(layout.sidebar.width)
      .height(layout.sidebar.height)
      .render(fullSidebar);
  }

  // -- Editor --
  const editorFocused = state.activePane === 'editor';
  const editorContent = renderEditor(
    state.editor,
    layout.editor.width - 2, // border
    layout.editor.height - 2, // border
    editorFocused,
  );
  const editorBorder = editorFocused ? theme.focusedBorder : theme.unfocusedBorder;
  const editorView = editorBorder
    .width(layout.editor.width)
    .height(layout.editor.height)
    .render(editorContent);

  // -- Main Area (sidebar + editor) --
  let mainArea: string;
  if (layout.sidebarVisible && sidebarView) {
    mainArea = joinHorizontal(Top, sidebarView, editorView);
  } else {
    mainArea = editorView;
  }

  // -- Bottom Panel --
  let bottomPanelView = '';
  if (layout.bottomPanelVisible && layout.bottomPanel.height > 0) {
    const bpFocused = state.activePane === 'bottomPanel';
    const bpContent = renderBottomPanel(
      state,
      layout.bottomPanel.width - 2,
      layout.bottomPanel.height - 2,
      bpFocused,
    );
    const bpBorder = bpFocused ? theme.focusedBorder : theme.dimBorder;
    bottomPanelView = bpBorder
      .width(layout.bottomPanel.width)
      .height(layout.bottomPanel.height)
      .render(bpContent);
  }

  // -- Status Bar --
  const statusBarView = renderStatusBar(state.statusBar, layout.statusBar.width);

  // -- Help Bar --
  const helpBarView = renderHelpBar(
    state.activePane,
    state.overlay,
    state.sidebarView,
    state.editor.document !== null,
    layout.helpBar.width,
  );

  // -- Compose everything vertically --
  const parts: string[] = [mainArea];
  if (bottomPanelView) parts.push(bottomPanelView);
  parts.push(statusBarView);
  parts.push(helpBarView);

  let screen = joinVertical(Left, ...parts);

  // -- Overlay (palette) --
  if (state.overlay === 'quickOpen' || state.overlay === 'commandPalette') {
    const paletteOverlay = renderPalette(
      state.palette,
      state.overlay,
      width,
      height,
    );
    // Place the overlay on top of the screen
    screen = place(width, height, Center, Top, paletteOverlay);
  }

  return screen;
}

// =============================================================================
// Bottom Panel (Stub for Phase 3 - fleshed out in later phases)
// =============================================================================

function renderBottomPanel(
  state: StudioState,
  width: number,
  height: number,
  isFocused: boolean,
): string {
  const tab = state.bottomPanel.activeTab;

  // Title bar with tabs
  const tabs = ['output', 'problems', 'progress'] as const;
  const tabBar = tabs
    .map((t) => {
      if (t === tab) {
        return theme.paneTitleFocused.render(` ${t.toUpperCase()} `);
      }
      return theme.muted.render(` ${t} `);
    })
    .join('  ');

  const lines: string[] = [tabBar];

  if (tab === 'output') {
    const outputLines = state.bottomPanel.output.slice(-(height - 1));
    for (const line of outputLines) {
      const style = line.kind === 'error' ? theme.error :
        line.kind === 'success' ? theme.success :
        line.kind === 'stream' ? theme.info :
        theme.muted;
      lines.push(style.render(line.text));
    }
  } else if (tab === 'problems') {
    const problemsContent = renderProblemsPanel(
      state.bottomPanel.problems,
      width,
      Math.max(1, height - 1),
      state.bottomPanel.selectedProblemIndex,
    );
    lines.push(problemsContent);
  } else if (tab === 'progress') {
    if (state.bottomPanel.progressPercent > 0) {
      const pct = Math.round(state.bottomPanel.progressPercent * 100);
      lines.push(theme.progressLabel.render(`  ${state.bottomPanel.progressLabel} ${pct}%`));
    } else {
      lines.push(theme.muted.render('  No active operations'));
    }
  }

  while (lines.length < height) {
    lines.push('');
  }

  return lines.slice(0, height).join('\n');
}
