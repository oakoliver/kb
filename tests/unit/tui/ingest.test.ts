/**
 * Unit tests for ingest TUI operations, view rendering, queue management, and file picker
 */

import { describe, test, expect } from 'bun:test';
import type { IngestState, IngestQueueItem } from '../../../src/tui/state';

// =============================================================================
// Ingest State Management
// =============================================================================

import {
  appendToIngestSource,
  backspaceIngestSource,
  clearIngestSource,
  setIngestSource,
  addToQueue,
  updateQueueItem,
  setIngesting,
  clearCompletedQueue,
  renderIngestView,
} from '../../../src/tui/ingest';

describe('ingest state management', () => {
  const emptyState: IngestState = {
    source: '',
    queue: [],
    isIngesting: false,
  };

  test('appendToIngestSource appends character', () => {
    const result = appendToIngestSource(emptyState, 'h');
    expect(result.source).toBe('h');
    const result2 = appendToIngestSource(result, 'i');
    expect(result2.source).toBe('hi');
  });

  test('backspaceIngestSource removes last character', () => {
    const state = { ...emptyState, source: 'hello' };
    const result = backspaceIngestSource(state);
    expect(result.source).toBe('hell');
  });

  test('backspaceIngestSource on empty does nothing', () => {
    const result = backspaceIngestSource(emptyState);
    expect(result.source).toBe('');
  });

  test('clearIngestSource clears the input', () => {
    const state = { ...emptyState, source: 'https://example.com' };
    const result = clearIngestSource(state);
    expect(result.source).toBe('');
  });

  test('setIngestSource sets the value', () => {
    const result = setIngestSource(emptyState, 'https://arxiv.org');
    expect(result.source).toBe('https://arxiv.org');
  });

  test('addToQueue adds item and clears source', () => {
    const state = { ...emptyState, source: 'https://example.com' };
    const result = addToQueue(state, 'https://example.com');
    expect(result.source).toBe('');
    expect(result.queue).toHaveLength(1);
    expect(result.queue[0].source).toBe('https://example.com');
    expect(result.queue[0].status).toBe('pending');
  });

  test('addToQueue appends to existing queue', () => {
    const state: IngestState = {
      ...emptyState,
      queue: [{ source: 'first.md', status: 'done' }],
    };
    const result = addToQueue(state, 'second.md');
    expect(result.queue).toHaveLength(2);
  });

  test('updateQueueItem updates status', () => {
    const state: IngestState = {
      ...emptyState,
      queue: [
        { source: 'a.md', status: 'pending' },
        { source: 'b.md', status: 'pending' },
      ],
    };
    const result = updateQueueItem(state, 'a.md', 'done');
    expect(result.queue[0].status).toBe('done');
    expect(result.queue[1].status).toBe('pending');
  });

  test('updateQueueItem sets error', () => {
    const state: IngestState = {
      ...emptyState,
      queue: [{ source: 'bad.md', status: 'ingesting' }],
    };
    const result = updateQueueItem(state, 'bad.md', 'error', 'File not found');
    expect(result.queue[0].status).toBe('error');
    expect(result.queue[0].error).toBe('File not found');
  });

  test('setIngesting toggles flag', () => {
    const result = setIngesting(emptyState, true);
    expect(result.isIngesting).toBe(true);
    const result2 = setIngesting(result, false);
    expect(result2.isIngesting).toBe(false);
  });

  test('clearCompletedQueue removes done and error items', () => {
    const state: IngestState = {
      ...emptyState,
      queue: [
        { source: 'a.md', status: 'done' },
        { source: 'b.md', status: 'pending' },
        { source: 'c.md', status: 'error', error: 'oops' },
        { source: 'd.md', status: 'ingesting' },
      ],
    };
    const result = clearCompletedQueue(state);
    expect(result.queue).toHaveLength(2);
    expect(result.queue[0].source).toBe('b.md');
    expect(result.queue[1].source).toBe('d.md');
  });
});

// =============================================================================
// Ingest View Rendering
// =============================================================================

describe('ingest view rendering', () => {
  const baseState: IngestState = {
    source: '',
    queue: [],
    isIngesting: false,
  };

  test('renders empty state with placeholder', () => {
    const view = renderIngestView(baseState, 40, 10, true);
    expect(view).toContain('URL, file path, or git repo');
  });

  test('renders input text when typing', () => {
    const state = { ...baseState, source: 'https://example.com' };
    const view = renderIngestView(state, 40, 10, true);
    expect(view).toContain('https://example.com');
  });

  test('renders queue items', () => {
    const state: IngestState = {
      ...baseState,
      queue: [
        { source: 'a.md', status: 'done' },
        { source: 'b.md', status: 'pending' },
        { source: 'c.md', status: 'error', error: 'oops' },
      ],
    };
    const view = renderIngestView(state, 60, 15, true);
    expect(view).toContain('Queue');
    expect(view).toContain('a.md');
    expect(view).toContain('b.md');
    expect(view).toContain('c.md');
  });

  test('renders no sources queued when empty', () => {
    const view = renderIngestView(baseState, 40, 10, false);
    expect(view).toContain('No sources queued');
  });

  test('renders help hint when focused and empty', () => {
    const view = renderIngestView(baseState, 40, 10, true);
    expect(view).toContain('Enter to submit');
  });

  test('renders ingest hint when focused with source', () => {
    const state = { ...baseState, source: 'test.md' };
    const view = renderIngestView(state, 40, 10, true);
    expect(view).toContain('Enter to ingest');
  });
});

// =============================================================================
// Ingest Operations (pure functions)
// =============================================================================

import {
  detectSourceKind,
  createQueueItem,
  updateQueueItemStatus,
  hasActiveIngests,
  countByStatus,
} from '../../../src/tui/operations/ingest';

describe('detectSourceKind', () => {
  const detectors = {
    isUrl: (s: string) => s.startsWith('http://') || s.startsWith('https://'),
    isPdfUrl: (s: string) => s.endsWith('.pdf'),
    isGitRepo: (s: string) => s.endsWith('.git') || s.includes('github.com'),
    isPdf: (s: string) => s.endsWith('.pdf'),
  };

  test('detects URL', () => {
    expect(detectSourceKind('https://example.com/page', detectors)).toBe('url');
  });

  test('detects git repo URL', () => {
    expect(detectSourceKind('https://github.com/user/repo.git', detectors)).toBe('git');
  });

  test('detects PDF URL', () => {
    expect(detectSourceKind('https://arxiv.org/paper.pdf', detectors)).toBe('pdf');
  });

  test('detects local PDF file', () => {
    expect(detectSourceKind('/path/to/paper.pdf', detectors)).toBe('pdf');
  });

  test('detects local file', () => {
    expect(detectSourceKind('/path/to/notes.md', detectors)).toBe('file');
  });
});

describe('queue management functions', () => {
  test('createQueueItem creates pending item', () => {
    const item = createQueueItem('https://example.com');
    expect(item.source).toBe('https://example.com');
    expect(item.status).toBe('pending');
  });

  test('updateQueueItemStatus updates matching item', () => {
    const queue: IngestQueueItem[] = [
      { source: 'a.md', status: 'pending' },
      { source: 'b.md', status: 'pending' },
    ];
    const result = updateQueueItemStatus(queue, 'a.md', 'done');
    expect(result[0].status).toBe('done');
    expect(result[1].status).toBe('pending');
  });

  test('updateQueueItemStatus sets error', () => {
    const queue: IngestQueueItem[] = [
      { source: 'a.md', status: 'ingesting' },
    ];
    const result = updateQueueItemStatus(queue, 'a.md', 'error', 'Failed');
    expect(result[0].status).toBe('error');
    expect(result[0].error).toBe('Failed');
  });

  test('hasActiveIngests detects pending items', () => {
    expect(hasActiveIngests([{ source: 'a.md', status: 'pending' }])).toBe(true);
    expect(hasActiveIngests([{ source: 'a.md', status: 'ingesting' }])).toBe(true);
    expect(hasActiveIngests([{ source: 'a.md', status: 'done' }])).toBe(false);
    expect(hasActiveIngests([])).toBe(false);
  });

  test('countByStatus counts correctly', () => {
    const queue: IngestQueueItem[] = [
      { source: 'a.md', status: 'done' },
      { source: 'b.md', status: 'done' },
      { source: 'c.md', status: 'pending' },
      { source: 'd.md', status: 'error', error: 'oops' },
      { source: 'e.md', status: 'ingesting' },
    ];
    const counts = countByStatus(queue);
    expect(counts.done).toBe(2);
    expect(counts.pending).toBe(1);
    expect(counts.error).toBe(1);
    expect(counts.ingesting).toBe(1);
  });
});

// =============================================================================
// File Picker
// =============================================================================

import {
  createFilePickerState,
  filePickerUp,
  filePickerDown,
  filePickerGoUp,
  getSelectedEntry,
  dismissFilePicker,
  isIngestable,
  formatFileSize,
  listDirectory,
} from '../../../src/tui/forms/file-picker';
import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('file picker state', () => {
  test('createFilePickerState initializes with directory listing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fp-test-'));
    writeFileSync(join(dir, 'test.md'), '# Test');
    mkdirSync(join(dir, 'subdir'));

    const state = createFilePickerState(dir);
    expect(state.visible).toBe(true);
    expect(state.currentDir).toBe(dir);
    expect(state.entries.length).toBeGreaterThan(0);
    expect(state.selectedIndex).toBe(0);
  });

  test('filePickerUp moves selection up', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fp-test-'));
    writeFileSync(join(dir, 'a.md'), 'a');
    writeFileSync(join(dir, 'b.md'), 'b');
    let state = createFilePickerState(dir);
    state = { ...state, selectedIndex: 2 };
    state = filePickerUp(state);
    expect(state.selectedIndex).toBe(1);
  });

  test('filePickerUp clamps at 0', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fp-test-'));
    writeFileSync(join(dir, 'a.md'), 'a');
    let state = createFilePickerState(dir);
    state = filePickerUp(state);
    expect(state.selectedIndex).toBe(0);
  });

  test('filePickerDown moves selection down', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fp-test-'));
    writeFileSync(join(dir, 'a.md'), 'a');
    writeFileSync(join(dir, 'b.md'), 'b');
    let state = createFilePickerState(dir);
    state = filePickerDown(state);
    expect(state.selectedIndex).toBe(1);
  });

  test('filePickerDown clamps at last entry', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fp-test-'));
    writeFileSync(join(dir, 'a.md'), 'a');
    let state = createFilePickerState(dir);
    // Try to go past the end
    for (let i = 0; i < 10; i++) {
      state = filePickerDown(state);
    }
    expect(state.selectedIndex).toBeLessThanOrEqual(state.entries.length - 1);
  });

  test('getSelectedEntry returns current entry', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fp-test-'));
    writeFileSync(join(dir, 'test.md'), '# Test');
    const state = createFilePickerState(dir);
    const entry = getSelectedEntry(state);
    expect(entry).not.toBeNull();
  });

  test('dismissFilePicker hides the picker', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fp-test-'));
    const state = createFilePickerState(dir);
    const dismissed = dismissFilePicker(state);
    expect(dismissed.visible).toBe(false);
  });
});

describe('listDirectory', () => {
  test('lists files and dirs, skipping hidden files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ld-test-'));
    writeFileSync(join(dir, 'visible.md'), 'hi');
    writeFileSync(join(dir, '.hidden'), 'secret');
    mkdirSync(join(dir, 'subdir'));
    mkdirSync(join(dir, '.git'));

    const entries = listDirectory(dir);
    const names = entries.map((e) => e.name);
    expect(names).toContain('visible.md');
    expect(names).toContain('subdir');
    expect(names).not.toContain('.hidden');
    expect(names).not.toContain('.git');
  });

  test('sorts dirs first, then files alphabetically', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ld-test-'));
    writeFileSync(join(dir, 'z-file.txt'), 'z');
    writeFileSync(join(dir, 'a-file.txt'), 'a');
    mkdirSync(join(dir, 'z-dir'));
    mkdirSync(join(dir, 'a-dir'));

    const entries = listDirectory(dir);
    // First entry should be '..' (parent), then dirs, then files
    const nonParent = entries.filter((e) => e.name !== '..');
    const dirIdx = nonParent.findIndex((e) => e.name === 'a-dir');
    const fileIdx = nonParent.findIndex((e) => e.name === 'a-file.txt');
    expect(dirIdx).toBeLessThan(fileIdx);
  });

  test('includes parent directory (..) entry', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ld-test-'));
    const entries = listDirectory(dir);
    const parent = entries.find((e) => e.name === '..');
    expect(parent).toBeDefined();
    expect(parent!.isDir).toBe(true);
  });

  test('returns empty for nonexistent directory', () => {
    const entries = listDirectory('/nonexistent/path');
    expect(entries).toEqual([]);
  });
});

describe('isIngestable', () => {
  test('accepts markdown files', () => {
    expect(isIngestable('notes.md')).toBe(true);
  });

  test('accepts PDF files', () => {
    expect(isIngestable('paper.pdf')).toBe(true);
  });

  test('accepts text files', () => {
    expect(isIngestable('readme.txt')).toBe(true);
  });

  test('accepts HTML files', () => {
    expect(isIngestable('page.html')).toBe(true);
    expect(isIngestable('page.htm')).toBe(true);
  });

  test('rejects unknown extensions', () => {
    expect(isIngestable('image.png')).toBe(false);
    expect(isIngestable('binary.exe')).toBe(false);
  });
});

describe('formatFileSize', () => {
  test('formats bytes', () => {
    expect(formatFileSize(512)).toBe('512B');
  });

  test('formats kilobytes', () => {
    expect(formatFileSize(2048)).toBe('2.0K');
  });

  test('formats megabytes', () => {
    expect(formatFileSize(1536000)).toBe('1.5M');
  });
});
