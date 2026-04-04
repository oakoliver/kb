/**
 * Unit tests for palette state and filtering
 * Tests: T028 [US2]
 */

import { describe, test, expect } from 'bun:test';
import {
  createQuickOpenState,
  createCommandPaletteState,
  updatePaletteQuery,
  appendToPaletteQuery,
  backspacePaletteQuery,
  paletteSelectUp,
  paletteSelectDown,
  getSelectedPaletteItem,
  articlePathsToPaletteItems,
  renderPalette,
} from '../../../src/tui/palette';
import { commandsToPaletteItems, filterPaletteItems, getAllCommands } from '../../../src/tui/commands';
import type { PaletteItem } from '../../../src/tui/state';

describe('palette state', () => {
  const mockItems: PaletteItem[] = [
    { id: '/wiki/concepts/attention.md', label: 'Attention Mechanism', description: 'concepts' },
    { id: '/wiki/concepts/self-attention.md', label: 'Self-Attention', description: 'concepts' },
    { id: '/wiki/entities/transformer.md', label: 'Transformer', description: 'entities' },
    { id: '/wiki/entities/bert.md', label: 'BERT', description: 'entities' },
    { id: '/wiki/syntheses/nlp.md', label: 'Evolution of NLP', description: 'syntheses' },
  ];

  test('createQuickOpenState initializes with all items visible', () => {
    const state = createQuickOpenState(mockItems);
    expect(state.query).toBe('');
    expect(state.items.length).toBe(5);
    expect(state.filteredItems.length).toBe(5);
    expect(state.selectedIndex).toBe(0);
  });

  test('createCommandPaletteState initializes with all commands', () => {
    const state = createCommandPaletteState();
    const allCommands = getAllCommands();
    expect(state.items.length).toBe(allCommands.length);
    expect(state.filteredItems.length).toBe(allCommands.length);
  });

  test('updatePaletteQuery filters items', () => {
    const state = createQuickOpenState(mockItems);
    const filtered = updatePaletteQuery(state, 'attention');
    expect(filtered.query).toBe('attention');
    expect(filtered.filteredItems.length).toBe(2); // Attention Mechanism + Self-Attention
    expect(filtered.selectedIndex).toBe(0); // Reset on filter
  });

  test('updatePaletteQuery with empty string shows all', () => {
    const state = createQuickOpenState(mockItems);
    const updated = updatePaletteQuery(state, 'att');
    const restored = updatePaletteQuery(updated, '');
    expect(restored.filteredItems.length).toBe(5);
  });

  test('appendToPaletteQuery adds character and refilters', () => {
    const state = createQuickOpenState(mockItems);
    const s1 = appendToPaletteQuery(state, 'b');
    expect(s1.query).toBe('b');
    const s2 = appendToPaletteQuery(s1, 'e');
    expect(s2.query).toBe('be');
    expect(s2.filteredItems.length).toBe(1); // BERT
  });

  test('backspacePaletteQuery removes last character', () => {
    const state = createQuickOpenState(mockItems);
    const typed = appendToPaletteQuery(state, 't');
    const deleted = backspacePaletteQuery(typed);
    expect(deleted.query).toBe('');
    expect(deleted.filteredItems.length).toBe(5);
  });

  test('backspacePaletteQuery on empty query is a no-op', () => {
    const state = createQuickOpenState(mockItems);
    const result = backspacePaletteQuery(state);
    expect(result.query).toBe('');
    expect(result.filteredItems.length).toBe(5);
  });

  test('paletteSelectDown moves selection', () => {
    const state = createQuickOpenState(mockItems);
    const down = paletteSelectDown(state);
    expect(down.selectedIndex).toBe(1);
    const down2 = paletteSelectDown(down);
    expect(down2.selectedIndex).toBe(2);
  });

  test('paletteSelectDown clamps at last item', () => {
    const state = createQuickOpenState(mockItems);
    let s = state;
    for (let i = 0; i < 20; i++) s = paletteSelectDown(s);
    expect(s.selectedIndex).toBe(mockItems.length - 1);
  });

  test('paletteSelectUp moves selection', () => {
    const state = createQuickOpenState(mockItems);
    const moved = paletteSelectDown(paletteSelectDown(state));
    const up = paletteSelectUp(moved);
    expect(up.selectedIndex).toBe(1);
  });

  test('paletteSelectUp clamps at 0', () => {
    const state = createQuickOpenState(mockItems);
    const up = paletteSelectUp(state);
    expect(up.selectedIndex).toBe(0);
  });

  test('getSelectedPaletteItem returns current selection', () => {
    const state = createQuickOpenState(mockItems);
    const item = getSelectedPaletteItem(state);
    expect(item).toBeTruthy();
    expect(item!.id).toBe(mockItems[0].id);
  });

  test('getSelectedPaletteItem returns null for empty list', () => {
    const state = createQuickOpenState([]);
    const item = getSelectedPaletteItem(state);
    expect(item).toBeNull();
  });
});

describe('palette item conversion', () => {
  test('articlePathsToPaletteItems converts paths correctly', () => {
    const paths = [
      '/wiki/concepts/attention-mechanism.md',
      '/wiki/entities/transformer.md',
    ];
    const items = articlePathsToPaletteItems(paths, '/wiki');
    expect(items.length).toBe(2);
    expect(items[0].label).toBe('Attention Mechanism');
    expect(items[0].description).toBe('concepts');
    expect(items[1].label).toBe('Transformer');
    expect(items[1].description).toBe('entities');
  });

  test('commandsToPaletteItems includes all commands', () => {
    const items = commandsToPaletteItems();
    expect(items.length).toBe(getAllCommands().length);
    expect(items.length).toBeGreaterThan(0);

    // Check structure
    for (const item of items) {
      expect(item.id).toBeTruthy();
      expect(item.label).toBeTruthy();
    }
  });

  test('filterPaletteItems matches on label', () => {
    const items = commandsToPaletteItems();
    const filtered = filterPaletteItems(items, 'compile');
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered[0].label.toLowerCase()).toContain('compile');
  });

  test('filterPaletteItems matches on description', () => {
    const items = commandsToPaletteItems();
    const filtered = filterPaletteItems(items, 'sidebar');
    expect(filtered.length).toBeGreaterThan(0);
  });
});

describe('palette rendering', () => {
  test('renderPalette returns non-empty string for quickOpen', () => {
    const state = createQuickOpenState([
      { id: '1', label: 'Test', description: 'desc' },
    ]);
    const rendered = renderPalette(state, 'quickOpen', 80, 24);
    expect(typeof rendered).toBe('string');
    expect(rendered.length).toBeGreaterThan(0);
  });

  test('renderPalette returns non-empty string for commandPalette', () => {
    const state = createCommandPaletteState();
    const rendered = renderPalette(state, 'commandPalette', 80, 24);
    expect(typeof rendered).toBe('string');
    expect(rendered.length).toBeGreaterThan(0);
  });

  test('renderPalette shows "No matching items" for empty results', () => {
    const state = createQuickOpenState([]);
    const rendered = renderPalette(state, 'quickOpen', 80, 24);
    expect(rendered).toContain('No matching');
  });
});
