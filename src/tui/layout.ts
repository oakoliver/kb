/**
 * Layout sizing and pane geometry for KB Studio
 * @module tui/layout
 */

import { newStyle, joinHorizontal, joinVertical, type Position, Top, Left, Center } from '@oakoliver/lipgloss';

// =============================================================================
// Layout Constants
// =============================================================================

/** Minimum terminal dimensions */
export const MIN_WIDTH = 80;
export const MIN_HEIGHT = 24;

/** Status bar height (1 line) */
export const STATUS_BAR_HEIGHT = 1;

/** Help bar height (1 line) */
export const HELP_BAR_HEIGHT = 1;

/** Default sidebar width ratio */
export const SIDEBAR_WIDTH_RATIO = 0.25;

/** Minimum sidebar width in columns */
export const SIDEBAR_MIN_WIDTH = 20;

/** Maximum sidebar width in columns */
export const SIDEBAR_MAX_WIDTH = 60;

/** Bottom panel height ratio when visible */
export const BOTTOM_PANEL_RATIO = 0.3;

/** Minimum bottom panel height */
export const BOTTOM_PANEL_MIN_HEIGHT = 6;

/** Maximum bottom panel height */
export const BOTTOM_PANEL_MAX_HEIGHT = 20;

// =============================================================================
// Pane Geometry
// =============================================================================

export interface PaneGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutGeometry {
  /** Full terminal dimensions */
  terminal: { width: number; height: number };

  /** Sidebar (explorer/search/ingest) */
  sidebar: PaneGeometry;

  /** Main editor area */
  editor: PaneGeometry;

  /** Bottom panel (output/problems/progress) */
  bottomPanel: PaneGeometry;

  /** Status bar */
  statusBar: PaneGeometry;

  /** Help bar */
  helpBar: PaneGeometry;

  /** Whether sidebar is visible */
  sidebarVisible: boolean;

  /** Whether bottom panel is visible */
  bottomPanelVisible: boolean;
}

// =============================================================================
// Layout Calculation
// =============================================================================

/**
 * Calculate layout geometry from terminal size and visibility flags
 */
export function calculateLayout(
  termWidth: number,
  termHeight: number,
  sidebarVisible: boolean,
  bottomPanelVisible: boolean,
): LayoutGeometry {
  // Clamp to minimum
  const width = Math.max(termWidth, MIN_WIDTH);
  const height = Math.max(termHeight, MIN_HEIGHT);

  // Fixed chrome heights
  const chromeHeight = STATUS_BAR_HEIGHT + HELP_BAR_HEIGHT;
  const contentHeight = height - chromeHeight;

  // Bottom panel sizing
  let bottomPanelHeight = 0;
  if (bottomPanelVisible) {
    bottomPanelHeight = Math.min(
      BOTTOM_PANEL_MAX_HEIGHT,
      Math.max(BOTTOM_PANEL_MIN_HEIGHT, Math.floor(contentHeight * BOTTOM_PANEL_RATIO)),
    );
  }

  // Main content area (editor + sidebar)
  const mainHeight = contentHeight - bottomPanelHeight;

  // Sidebar sizing
  let sidebarWidth = 0;
  if (sidebarVisible) {
    sidebarWidth = Math.min(
      SIDEBAR_MAX_WIDTH,
      Math.max(SIDEBAR_MIN_WIDTH, Math.floor(width * SIDEBAR_WIDTH_RATIO)),
    );
  }

  // Editor takes remaining width
  const editorWidth = width - sidebarWidth;

  return {
    terminal: { width, height },
    sidebarVisible,
    bottomPanelVisible,

    sidebar: {
      x: 0,
      y: 0,
      width: sidebarWidth,
      height: mainHeight,
    },

    editor: {
      x: sidebarWidth,
      y: 0,
      width: editorWidth,
      height: mainHeight,
    },

    bottomPanel: {
      x: 0,
      y: mainHeight,
      width,
      height: bottomPanelHeight,
    },

    statusBar: {
      x: 0,
      y: mainHeight + bottomPanelHeight,
      width,
      height: STATUS_BAR_HEIGHT,
    },

    helpBar: {
      x: 0,
      y: mainHeight + bottomPanelHeight + STATUS_BAR_HEIGHT,
      width,
      height: HELP_BAR_HEIGHT,
    },
  };
}

/**
 * Check if terminal meets minimum size requirements
 */
export function isTerminalLargeEnough(width: number, height: number): boolean {
  return width >= MIN_WIDTH && height >= MIN_HEIGHT;
}
