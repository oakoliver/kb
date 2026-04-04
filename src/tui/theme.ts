/**
 * Theme and styling for KB Studio TUI
 * Implements the OpenCode-inspired theme system with adaptive dark/light colors.
 * @module tui/theme
 */

import { newStyle, roundedBorder, normalBorder, type Style } from '@oakoliver/lipgloss';

// =============================================================================
// Color Tokens (OpenCode default theme)
// =============================================================================

export const colors = {
  // Base
  primary: '#fab283',
  secondary: '#5c9cf5',
  accent: '#9d7cd8',

  // Status
  error: '#e06c75',
  warning: '#f5a742',
  success: '#7fd88f',
  info: '#56b6c2',

  // Text
  text: '#e0e0e0',
  textMuted: '#6a6a6a',
  textEmphasized: '#e5c07b',

  // Background
  bg: '#212121',
  bgSecondary: '#252525',
  bgDarker: '#121212',

  // Borders
  borderNormal: '#4b4c5c',
  borderFocused: '#fab283',
  borderDim: '#303030',

  // Markdown
  markdownHeading: '#5c9cf5',
  markdownLink: '#fab283',
  markdownLinkText: '#56b6c2',
  markdownCode: '#7fd88f',
  markdownBlockQuote: '#e5c07b',
} as const;

// =============================================================================
// Nerd Font Icons
// =============================================================================

export const icons = {
  // File types
  file: '\uf15c',         // 
  fileMarkdown: '\ue73e', // 
  fileConcept: '\uf0eb',  // 
  fileEntity: '\uf2c2',   // 
  fileSynthesis: '\uf074', // 
  fileQuery: '\uf128',    // 

  // Folders
  folderClosed: '\uf07b', // 
  folderOpen: '\uf07c',   // 

  // Navigation
  chevronRight: '\ue0b1', // 
  chevronDown: '\uf078',  // 

  // Actions
  search: '\uf002',       // 
  compile: '\uf085',      // 
  ingest: '\uf56f',       // 
  lint: '\uf058',         // 
  query: '\uf059',        // 

  // Status
  success: '\uf00c',      // 
  check: '\uf00c',        //  (alias for success)
  error: '\uf00d',        // 
  warning: '\uf071',      // 
  info: '\uf05a',         // 
  spinner: '\uf110',      // 
  pending: '\uf252',      // 
  dot: '\uf444',          // 

  // Layout
  sidebarLeft: '\uf337',  // 
  terminal: '\uf120',     // 
  problems: '\uf188',     // 
  progress: '\uf201',     // 
} as const;

// =============================================================================
// Reusable Styles
// =============================================================================

export const theme = {
  // ---- Borders ----
  focusedBorder: newStyle()
    .border(roundedBorder(), true)
    .borderForeground(colors.borderFocused),

  unfocusedBorder: newStyle()
    .border(roundedBorder(), true)
    .borderForeground(colors.borderNormal),

  dimBorder: newStyle()
    .border(roundedBorder(), true)
    .borderForeground(colors.borderDim),

  // ---- Text ----
  title: newStyle().bold(true).foreground(colors.text),
  subtitle: newStyle().foreground(colors.textMuted),
  heading: newStyle().bold(true).foreground(colors.secondary),
  muted: newStyle().foreground(colors.textMuted),
  emphasized: newStyle().foreground(colors.textEmphasized),
  link: newStyle().foreground(colors.markdownLink).underline(true),

  // ---- Status ----
  success: newStyle().foreground(colors.success),
  error: newStyle().foreground(colors.error),
  warning: newStyle().foreground(colors.warning),
  info: newStyle().foreground(colors.info),

  // ---- Pane Chrome ----
  paneTitle: newStyle()
    .bold(true)
    .foreground(colors.text)
    .paddingLeft(1)
    .paddingRight(1),

  paneTitleFocused: newStyle()
    .bold(true)
    .foreground(colors.primary)
    .paddingLeft(1)
    .paddingRight(1),

  // ---- Status Bar ----
  statusBar: newStyle()
    .background(colors.bgSecondary)
    .foreground(colors.text)
    .paddingLeft(1)
    .paddingRight(1),

  statusBarItem: newStyle()
    .background(colors.bgSecondary)
    .foreground(colors.textMuted)
    .paddingLeft(1)
    .paddingRight(1),

  statusBarAccent: newStyle()
    .background(colors.primary)
    .foreground(colors.bgDarker)
    .bold(true)
    .paddingLeft(1)
    .paddingRight(1),

  // ---- Help Bar ----
  helpBar: newStyle()
    .background(colors.bgDarker)
    .foreground(colors.textMuted),

  helpKey: newStyle()
    .foreground(colors.primary)
    .bold(true),

  helpDesc: newStyle()
    .foreground(colors.textMuted),

  helpSep: newStyle()
    .foreground(colors.borderDim),

  // ---- Explorer ----
  explorerItem: newStyle()
    .foreground(colors.text),

  explorerItemSelected: newStyle()
    .foreground(colors.text)
    .background(colors.bgSecondary)
    .bold(true),

  explorerDir: newStyle()
    .foreground(colors.secondary)
    .bold(true),

  // ---- Search ----
  searchHighlight: newStyle()
    .foreground(colors.primary)
    .bold(true),

  scoreStyle: newStyle()
    .foreground(colors.textEmphasized),

  // ---- Palette ----
  paletteInput: newStyle()
    .foreground(colors.text)
    .background(colors.bgSecondary)
    .paddingLeft(1)
    .paddingRight(1),

  paletteItem: newStyle()
    .foreground(colors.text)
    .paddingLeft(2),

  paletteItemSelected: newStyle()
    .foreground(colors.text)
    .background(colors.bgSecondary)
    .bold(true)
    .paddingLeft(2),

  paletteShortcut: newStyle()
    .foreground(colors.textMuted)
    .faint(true),

  // ---- Progress ----
  progressBar: newStyle()
    .foreground(colors.primary),

  progressLabel: newStyle()
    .foreground(colors.textMuted),
} as const;

/**
 * Get icon for article type
 */
export function articleIcon(type: string): string {
  switch (type) {
    case 'concept': return icons.fileConcept;
    case 'entity': return icons.fileEntity;
    case 'synthesis': return icons.fileSynthesis;
    case 'query': return icons.fileQuery;
    default: return icons.fileMarkdown;
  }
}

/**
 * Get icon for directory name
 */
export function dirIcon(expanded: boolean): string {
  return expanded ? icons.folderOpen : icons.folderClosed;
}
