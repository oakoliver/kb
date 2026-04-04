/**
 * Explorer tree view component for the sidebar
 * Handles tree flattening, selection, expand/collapse, and rendering
 * @module tui/explorer
 */

import { newStyle, type Style } from '@oakoliver/lipgloss';
import type { ExplorerItem, ExplorerState } from './state';
import { theme, icons, articleIcon, dirIcon, colors } from './theme';
import { flattenExplorerItems } from './operations/workspace';

// =============================================================================
// Explorer State Helpers
// =============================================================================

/**
 * Get the flat list of visible items for the current explorer state
 */
export function getVisibleItems(state: ExplorerState): ExplorerItem[] {
  return flattenExplorerItems(state.items);
}

/**
 * Move selection up by one in the visible item list
 */
export function moveSelectionUp(state: ExplorerState): ExplorerState {
  const visible = getVisibleItems(state);
  if (visible.length === 0) return state;

  const newIndex = Math.max(0, state.selectedIndex - 1);
  return adjustScrollForIndex(
    { ...state, selectedIndex: newIndex },
    visible.length,
  );
}

/**
 * Move selection down by one in the visible item list
 */
export function moveSelectionDown(state: ExplorerState): ExplorerState {
  const visible = getVisibleItems(state);
  if (visible.length === 0) return state;

  const newIndex = Math.min(visible.length - 1, state.selectedIndex + 1);
  return adjustScrollForIndex(
    { ...state, selectedIndex: newIndex },
    visible.length,
  );
}

/**
 * Toggle expand/collapse of a directory item
 */
export function toggleExpand(state: ExplorerState): ExplorerState {
  const visible = getVisibleItems(state);
  const selected = visible[state.selectedIndex];
  if (!selected || !selected.isDir) return state;

  // Deep clone items and toggle the target
  const newItems = state.items.map((item) => {
    if (item.path === selected.path) {
      return { ...item, expanded: !item.expanded };
    }
    return item;
  });

  return { ...state, items: newItems };
}

/**
 * Get the currently selected item, or null
 */
export function getSelectedItem(state: ExplorerState): ExplorerItem | null {
  const visible = getVisibleItems(state);
  return visible[state.selectedIndex] ?? null;
}

/**
 * Select item by path (for syncing editor -> explorer)
 */
export function selectByPath(state: ExplorerState, path: string): ExplorerState {
  const visible = getVisibleItems(state);
  const idx = visible.findIndex((item) => item.path === path);
  if (idx < 0) return state;
  return adjustScrollForIndex(
    { ...state, selectedIndex: idx },
    visible.length,
  );
}

// =============================================================================
// Scroll Management
// =============================================================================

/**
 * Adjust scroll offset to keep the selected index visible within a viewport
 */
function adjustScrollForIndex(
  state: ExplorerState,
  totalItems: number,
  viewportHeight: number = 20,
): ExplorerState {
  let { scrollOffset, selectedIndex } = state;

  // Ensure selected item is within the visible range
  if (selectedIndex < scrollOffset) {
    scrollOffset = selectedIndex;
  } else if (selectedIndex >= scrollOffset + viewportHeight) {
    scrollOffset = selectedIndex - viewportHeight + 1;
  }

  // Clamp
  scrollOffset = Math.max(0, Math.min(scrollOffset, Math.max(0, totalItems - viewportHeight)));

  return { ...state, scrollOffset };
}

// =============================================================================
// Explorer Rendering
// =============================================================================

/**
 * Render the explorer tree within the given dimensions
 */
export function renderExplorer(
  state: ExplorerState,
  width: number,
  height: number,
  isFocused: boolean,
): string {
  const visible = getVisibleItems(state);

  if (visible.length === 0) {
    const emptyMsg = theme.muted.render('  No articles yet.');
    const hint = theme.muted.render('  Run kb compile to get started.');
    const pad = '\n'.repeat(Math.max(0, Math.floor((height - 4) / 2)));
    return pad + emptyMsg + '\n' + hint;
  }

  // Visible slice
  const start = state.scrollOffset;
  const end = Math.min(start + height, visible.length);
  const lines: string[] = [];

  for (let i = start; i < end; i++) {
    const item = visible[i];
    const isSelected = i === state.selectedIndex;
    lines.push(renderExplorerItem(item, width, isSelected, isFocused));
  }

  // Pad remaining height
  while (lines.length < height) {
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Render a single explorer item line
 */
function renderExplorerItem(
  item: ExplorerItem,
  width: number,
  isSelected: boolean,
  isFocused: boolean,
): string {
  const indent = '  '.repeat(item.depth);
  let icon: string;
  let label: string;

  if (item.isDir) {
    icon = dirIcon(item.expanded ?? false);
    const chevron = item.expanded ? icons.chevronDown : icons.chevronRight;
    label = `${indent}${chevron} ${icon} ${item.name}`;
  } else {
    icon = articleIcon(item.articleType ?? 'unknown');
    label = `${indent}  ${icon} ${item.name}`;
  }

  // Truncate to width
  if (label.length > width) {
    label = label.slice(0, width - 1) + '…';
  }

  // Pad to width
  label = label.padEnd(width);

  if (isSelected && isFocused) {
    return theme.explorerItemSelected.render(label);
  } else if (isSelected) {
    return newStyle().background(colors.bgSecondary).render(label);
  } else if (item.isDir) {
    return theme.explorerDir.render(label);
  }
  return theme.explorerItem.render(label);
}
