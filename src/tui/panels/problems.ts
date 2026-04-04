/**
 * Problems panel state management and rendering
 * @module tui/panels/problems
 */

import type { BottomPanelState, ProblemItem } from '../state';
import { theme, icons } from '../theme';

// =============================================================================
// State Management
// =============================================================================

/**
 * Set problems list
 */
export function setProblems(state: BottomPanelState, problems: ProblemItem[]): BottomPanelState {
  return {
    ...state,
    problems,
  };
}

/**
 * Clear all problems
 */
export function clearProblems(state: BottomPanelState): BottomPanelState {
  return {
    ...state,
    problems: [],
  };
}

/**
 * Get problem at index
 */
export function getProblemAtIndex(problems: ProblemItem[], index: number): ProblemItem | null {
  return problems[index] ?? null;
}

// =============================================================================
// Rendering
// =============================================================================

/**
 * Render the problems panel content
 */
export function renderProblemsPanel(
  problems: ProblemItem[],
  width: number,
  height: number,
  selectedIndex?: number,
): string {
  const lines: string[] = [];

  if (problems.length === 0) {
    lines.push(theme.success.render(`  ${icons.success} No problems detected`));
  } else {
    // Summary line
    const errors = problems.filter((p) => p.severity === 'error').length;
    const warnings = problems.filter((p) => p.severity === 'warning').length;
    const parts: string[] = [];
    if (errors > 0) parts.push(theme.error.render(`${errors} error${errors !== 1 ? 's' : ''}`));
    if (warnings > 0) parts.push(theme.warning.render(`${warnings} warning${warnings !== 1 ? 's' : ''}`));
    lines.push(`  ${parts.join('  ')}`);
    lines.push('');

    // Problem items
    const maxItems = Math.max(0, height - 2);
    const visibleProblems = problems.slice(0, maxItems);

    for (let i = 0; i < visibleProblems.length; i++) {
      const p = visibleProblems[i];
      const icon = p.severity === 'error' ? icons.error :
        p.severity === 'warning' ? icons.warning : icons.info;
      const style = p.severity === 'error' ? theme.error :
        p.severity === 'warning' ? theme.warning : theme.info;

      const isSelected = selectedIndex === i;
      const prefix = isSelected ? '▸ ' : '  ';
      const pathStr = p.path ? theme.muted.render(` (${p.path}${p.line > 0 ? `:${p.line}` : ''})`) : '';

      lines.push(`${prefix}${style.render(`${icon} ${p.message}`)}${pathStr}`);
    }

    if (problems.length > maxItems) {
      lines.push(theme.muted.render(`  ... and ${problems.length - maxItems} more`));
    }
  }

  while (lines.length < height) {
    lines.push('');
  }

  return lines.slice(0, height).join('\n');
}
