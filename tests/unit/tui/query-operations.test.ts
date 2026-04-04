/**
 * Unit tests for query operations, editor streaming, save flow, and output panel
 */

import { describe, test, expect } from 'bun:test';
import type { OpenDocument, LinkPosition } from '../../../src/tui/state';
import {
  generateSlug,
  buildQueryOutputLines,
} from '../../../src/tui/operations/query';
import {
  createQueryDocument,
  appendQueryStream,
  finalizeQueryDocument,
} from '../../../src/tui/editor';
import {
  createSaveQueryState,
  setSaving,
  setSaved,
  setSaveError,
  buildSaveOutputLines,
} from '../../../src/tui/forms/save-query';
import {
  appendOutput,
  appendOutputLines,
  clearOutput,
  infoLine,
  errorLine,
  successLine,
  streamLine,
  renderOutputPanel,
} from '../../../src/tui/panels/output';
import type { EditorState, BottomPanelState } from '../../../src/tui/state';

// =============================================================================
// Helpers
// =============================================================================

function makeEditorState(): EditorState {
  return {
    document: null,
    history: [],
    historyIndex: -1,
  };
}

function makeBottomPanelState(): BottomPanelState {
  return {
    visible: false,
    activeTab: 'output',
    output: [],
    problems: [],
    selectedProblemIndex: 0,
    progressPercent: 0,
    progressLabel: '',
  };
}

// =============================================================================
// generateSlug Tests
// =============================================================================

describe('generateSlug', () => {
  test('generates slug from question', () => {
    const slug = generateSlug('How does attention work?');
    expect(slug).toBe('how-does-attention-work');
  });

  test('removes special characters', () => {
    const slug = generateSlug("What's the time complexity O(n^2)?");
    expect(slug).toBe('what-s-the-time-complexity-o-n-2');
  });

  test('truncates to 50 characters', () => {
    const long = 'A'.repeat(100);
    const slug = generateSlug(long);
    expect(slug.length).toBeLessThanOrEqual(50);
  });

  test('handles empty string', () => {
    const slug = generateSlug('');
    expect(slug).toBe('');
  });
});

// =============================================================================
// buildQueryOutputLines Tests
// =============================================================================

describe('buildQueryOutputLines', () => {
  test('includes question', () => {
    const lines = buildQueryOutputLines('What is attention?', ['wiki/a.md']);
    expect(lines.some(l => l.text.includes('What is attention?'))).toBe(true);
  });

  test('includes sources', () => {
    const lines = buildQueryOutputLines('q', ['wiki/concepts/a.md', 'wiki/entities/b.md']);
    expect(lines.some(l => l.text.includes('wiki/concepts/a.md'))).toBe(true);
  });

  test('includes saved path when provided', () => {
    const lines = buildQueryOutputLines('q', [], 'queries/test.md');
    expect(lines.some(l => l.text.includes('queries/test.md'))).toBe(true);
    expect(lines.some(l => l.kind === 'success')).toBe(true);
  });

  test('omits saved path when not provided', () => {
    const lines = buildQueryOutputLines('q', []);
    expect(lines.every(l => l.kind !== 'success')).toBe(true);
  });
});

// =============================================================================
// Editor Transient Query Document Tests
// =============================================================================

describe('createQueryDocument', () => {
  test('creates transient document with question as title', () => {
    const state = makeEditorState();
    const result = createQueryDocument(state, 'What is attention?');
    expect(result.document).not.toBeNull();
    expect(result.document!.path).toBe('__query__');
    expect(result.document!.title).toBe('Query: What is attention?');
    expect(result.document!.content).toBe('');
    expect(result.document!.renderedContent).toBe('');
    expect(result.document!.scrollY).toBe(0);
  });
});

describe('appendQueryStream', () => {
  test('appends chunk to content', () => {
    const doc = {
      path: '__query__',
      title: 'Query: test',
      content: 'Hello ',
      renderedContent: 'Hello ',
      links: [],
      scrollY: 0,
      focusedLinkIndex: -1,
    };
    const result = appendQueryStream(doc, 'World');
    expect(result.content).toBe('Hello World');
    expect(result.renderedContent).toBe('Hello World');
  });

  test('accumulates multiple chunks', () => {
    let doc: OpenDocument = {
      path: '__query__',
      title: 'Query: test',
      content: '',
      renderedContent: '',
      links: [] as LinkPosition[],
      scrollY: 0,
      focusedLinkIndex: -1,
    };
    doc = appendQueryStream(doc, 'A');
    doc = appendQueryStream(doc, 'B');
    doc = appendQueryStream(doc, 'C');
    expect(doc.content).toBe('ABC');
  });
});

describe('finalizeQueryDocument', () => {
  test('applies render function and extracts links', () => {
    const doc = {
      path: '__query__',
      title: 'Query: test',
      content: 'See [[Attention Mechanism]] for details',
      renderedContent: '',
      links: [],
      scrollY: 0,
      focusedLinkIndex: -1,
    };

    const result = finalizeQueryDocument(
      doc,
      (content) => `RENDERED: ${content}`,
      (content) => {
        if (content.includes('[[Attention Mechanism]]')) {
          return [{
            target: 'Attention Mechanism',
            row: 0,
            colStart: 4,
            colEnd: 27,
            displayText: 'Attention Mechanism',
          }];
        }
        return [];
      },
    );

    expect(result.renderedContent).toBe('RENDERED: See [[Attention Mechanism]] for details');
    expect(result.links).toHaveLength(1);
    expect(result.links[0].target).toBe('Attention Mechanism');
  });
});

// =============================================================================
// Save Query State Tests
// =============================================================================

describe('save query state management', () => {
  test('createSaveQueryState initializes correctly', () => {
    const state = createSaveQueryState('q', 'answer', ['s1']);
    expect(state.question).toBe('q');
    expect(state.answer).toBe('answer');
    expect(state.sources).toEqual(['s1']);
    expect(state.isSaving).toBe(false);
    expect(state.savedPath).toBeNull();
    expect(state.error).toBeNull();
  });

  test('setSaving marks as saving', () => {
    const state = createSaveQueryState('q', 'a', []);
    const result = setSaving(state);
    expect(result.isSaving).toBe(true);
  });

  test('setSaved stores path', () => {
    const state = createSaveQueryState('q', 'a', []);
    const result = setSaved(state, 'queries/test.md');
    expect(result.savedPath).toBe('queries/test.md');
    expect(result.isSaving).toBe(false);
  });

  test('setSaveError stores error', () => {
    const state = createSaveQueryState('q', 'a', []);
    const result = setSaveError(state, 'disk full');
    expect(result.error).toBe('disk full');
    expect(result.isSaving).toBe(false);
  });

  test('buildSaveOutputLines includes success on save', () => {
    const state = setSaved(createSaveQueryState('q', 'a', []), 'queries/t.md');
    const lines = buildSaveOutputLines(state);
    expect(lines.some(l => l.kind === 'success')).toBe(true);
    expect(lines.some(l => l.text.includes('queries/t.md'))).toBe(true);
  });

  test('buildSaveOutputLines includes error on failure', () => {
    const state = setSaveError(createSaveQueryState('q', 'a', []), 'failed');
    const lines = buildSaveOutputLines(state);
    expect(lines.some(l => l.kind === 'error')).toBe(true);
  });
});

// =============================================================================
// Output Panel Tests
// =============================================================================

describe('output panel operations', () => {
  test('appendOutput adds a line', () => {
    const state = makeBottomPanelState();
    const result = appendOutput(state, infoLine('test'));
    expect(result.output).toHaveLength(1);
    expect(result.output[0].text).toBe('test');
    expect(result.output[0].kind).toBe('info');
  });

  test('appendOutputLines adds multiple lines', () => {
    const state = makeBottomPanelState();
    const result = appendOutputLines(state, [infoLine('a'), errorLine('b')]);
    expect(result.output).toHaveLength(2);
    expect(result.output[0].kind).toBe('info');
    expect(result.output[1].kind).toBe('error');
  });

  test('clearOutput removes all lines', () => {
    let state = makeBottomPanelState();
    state = appendOutput(state, infoLine('a'));
    state = appendOutput(state, infoLine('b'));
    state = clearOutput(state);
    expect(state.output).toHaveLength(0);
  });

  test('line factory functions create correct kinds', () => {
    expect(infoLine('i').kind).toBe('info');
    expect(errorLine('e').kind).toBe('error');
    expect(successLine('s').kind).toBe('success');
    expect(streamLine('st').kind).toBe('stream');
  });

  test('line factory functions include timestamps', () => {
    const before = Date.now();
    const line = infoLine('test');
    const after = Date.now();
    expect(line.timestamp).toBeGreaterThanOrEqual(before);
    expect(line.timestamp).toBeLessThanOrEqual(after);
  });
});

describe('renderOutputPanel', () => {
  test('renders output lines', () => {
    const lines = [infoLine('Hello'), successLine('Done')];
    const result = renderOutputPanel(lines, 40, 5);
    expect(result).toContain('Hello');
    expect(result).toContain('Done');
  });

  test('pads to fill height', () => {
    const result = renderOutputPanel([], 40, 5);
    const lineCount = result.split('\n').length;
    expect(lineCount).toBe(5);
  });

  test('shows most recent lines when overflowing', () => {
    const lines = Array.from({ length: 20 }, (_, i) => infoLine(`Line ${i}`));
    const result = renderOutputPanel(lines, 40, 5);
    expect(result).toContain('Line 19');
    expect(result).toContain('Line 15');
    expect(result).not.toContain('Line 0');
  });
});
