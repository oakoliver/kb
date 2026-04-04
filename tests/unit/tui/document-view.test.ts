/**
 * Unit tests for document view helpers
 * Tests: T018 [US1]
 */

import { describe, test, expect } from 'bun:test';
import {
  renderExplorer,
  getVisibleItems,
  moveSelectionDown,
  moveSelectionUp,
  toggleExpand,
  getSelectedItem,
} from '../../../src/tui/explorer';
import {
  renderEditor,
  scrollDocument,
  scrollToTop,
  scrollToBottom,
  pageDown,
  pageUp,
} from '../../../src/tui/editor';
import {
  renderStatusBar,
  renderHelpBar,
  getContextualHelp,
  renderPaneTitle,
} from '../../../src/tui/chrome';
import type { ExplorerState, EditorState, OpenDocument, StatusBarState } from '../../../src/tui/state';

// =============================================================================
// Explorer rendering
// =============================================================================

describe('explorer rendering', () => {
  const mockExplorerItems = [
    {
      name: 'concepts',
      path: '/wiki/concepts',
      isDir: true,
      depth: 0,
      expanded: true,
      children: [
        { name: 'Attention Mechanism', path: '/wiki/concepts/attention-mechanism.md', isDir: false, depth: 1, articleType: 'concept' },
        { name: 'Self-Attention', path: '/wiki/concepts/self-attention.md', isDir: false, depth: 1, articleType: 'concept' },
      ],
    },
    {
      name: 'entities',
      path: '/wiki/entities',
      isDir: true,
      depth: 0,
      expanded: true,
      children: [
        { name: 'Transformer', path: '/wiki/entities/transformer.md', isDir: false, depth: 1, articleType: 'entity' },
      ],
    },
  ];

  test('renderExplorer returns non-empty string', () => {
    const state: ExplorerState = {
      items: mockExplorerItems,
      selectedIndex: 0,
      scrollOffset: 0,
    };

    const rendered = renderExplorer(state, 30, 10, true);
    expect(rendered).toBeTruthy();
    expect(typeof rendered).toBe('string');
  });

  test('renderExplorer shows empty message when no items', () => {
    const state: ExplorerState = {
      items: [],
      selectedIndex: 0,
      scrollOffset: 0,
    };

    const rendered = renderExplorer(state, 30, 10, true);
    expect(rendered).toContain('No articles yet');
  });

  test('getVisibleItems flattens expanded dirs', () => {
    const state: ExplorerState = {
      items: mockExplorerItems,
      selectedIndex: 0,
      scrollOffset: 0,
    };

    const visible = getVisibleItems(state);
    // 2 dirs + 2 concept files + 1 entity file = 5
    expect(visible.length).toBe(5);
  });

  test('getVisibleItems hides children of collapsed dirs', () => {
    const items = [
      { ...mockExplorerItems[0], expanded: false },
      mockExplorerItems[1],
    ];
    const state: ExplorerState = {
      items,
      selectedIndex: 0,
      scrollOffset: 0,
    };

    const visible = getVisibleItems(state);
    // 2 dirs + 1 entity file (concepts collapsed) = 3
    expect(visible.length).toBe(3);
  });
});

// =============================================================================
// Editor rendering
// =============================================================================

describe('editor rendering', () => {
  test('renderEditor shows welcome when no document', () => {
    const state: EditorState = {
      document: null,
      history: [],
      historyIndex: -1,
    };

    const rendered = renderEditor(state, 60, 20, true);
    expect(rendered).toContain('KB Studio');
    expect(rendered).toContain('Quick Open');
  });

  test('renderEditor shows document title when open', () => {
    const doc: OpenDocument = {
      path: '/wiki/test.md',
      title: 'Test Document',
      content: '# Test',
      renderedContent: 'Test content line 1\nline 2\nline 3',
      links: [],
      scrollY: 0,
      focusedLinkIndex: -1,
    };

    const state: EditorState = {
      document: doc,
      history: [],
      historyIndex: -1,
    };

    const rendered = renderEditor(state, 60, 20, true);
    expect(rendered).toContain('Test Document');
  });

  test('scrollDocument clamps at zero', () => {
    const doc: OpenDocument = {
      path: '/test.md',
      title: 'Test',
      content: '',
      renderedContent: 'line1\nline2\nline3',
      links: [],
      scrollY: 0,
      focusedLinkIndex: -1,
    };

    const scrolled = scrollDocument(doc, -5, 10);
    expect(scrolled.scrollY).toBe(0);
  });

  test('scrollDocument clamps at max', () => {
    const lines = Array.from({ length: 50 }, (_, i) => `line ${i}`).join('\n');
    const doc: OpenDocument = {
      path: '/test.md',
      title: 'Test',
      content: '',
      renderedContent: lines,
      links: [],
      scrollY: 0,
      focusedLinkIndex: -1,
    };

    const scrolled = scrollDocument(doc, 100, 10);
    expect(scrolled.scrollY).toBe(40); // 50 lines - 10 viewport
  });

  test('scrollToTop resets scroll', () => {
    const doc: OpenDocument = {
      path: '/test.md',
      title: 'Test',
      content: '',
      renderedContent: 'line1\nline2',
      links: [],
      scrollY: 10,
      focusedLinkIndex: 2,
    };

    const top = scrollToTop(doc);
    expect(top.scrollY).toBe(0);
    expect(top.focusedLinkIndex).toBe(-1);
  });

  test('pageDown moves by viewport height', () => {
    const lines = Array.from({ length: 100 }, (_, i) => `line ${i}`).join('\n');
    const doc: OpenDocument = {
      path: '/test.md',
      title: 'Test',
      content: '',
      renderedContent: lines,
      links: [],
      scrollY: 0,
      focusedLinkIndex: -1,
    };

    const paged = pageDown(doc, 20);
    expect(paged.scrollY).toBe(18); // 20 - 2 overlap
  });
});

// =============================================================================
// Chrome rendering
// =============================================================================

describe('chrome rendering', () => {
  test('renderStatusBar includes workspace name', () => {
    const status: StatusBarState = {
      workspaceName: 'my-wiki',
      branch: '',
      articleCount: 5,
      sourceCount: 3,
      activeOperation: null,
      provider: 'anthropic',
      errorCount: 0,
      warningCount: 0,
    };

    const rendered = renderStatusBar(status, 80);
    expect(rendered).toContain('my-wiki');
  });

  test('renderStatusBar shows active operation', () => {
    const status: StatusBarState = {
      workspaceName: 'test',
      branch: '',
      articleCount: 0,
      sourceCount: 0,
      activeOperation: 'Compiling...',
      provider: '',
      errorCount: 0,
      warningCount: 0,
    };

    const rendered = renderStatusBar(status, 80);
    expect(rendered).toContain('Compiling');
  });

  test('getContextualHelp returns explorer bindings', () => {
    const help = getContextualHelp('explorer', 'none', 'explorer', false);
    const keys = help.map((h) => h.key);
    expect(keys).toContain('↑↓');
    expect(keys).toContain('Enter');
  });

  test('getContextualHelp returns editor bindings when doc open', () => {
    const help = getContextualHelp('editor', 'none', 'explorer', true);
    const keys = help.map((h) => h.key);
    expect(keys).toContain('Tab');
    expect(keys).toContain('Enter');
    expect(keys).toContain('Alt+←');
  });

  test('getContextualHelp returns overlay bindings', () => {
    const help = getContextualHelp('editor', 'quickOpen', 'explorer', true);
    const keys = help.map((h) => h.key);
    expect(keys).toContain('Esc');
    expect(keys).toContain('Enter');
  });

  test('renderHelpBar returns a string', () => {
    const bar = renderHelpBar('explorer', 'none', 'explorer', false, 80);
    expect(typeof bar).toBe('string');
    expect(bar.length).toBeGreaterThan(0);
  });

  test('renderPaneTitle includes icon and title', () => {
    const rendered = renderPaneTitle('EXPLORER', '📁', 30, true);
    expect(rendered).toContain('EXPLORER');
  });
});
