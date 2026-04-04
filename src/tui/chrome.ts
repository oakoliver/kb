/**
 * Chrome elements: status bar, help bar, and pane titles
 * @module tui/chrome
 */

import { newStyle, joinHorizontal, Left, Right, Center } from '@oakoliver/lipgloss';
import type { StatusBarState, ActivePane, OverlayKind, SidebarView } from './state';
import { theme, colors, icons } from './theme';

// =============================================================================
// Status Bar
// =============================================================================

/**
 * Render the status bar at the bottom of the screen
 */
export function renderStatusBar(
  status: StatusBarState,
  width: number,
): string {
  // Left section: workspace name (accent block)
  const wsName = theme.statusBarAccent.render(` ${icons.folderOpen} ${status.workspaceName} `);

  // Middle items
  const items: string[] = [];

  if (status.sourceCount > 0) {
    items.push(theme.statusBarItem.render(`${icons.ingest} ${status.sourceCount} sources`));
  }
  if (status.articleCount > 0) {
    items.push(theme.statusBarItem.render(`${icons.fileMarkdown} ${status.articleCount} articles`));
  }
  if (status.provider) {
    items.push(theme.statusBarItem.render(`${icons.query} ${status.provider}`));
  }

  // Error/warning counts from lint
  if (status.errorCount > 0) {
    items.push(theme.statusBarItem
      .foreground(colors.error)
      .render(`${icons.error} ${status.errorCount}`));
  }
  if (status.warningCount > 0) {
    items.push(theme.statusBarItem
      .foreground(colors.warning)
      .render(`${icons.warning} ${status.warningCount}`));
  }

  // Active operation
  let opSection = '';
  if (status.activeOperation) {
    opSection = theme.statusBarItem
      .foreground(colors.warning)
      .render(`${icons.spinner} ${status.activeOperation}`);
  }

  // Build the bar
  const leftPart = wsName + items.join('');
  const rightPart = opSection;

  // Fill middle with background
  const leftWidth = stripAnsiWidth(leftPart);
  const rightWidth = stripAnsiWidth(rightPart);
  const fillWidth = Math.max(0, width - leftWidth - rightWidth);
  const fill = theme.statusBar.width(fillWidth).render('');

  return leftPart + fill + rightPart;
}

// =============================================================================
// Help Bar
// =============================================================================

interface HelpBinding {
  key: string;
  desc: string;
}

/**
 * Get contextual help bindings based on current active pane and overlay
 */
export function getContextualHelp(
  activePane: ActivePane,
  overlay: OverlayKind,
  sidebarView: SidebarView,
  hasDocument: boolean,
): HelpBinding[] {
  // Overlay-specific help
  if (overlay === 'quickOpen' || overlay === 'commandPalette') {
    return [
      { key: '↑↓', desc: 'navigate' },
      { key: 'Enter', desc: 'select' },
      { key: 'Esc', desc: 'close' },
    ];
  }

  const common: HelpBinding[] = [
    { key: 'Ctrl+P', desc: 'Quick Open' },
    { key: 'Ctrl+Shift+P', desc: 'Commands' },
    { key: 'Ctrl+B', desc: 'Sidebar' },
    { key: 'Ctrl+J', desc: 'Panel' },
    { key: 'Ctrl+Q', desc: 'Quit' },
  ];

  if (activePane === 'explorer') {
    return [
      { key: '↑↓', desc: 'navigate' },
      { key: 'Enter', desc: 'open' },
      { key: 'Space', desc: 'expand' },
      { key: 'Ctrl+Shift+F', desc: 'Search' },
      ...common,
    ];
  }

  if (activePane === 'editor' && hasDocument) {
    return [
      { key: '↑↓', desc: 'scroll' },
      { key: 'Tab', desc: 'next link' },
      { key: 'Enter', desc: 'follow link' },
      { key: 'Alt+←', desc: 'back' },
      { key: 'Ctrl+S', desc: 'save query' },
      ...common,
    ];
  }

  if (activePane === 'search') {
    return [
      { key: 'Enter', desc: 'search' },
      { key: '↑↓', desc: 'results' },
      { key: 'Ctrl+Enter', desc: 'LLM query' },
      { key: 'Ctrl+Shift+E', desc: 'Explorer' },
      ...common,
    ];
  }

  if (activePane === 'ingest') {
    return [
      { key: 'Enter', desc: 'ingest' },
      { key: 'Esc', desc: 'clear/back' },
      { key: 'Ctrl+Shift+E', desc: 'Explorer' },
      ...common,
    ];
  }

  if (activePane === 'bottomPanel') {
    return [
      { key: '↑↓', desc: 'navigate' },
      { key: 'Enter', desc: 'go to file' },
      { key: 'Esc', desc: 'back' },
      { key: 'Ctrl+Shift+L', desc: 'Re-lint' },
      ...common,
    ];
  }

  return common;
}

/**
 * Render the contextual help bar
 */
export function renderHelpBar(
  activePane: ActivePane,
  overlay: OverlayKind,
  sidebarView: SidebarView,
  hasDocument: boolean,
  width: number,
): string {
  const bindings = getContextualHelp(activePane, overlay, sidebarView, hasDocument);

  const parts = bindings.map((b) => {
    const key = theme.helpKey.render(b.key);
    const desc = theme.helpDesc.render(b.desc);
    return `${key} ${desc}`;
  });

  const sep = theme.helpSep.render(' │ ');
  const bar = ' ' + parts.join(` ${sep} `);

  // Ensure it fills the width
  return theme.helpBar.width(width).render(bar);
}

// =============================================================================
// Pane Title Headers
// =============================================================================

/**
 * Render a pane title header
 */
export function renderPaneTitle(
  title: string,
  icon: string,
  width: number,
  isFocused: boolean,
): string {
  const style = isFocused ? theme.paneTitleFocused : theme.paneTitle;
  let text = `${icon} ${title}`;
  if (text.length > width - 2) {
    text = text.slice(0, width - 3) + '…';
  }
  return style.width(width).render(text);
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Get visual width of a string, stripping ANSI codes
 * Simple implementation - counts non-escape characters
 */
function stripAnsiWidth(str: string): number {
  // eslint-disable-next-line no-control-regex
  const stripped = str.replace(/\x1b\[[0-9;]*m/g, '');
  return stripped.length;
}
