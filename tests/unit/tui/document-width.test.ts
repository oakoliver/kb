import { describe, test, expect } from 'bun:test';
import { stringWidth } from '@oakoliver/lipgloss';
import { renderDocumentContent } from '../../../src/tui/document';
import { renderEditor } from '../../../src/tui/editor';
import type { EditorState } from '../../../src/tui/state';

const longParagraph =
  'Autolyse is a rest period after mixing only flour and water, before adding salt and starter, which lets the flour hydrate fully and gluten start to form on its own.';

describe('Studio document width', () => {
  test('renders prose wrapped to the editor width', () => {
    const rendered = renderDocumentContent(`# Autolyse\n\n${longParagraph}\n`, 40);
    for (const line of rendered.split('\n')) {
      expect(stringWidth(line)).toBeLessThanOrEqual(40);
    }
    expect(rendered).toContain('Autolyse');
  });

  test('never draws a line wider than the pane, even an unbreakable one', () => {
    const state = {
      document: {
        path: '/wiki/concepts/autolyse.md',
        title: 'Autolyse',
        content: '',
        renderedContent: `${'x'.repeat(120)}\n${longParagraph}`,
        links: [],
        scrollY: 0,
        focusedLinkIndex: -1,
      },
      history: [],
      historyIndex: -1,
    } as unknown as EditorState;
    const out = renderEditor(state, 50, 10, true);
    for (const line of out.split('\n')) {
      expect(stringWidth(line)).toBeLessThanOrEqual(50);
    }
  });
});
