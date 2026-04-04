/**
 * Command registry and palette descriptors for KB Studio
 * @module tui/commands
 */

import type { PaletteItem } from './state';

// =============================================================================
// Command IDs
// =============================================================================

export type CommandId =
  | 'kb.compile'
  | 'kb.lint'
  | 'kb.status'
  | 'kb.query.save'
  | 'kb.promote'
  | 'kb.focusExplorer'
  | 'kb.focusSearch'
  | 'kb.focusIngest'
  | 'kb.toggleSidebar'
  | 'kb.toggleBottomPanel'
  | 'kb.quickOpen'
  | 'kb.commandPalette'
  | 'kb.quit';

// =============================================================================
// Command Descriptors
// =============================================================================

export interface CommandDescriptor {
  id: CommandId;
  label: string;
  description: string;
  shortcut?: string;
  category: 'navigation' | 'operation' | 'view' | 'edit';
}

const COMMANDS: CommandDescriptor[] = [
  // Navigation
  {
    id: 'kb.focusExplorer',
    label: 'Focus Explorer',
    description: 'Switch focus to the file explorer',
    shortcut: 'Ctrl+Shift+E',
    category: 'navigation',
  },
  {
    id: 'kb.focusSearch',
    label: 'Focus Search',
    description: 'Switch focus to the search panel',
    shortcut: 'Ctrl+Shift+F',
    category: 'navigation',
  },
  {
    id: 'kb.focusIngest',
    label: 'Focus Ingest',
    description: 'Switch focus to the ingest panel',
    shortcut: 'Ctrl+Shift+I',
    category: 'navigation',
  },
  {
    id: 'kb.quickOpen',
    label: 'Quick Open',
    description: 'Open a file by name',
    shortcut: 'Ctrl+P',
    category: 'navigation',
  },
  {
    id: 'kb.commandPalette',
    label: 'Command Palette',
    description: 'Open the command palette',
    shortcut: 'Ctrl+Shift+P',
    category: 'navigation',
  },

  // View
  {
    id: 'kb.toggleSidebar',
    label: 'Toggle Sidebar',
    description: 'Show or hide the sidebar',
    shortcut: 'Ctrl+B',
    category: 'view',
  },
  {
    id: 'kb.toggleBottomPanel',
    label: 'Toggle Bottom Panel',
    description: 'Show or hide the bottom panel',
    shortcut: 'Ctrl+J',
    category: 'view',
  },

  // Operations
  {
    id: 'kb.compile',
    label: 'Compile Wiki',
    description: 'Compile sources into wiki articles',
    shortcut: 'Ctrl+Shift+C',
    category: 'operation',
  },
  {
    id: 'kb.lint',
    label: 'Lint Wiki',
    description: 'Check wiki health and find issues',
    shortcut: 'Ctrl+Shift+L',
    category: 'operation',
  },
  {
    id: 'kb.status',
    label: 'Show Status',
    description: 'Display workspace statistics',
    category: 'operation',
  },
  {
    id: 'kb.query.save',
    label: 'Save Query',
    description: 'Save the current query answer to queries/',
    shortcut: 'Ctrl+S',
    category: 'edit',
  },
  {
    id: 'kb.promote',
    label: 'Promote Query',
    description: 'Move a query output into the wiki',
    category: 'edit',
  },
  {
    id: 'kb.quit',
    label: 'Quit Studio',
    description: 'Exit KB Studio',
    shortcut: 'Ctrl+Q',
    category: 'navigation',
  },
];

// =============================================================================
// Registry API
// =============================================================================

/**
 * Get all registered commands
 */
export function getAllCommands(): CommandDescriptor[] {
  return COMMANDS;
}

/**
 * Get a command by ID
 */
export function getCommand(id: CommandId): CommandDescriptor | undefined {
  return COMMANDS.find((c) => c.id === id);
}

/**
 * Convert commands to palette items
 */
export function commandsToPaletteItems(): PaletteItem[] {
  return COMMANDS.map((cmd) => ({
    id: cmd.id,
    label: cmd.label,
    description: cmd.description,
    shortcut: cmd.shortcut,
  }));
}

/**
 * Filter palette items by query string (fuzzy match on label and description)
 */
export function filterPaletteItems(items: PaletteItem[], query: string): PaletteItem[] {
  if (!query.trim()) return items;

  const lower = query.toLowerCase();
  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(lower) ||
      (item.description && item.description.toLowerCase().includes(lower)),
  );
}
