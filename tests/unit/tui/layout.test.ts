/**
 * Unit tests for TUI layout calculations
 */

import { describe, test, expect } from 'bun:test';
import {
  calculateLayout,
  isTerminalLargeEnough,
  MIN_WIDTH,
  MIN_HEIGHT,
  STATUS_BAR_HEIGHT,
  HELP_BAR_HEIGHT,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
} from '../../../src/tui/layout';

describe('calculateLayout', () => {
  test('returns correct dimensions for default layout', () => {
    const layout = calculateLayout(120, 40, true, false);

    expect(layout.terminal.width).toBe(120);
    expect(layout.terminal.height).toBe(40);
    expect(layout.sidebarVisible).toBe(true);
    expect(layout.bottomPanelVisible).toBe(false);
  });

  test('sidebar takes expected width ratio', () => {
    const layout = calculateLayout(120, 40, true, false);

    // Sidebar should be between min and max
    expect(layout.sidebar.width).toBeGreaterThanOrEqual(SIDEBAR_MIN_WIDTH);
    expect(layout.sidebar.width).toBeLessThanOrEqual(SIDEBAR_MAX_WIDTH);
  });

  test('editor fills remaining width when sidebar visible', () => {
    const layout = calculateLayout(120, 40, true, false);

    expect(layout.sidebar.width + layout.editor.width).toBe(120);
  });

  test('editor takes full width when sidebar hidden', () => {
    const layout = calculateLayout(120, 40, false, false);

    expect(layout.sidebar.width).toBe(0);
    expect(layout.editor.width).toBe(120);
  });

  test('status bar and help bar are always present', () => {
    const layout = calculateLayout(120, 40, true, false);

    expect(layout.statusBar.height).toBe(STATUS_BAR_HEIGHT);
    expect(layout.helpBar.height).toBe(HELP_BAR_HEIGHT);
    expect(layout.statusBar.width).toBe(120);
    expect(layout.helpBar.width).toBe(120);
  });

  test('all heights sum to terminal height', () => {
    const layout = calculateLayout(120, 40, true, false);

    const totalHeight =
      layout.editor.height +
      layout.bottomPanel.height +
      layout.statusBar.height +
      layout.helpBar.height;

    expect(totalHeight).toBe(40);
  });

  test('bottom panel takes space from main area', () => {
    const without = calculateLayout(120, 40, true, false);
    const withPanel = calculateLayout(120, 40, true, true);

    expect(withPanel.bottomPanel.height).toBeGreaterThan(0);
    expect(withPanel.editor.height).toBeLessThan(without.editor.height);

    // Total should still equal terminal height
    const total =
      withPanel.editor.height +
      withPanel.bottomPanel.height +
      withPanel.statusBar.height +
      withPanel.helpBar.height;
    expect(total).toBe(40);
  });

  test('clamps to minimum dimensions', () => {
    const layout = calculateLayout(40, 10, true, false);

    expect(layout.terminal.width).toBe(MIN_WIDTH);
    expect(layout.terminal.height).toBe(MIN_HEIGHT);
  });

  test('bottom panel full width', () => {
    const layout = calculateLayout(120, 40, true, true);

    expect(layout.bottomPanel.width).toBe(120);
  });
});

describe('isTerminalLargeEnough', () => {
  test('returns true for sufficient dimensions', () => {
    expect(isTerminalLargeEnough(80, 24)).toBe(true);
    expect(isTerminalLargeEnough(120, 40)).toBe(true);
  });

  test('returns false for insufficient width', () => {
    expect(isTerminalLargeEnough(79, 24)).toBe(false);
  });

  test('returns false for insufficient height', () => {
    expect(isTerminalLargeEnough(80, 23)).toBe(false);
  });

  test('returns false for both insufficient', () => {
    expect(isTerminalLargeEnough(10, 5)).toBe(false);
  });
});
