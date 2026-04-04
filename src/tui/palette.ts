/**
 * Command palette and quick open overlay
 * Implements VSCode-style Ctrl+P (quick open) and Ctrl+Shift+P (command palette)
 * @module tui/palette
 */

import { newStyle } from '@oakoliver/lipgloss';
import type { CommandPaletteState, PaletteItem, OverlayKind } from './state';
import { theme, colors, icons } from './theme';
import { commandsToPaletteItems, filterPaletteItems } from './commands';

// =============================================================================
// Palette State Helpers
// =============================================================================

/**
 * Create initial palette state for quick open mode
 */
export function createQuickOpenState(filePaths: PaletteItem[]): CommandPaletteState {
  return {
    query: '',
    items: filePaths,
    filteredItems: filePaths,
    selectedIndex: 0,
  };
}

/**
 * Create initial palette state for command palette mode
 */
export function createCommandPaletteState(): CommandPaletteState {
  const items = commandsToPaletteItems();
  return {
    query: '',
    items,
    filteredItems: items,
    selectedIndex: 0,
  };
}

/**
 * Update query and refilter items
 */
export function updatePaletteQuery(state: CommandPaletteState, query: string): CommandPaletteState {
  const filtered = filterPaletteItems(state.items, query);
  return {
    ...state,
    query,
    filteredItems: filtered,
    selectedIndex: 0, // Reset selection on filter change
  };
}

/**
 * Append a character to the palette query
 */
export function appendToPaletteQuery(state: CommandPaletteState, char: string): CommandPaletteState {
  return updatePaletteQuery(state, state.query + char);
}

/**
 * Delete last character from palette query
 */
export function backspacePaletteQuery(state: CommandPaletteState): CommandPaletteState {
  if (state.query.length === 0) return state;
  return updatePaletteQuery(state, state.query.slice(0, -1));
}

/**
 * Move selection up
 */
export function paletteSelectUp(state: CommandPaletteState): CommandPaletteState {
  if (state.filteredItems.length === 0) return state;
  const newIndex = Math.max(0, state.selectedIndex - 1);
  return { ...state, selectedIndex: newIndex };
}

/**
 * Move selection down
 */
export function paletteSelectDown(state: CommandPaletteState): CommandPaletteState {
  if (state.filteredItems.length === 0) return state;
  const newIndex = Math.min(state.filteredItems.length - 1, state.selectedIndex + 1);
  return { ...state, selectedIndex: newIndex };
}

/**
 * Get the currently selected palette item
 */
export function getSelectedPaletteItem(state: CommandPaletteState): PaletteItem | null {
  return state.filteredItems[state.selectedIndex] ?? null;
}

/**
 * Build palette items from article paths (for quick open)
 */
export function articlePathsToPaletteItems(articlePaths: string[], wikiDir: string): PaletteItem[] {
  return articlePaths.map((path) => {
    const rel = path.replace(wikiDir + '/', '');
    const parts = rel.split('/');
    const filename = parts[parts.length - 1].replace('.md', '');
    const dir = parts.length > 1 ? parts[parts.length - 2] : '';
    const displayName = filename
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    return {
      id: path,
      label: displayName,
      description: dir,
    };
  });
}

// =============================================================================
// Palette Rendering
// =============================================================================

/** Maximum items to display in the palette */
const MAX_VISIBLE_ITEMS = 10;

/**
 * Render the palette overlay centered on the screen
 */
export function renderPalette(
  state: CommandPaletteState,
  mode: 'quickOpen' | 'commandPalette',
  termWidth: number,
  termHeight: number,
): string {
  const paletteWidth = Math.min(60, Math.floor(termWidth * 0.6));
  const maxItems = Math.min(MAX_VISIBLE_ITEMS, state.filteredItems.length);
  const paletteHeight = 2 + maxItems; // input + separator + items

  // Prompt
  const prompt = mode === 'quickOpen' ? `${icons.search} ` : `> `;
  const inputLine = theme.paletteInput
    .width(paletteWidth)
    .render(`${prompt}${state.query}█`);

  // Separator
  const sep = theme.muted.render('─'.repeat(paletteWidth));

  // Items
  const itemLines: string[] = [];
  const visibleItems = state.filteredItems.slice(0, MAX_VISIBLE_ITEMS);

  for (let i = 0; i < visibleItems.length; i++) {
    const item = visibleItems[i];
    const isSelected = i === state.selectedIndex;

    let line: string;
    if (isSelected) {
      line = theme.paletteItemSelected.render(formatPaletteItem(item, paletteWidth - 2));
    } else {
      line = theme.paletteItem.render(formatPaletteItem(item, paletteWidth - 2));
    }
    itemLines.push(line);
  }

  if (state.filteredItems.length === 0) {
    itemLines.push(theme.muted.render('  No matching items'));
  }

  // Count indicator
  const countText = `${state.filteredItems.length} items`;
  const countLine = theme.muted.render(`  ${countText}`.padEnd(paletteWidth));

  const content = [inputLine, sep, ...itemLines, countLine].join('\n');

  // Apply border
  const bordered = theme.focusedBorder
    .width(paletteWidth + 2)
    .render(content);

  // Position: center horizontally, top third vertically
  const padLeft = Math.max(0, Math.floor((termWidth - paletteWidth - 2) / 2));
  const padTop = Math.max(1, Math.floor(termHeight * 0.15));

  const horizontalPad = ' '.repeat(padLeft);
  const topPad = '\n'.repeat(padTop);

  const paddedLines = bordered
    .split('\n')
    .map((line) => horizontalPad + line)
    .join('\n');

  return topPad + paddedLines;
}

/**
 * Format a single palette item line
 */
function formatPaletteItem(item: PaletteItem, maxWidth: number): string {
  let text = item.label;

  if (item.description) {
    text += `  ${theme.muted.render(item.description)}`;
  }

  if (item.shortcut) {
    const shortcutStr = theme.paletteShortcut.render(item.shortcut);
    text += `  ${shortcutStr}`;
  }

  return text;
}
