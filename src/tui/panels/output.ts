/**
 * Output panel rendering and state management
 * @module tui/panels/output
 */

import type { BottomPanelState, OutputLine } from '../state';
import { theme, colors, icons } from '../theme';

// =============================================================================
// Output Management
// =============================================================================

/**
 * Append a line to the output panel
 */
export function appendOutput(state: BottomPanelState, line: OutputLine): BottomPanelState {
  return {
    ...state,
    output: [...state.output, line],
  };
}

/**
 * Append multiple lines to the output panel
 */
export function appendOutputLines(state: BottomPanelState, lines: OutputLine[]): BottomPanelState {
  return {
    ...state,
    output: [...state.output, ...lines],
  };
}

/**
 * Clear all output
 */
export function clearOutput(state: BottomPanelState): BottomPanelState {
  return {
    ...state,
    output: [],
  };
}

/**
 * Create an info output line
 */
export function infoLine(text: string): OutputLine {
  return { text, timestamp: Date.now(), kind: 'info' };
}

/**
 * Create an error output line
 */
export function errorLine(text: string): OutputLine {
  return { text, timestamp: Date.now(), kind: 'error' };
}

/**
 * Create a success output line
 */
export function successLine(text: string): OutputLine {
  return { text, timestamp: Date.now(), kind: 'success' };
}

/**
 * Create a stream output line (for LLM streaming)
 */
export function streamLine(text: string): OutputLine {
  return { text, timestamp: Date.now(), kind: 'stream' };
}

/**
 * Render output lines for the bottom panel
 */
export function renderOutputPanel(
  lines: OutputLine[],
  width: number,
  height: number,
): string {
  const rendered: string[] = [];
  const visibleLines = lines.slice(-(height));

  for (const line of visibleLines) {
    const style = line.kind === 'error' ? theme.error :
      line.kind === 'success' ? theme.success :
      line.kind === 'stream' ? theme.info :
      theme.muted;
    rendered.push(style.render(line.text));
  }

  while (rendered.length < height) {
    rendered.push('');
  }

  return rendered.slice(0, height).join('\n');
}
