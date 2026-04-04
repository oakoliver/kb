/**
 * Save-query prompt form using @oakoliver/huh
 * Note: In the TUI context, we use a simpler approach since the full form
 * would take over the screen. Instead we expose helpers for save confirmation.
 * @module tui/forms/save-query
 */

import type { OutputLine } from '../state';

// =============================================================================
// Types
// =============================================================================

export interface SaveQueryState {
  question: string;
  answer: string;
  sources: string[];
  isSaving: boolean;
  savedPath: string | null;
  error: string | null;
}

// =============================================================================
// State Management
// =============================================================================

/**
 * Create initial save-query state
 */
export function createSaveQueryState(
  question: string,
  answer: string,
  sources: string[],
): SaveQueryState {
  return {
    question,
    answer,
    sources,
    isSaving: false,
    savedPath: null,
    error: null,
  };
}

/**
 * Mark save as in-progress
 */
export function setSaving(state: SaveQueryState): SaveQueryState {
  return { ...state, isSaving: true, error: null };
}

/**
 * Mark save as complete
 */
export function setSaved(state: SaveQueryState, savedPath: string): SaveQueryState {
  return {
    ...state,
    isSaving: false,
    savedPath,
    error: null,
  };
}

/**
 * Mark save as failed
 */
export function setSaveError(state: SaveQueryState, error: string): SaveQueryState {
  return {
    ...state,
    isSaving: false,
    error,
  };
}

/**
 * Build output lines for save result
 */
export function buildSaveOutputLines(state: SaveQueryState): OutputLine[] {
  const now = Date.now();
  const lines: OutputLine[] = [];

  if (state.savedPath) {
    lines.push({ text: `Query saved to: ${state.savedPath}`, timestamp: now, kind: 'success' });
  }

  if (state.error) {
    lines.push({ text: `Save failed: ${state.error}`, timestamp: now, kind: 'error' });
  }

  return lines;
}
