/**
 * Ingest sidebar view: source input, queue rendering, and state management
 * @module tui/ingest
 */

import type { IngestState, IngestQueueItem } from './state';
import { theme, colors, icons } from './theme';
import { newStyle } from '@oakoliver/lipgloss';

// =============================================================================
// State Management (pure transforms)
// =============================================================================

/**
 * Append a character to the ingest source input
 */
export function appendToIngestSource(state: IngestState, char: string): IngestState {
  return { ...state, source: state.source + char };
}

/**
 * Remove the last character from the ingest source input
 */
export function backspaceIngestSource(state: IngestState): IngestState {
  return { ...state, source: state.source.slice(0, -1) };
}

/**
 * Clear the ingest source input
 */
export function clearIngestSource(state: IngestState): IngestState {
  return { ...state, source: '' };
}

/**
 * Set the ingest source input value
 */
export function setIngestSource(state: IngestState, source: string): IngestState {
  return { ...state, source };
}

/**
 * Add a source to the ingest queue
 */
export function addToQueue(state: IngestState, source: string): IngestState {
  return {
    ...state,
    source: '',
    queue: [
      ...state.queue,
      { source, status: 'pending' },
    ],
  };
}

/**
 * Update a queue item's status
 */
export function updateQueueItem(
  state: IngestState,
  source: string,
  status: IngestQueueItem['status'],
  error?: string,
): IngestState {
  return {
    ...state,
    queue: state.queue.map((item) =>
      item.source === source
        ? { ...item, status, error }
        : item,
    ),
  };
}

/**
 * Set the ingesting flag
 */
export function setIngesting(state: IngestState, isIngesting: boolean): IngestState {
  return { ...state, isIngesting };
}

/**
 * Clear completed and errored items from the queue
 */
export function clearCompletedQueue(state: IngestState): IngestState {
  return {
    ...state,
    queue: state.queue.filter((item) => item.status === 'pending' || item.status === 'ingesting'),
  };
}

// =============================================================================
// Rendering
// =============================================================================

/**
 * Render the ingest sidebar view
 */
export function renderIngestView(
  state: IngestState,
  width: number,
  height: number,
  isFocused: boolean,
): string {
  const lines: string[] = [];
  const contentWidth = Math.max(1, width);

  // Input line
  const inputPrefix = isFocused
    ? theme.paneTitleFocused.render(`${icons.ingest} `)
    : theme.muted.render(`${icons.ingest} `);

  const cursor = isFocused ? theme.paneTitleFocused.render('│') : '';
  const inputText = state.source || '';
  const placeholder = !inputText
    ? theme.muted.render('URL, file path, or git repo...')
    : theme.title.render(inputText);

  lines.push(`${inputPrefix}${placeholder}${cursor}`);

  // Help hint
  if (isFocused && !state.source) {
    lines.push(theme.muted.render('  Enter to submit, Esc to cancel'));
  } else if (isFocused && state.source) {
    lines.push(theme.muted.render('  Enter to ingest'));
  } else {
    lines.push('');
  }

  // Separator
  lines.push(theme.muted.render('─'.repeat(Math.min(contentWidth, 40))));

  // Queue title
  if (state.queue.length > 0) {
    const doneCount = state.queue.filter((i) => i.status === 'done').length;
    const errorCount = state.queue.filter((i) => i.status === 'error').length;
    const total = state.queue.length;

    let statusText = `${doneCount}/${total}`;
    if (errorCount > 0) {
      statusText += theme.error.render(` (${errorCount} failed)`);
    }

    lines.push(theme.muted.render(`  Queue: ${statusText}`));
    lines.push('');
  } else {
    lines.push(theme.muted.render('  No sources queued'));
    lines.push('');
  }

  // Queue items
  const maxQueueLines = Math.max(0, height - lines.length);
  const queueItems = state.queue.slice(-maxQueueLines);

  for (const item of queueItems) {
    const line = renderQueueItem(item, contentWidth - 2);
    lines.push(`  ${line}`);
  }

  // Pad to height
  while (lines.length < height) {
    lines.push('');
  }

  return lines.slice(0, height).join('\n');
}

/**
 * Render a single queue item
 */
function renderQueueItem(item: IngestQueueItem, maxWidth: number): string {
  const source = truncateSource(item.source, Math.max(10, maxWidth - 4));

  switch (item.status) {
    case 'pending':
      return theme.muted.render(`${icons.pending} ${source}`);
    case 'ingesting':
      return theme.info.render(`${icons.spinner} ${source}`);
    case 'done':
      return theme.success.render(`${icons.check} ${source}`);
    case 'error':
      return theme.error.render(`${icons.error} ${source}`) +
        (item.error ? theme.muted.render(` - ${item.error}`) : '');
  }
}

/**
 * Truncate a source string for display
 */
function truncateSource(source: string, maxWidth: number): string {
  if (source.length <= maxWidth) return source;
  return source.slice(0, maxWidth - 3) + '...';
}
