/**
 * Unit tests for TUI state factories
 */

import { describe, test, expect } from 'bun:test';
import { createInitialState, type StudioState } from '../../../src/tui/state';
import type { WikiPaths } from '../../../src/core/resolver';

const mockPaths: WikiPaths = {
  root: '/test/wiki',
  config: '/test/wiki/.kb',
  configFile: '/test/wiki/.kb/config.json',
  raw: '/test/wiki/raw',
  manifest: '/test/wiki/raw/_manifest.json',
  wiki: '/test/wiki/wiki',
  meta: '/test/wiki/wiki/meta',
  graph: '/test/wiki/wiki/meta/graph.json',
  index: '/test/wiki/wiki/_index.md',
  queries: '/test/wiki/queries',
  instructions: '/test/wiki/.kb/instructions.md',
};

describe('createInitialState', () => {
  test('creates state with correct workspace info', () => {
    const state = createInitialState('/test/wiki', mockPaths);

    expect(state.workspace.root).toBe('/test/wiki');
    expect(state.workspace.name).toBe('wiki');
    expect(state.workspace.paths).toBe(mockPaths);
  });

  test('initializes terminal dimensions to zero', () => {
    const state = createInitialState('/test/wiki', mockPaths);

    expect(state.terminal.width).toBe(0);
    expect(state.terminal.height).toBe(0);
  });

  test('starts with explorer pane active', () => {
    const state = createInitialState('/test/wiki', mockPaths);

    expect(state.activePane).toBe('explorer');
  });

  test('starts with sidebar visible', () => {
    const state = createInitialState('/test/wiki', mockPaths);

    expect(state.sidebarVisible).toBe(true);
  });

  test('starts with no overlay', () => {
    const state = createInitialState('/test/wiki', mockPaths);

    expect(state.overlay).toBe('none');
  });

  test('starts with bottom panel hidden', () => {
    const state = createInitialState('/test/wiki', mockPaths);

    expect(state.bottomPanel.visible).toBe(false);
  });

  test('starts with empty explorer', () => {
    const state = createInitialState('/test/wiki', mockPaths);

    expect(state.explorer.items).toEqual([]);
    expect(state.explorer.selectedIndex).toBe(0);
  });

  test('starts with no document open', () => {
    const state = createInitialState('/test/wiki', mockPaths);

    expect(state.editor.document).toBeNull();
    expect(state.editor.history).toEqual([]);
  });

  test('starts with empty search', () => {
    const state = createInitialState('/test/wiki', mockPaths);

    expect(state.search.query).toBe('');
    expect(state.search.results).toEqual([]);
    expect(state.search.isSearching).toBe(false);
  });

  test('extracts name from path', () => {
    const state = createInitialState('/home/user/my-knowledge-base', mockPaths);

    expect(state.workspace.name).toBe('my-knowledge-base');
  });

  test('initializes all counter values to zero', () => {
    const state = createInitialState('/test/wiki', mockPaths);

    expect(state.workspace.sourceCount).toBe(0);
    expect(state.workspace.articleCount).toBe(0);
    expect(state.workspace.queryCount).toBe(0);
  });
});
