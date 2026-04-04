/**
 * Progress panel rendering for compile and other long-running operations
 * @module tui/panels/progress
 */

import type { BottomPanelState } from '../state';
import { theme, colors } from '../theme';
import { newStyle } from '@oakoliver/lipgloss';

// =============================================================================
// State Management
// =============================================================================

/**
 * Update progress state
 */
export function setProgress(
  state: BottomPanelState,
  percent: number,
  label: string,
): BottomPanelState {
  return {
    ...state,
    progressPercent: Math.max(0, Math.min(1, percent)),
    progressLabel: label,
  };
}

/**
 * Reset progress to zero
 */
export function resetProgress(state: BottomPanelState): BottomPanelState {
  return {
    ...state,
    progressPercent: 0,
    progressLabel: '',
  };
}

// =============================================================================
// Rendering
// =============================================================================

/**
 * Render a text-based progress bar
 */
export function renderProgressBar(
  percent: number,
  width: number,
  label: string,
): string {
  const barWidth = Math.max(10, width - 10); // leave room for percentage
  const filledWidth = Math.round(barWidth * Math.max(0, Math.min(1, percent)));
  const emptyWidth = barWidth - filledWidth;

  const filled = theme.progressBar.render('█'.repeat(filledWidth));
  const empty = theme.muted.render('░'.repeat(emptyWidth));
  const pct = Math.round(percent * 100);
  const pctStr = theme.muted.render(` ${pct}%`);

  const lines: string[] = [];
  if (label) {
    lines.push(theme.progressLabel.render(`  ${label}`));
  }
  lines.push(`  ${filled}${empty}${pctStr}`);

  return lines.join('\n');
}

/**
 * Render the progress panel content
 */
export function renderProgressPanel(
  state: BottomPanelState,
  width: number,
  height: number,
): string {
  const lines: string[] = [];

  if (state.progressPercent > 0 || state.progressLabel) {
    lines.push(renderProgressBar(state.progressPercent, width, state.progressLabel));
  } else {
    lines.push(theme.muted.render('  No active operations'));
  }

  while (lines.length < height) {
    lines.push('');
  }

  return lines.slice(0, height).join('\n');
}
