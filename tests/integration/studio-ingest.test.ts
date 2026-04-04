/**
 * Integration tests for studio ingest functionality
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { StudioApp } from '../../src/tui/app';
import { getWikiPaths } from '../../src/core/resolver';
import { KeyPressMsg, KeyMod, WindowSizeMsg } from '@oakoliver/bubbletea';
import { createStudioFixture } from './helpers/studio';
import type { StudioState } from '../../src/tui/state';

// =============================================================================
// Test Helpers
// =============================================================================

function createApp(fixturePath: string): StudioApp {
  const paths = getWikiPaths(fixturePath);
  return new StudioApp(fixturePath, paths);
}

function key(text: string, mod: number = KeyMod.None, code: number = 0): KeyPressMsg {
  return new KeyPressMsg({ text, mod, code });
}

function ctrlKey(text: string): KeyPressMsg {
  return new KeyPressMsg({ text, mod: KeyMod.Ctrl, code: text.charCodeAt(0) });
}

function ctrlShiftKey(text: string): KeyPressMsg {
  return new KeyPressMsg({ text, mod: KeyMod.Ctrl | KeyMod.Shift, code: text.charCodeAt(0) });
}

function specialKey(name: string): KeyPressMsg {
  const keyMap: Record<string, number> = {
    enter: 13, escape: 27, backspace: 8, tab: 9,
    up: 256, down: 257,
  };
  return new KeyPressMsg({ text: '', mod: KeyMod.None, code: keyMap[name] || 0 });
}

// =============================================================================
// Ctrl+Shift+I Shortcut
// =============================================================================

describe('studio ingest - Ctrl+Shift+I', () => {
  let fixturePath: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const fixture = await createStudioFixture();
    fixturePath = fixture.wikiDir;
    cleanup = fixture.cleanup;
  });

  test('Ctrl+Shift+I switches to ingest sidebar view', () => {
    const app = createApp(fixturePath);

    // Give it a window size first
    app.update(new WindowSizeMsg(120, 40));

    // Press Ctrl+Shift+I
    const msg = new KeyPressMsg({ text: 'i', mod: KeyMod.Ctrl | KeyMod.Shift, code: 73 });
    app.update(msg);

    const state = app.state;
    expect(state.activePane).toBe('ingest');
    expect(state.sidebarVisible).toBe(true);
    expect(state.sidebarView).toBe('ingest');
  });
});

// =============================================================================
// Ingest Input Handling
// =============================================================================

describe('studio ingest - input handling', () => {
  let fixturePath: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const fixture = await createStudioFixture();
    fixturePath = fixture.wikiDir;
    cleanup = fixture.cleanup;
  });

  test('typing characters appends to ingest source', () => {
    const app = createApp(fixturePath);
    app.update(new WindowSizeMsg(120, 40));

    // Switch to ingest pane
    const shiftI = new KeyPressMsg({ text: 'i', mod: KeyMod.Ctrl | KeyMod.Shift, code: 73 });
    app.update(shiftI);

    // Type characters
    app.update(key('h'));
    app.update(key('t'));
    app.update(key('t'));
    app.update(key('p'));

    expect(app.state.ingest.source).toBe('http');
  });

  test('backspace removes last character', () => {
    const app = createApp(fixturePath);
    app.update(new WindowSizeMsg(120, 40));

    // Switch to ingest and type
    const shiftI = new KeyPressMsg({ text: 'i', mod: KeyMod.Ctrl | KeyMod.Shift, code: 73 });
    app.update(shiftI);
    app.update(key('a'));
    app.update(key('b'));

    expect(app.state.ingest.source).toBe('ab');

    // Backspace
    app.update(specialKey('backspace'));
    expect(app.state.ingest.source).toBe('a');
  });

  test('escape clears source when non-empty', () => {
    const app = createApp(fixturePath);
    app.update(new WindowSizeMsg(120, 40));

    const shiftI = new KeyPressMsg({ text: 'i', mod: KeyMod.Ctrl | KeyMod.Shift, code: 73 });
    app.update(shiftI);
    app.update(key('x'));

    expect(app.state.ingest.source).toBe('x');

    // Escape clears
    app.update(specialKey('escape'));
    expect(app.state.ingest.source).toBe('');
  });

  test('escape switches to editor when source is empty', () => {
    const app = createApp(fixturePath);
    app.update(new WindowSizeMsg(120, 40));

    const shiftI = new KeyPressMsg({ text: 'i', mod: KeyMod.Ctrl | KeyMod.Shift, code: 73 });
    app.update(shiftI);
    expect(app.state.activePane).toBe('ingest');

    // Escape with empty source switches to editor
    app.update(specialKey('escape'));
    expect(app.state.activePane).toBe('editor');
  });

  test('tab switches to editor pane', () => {
    const app = createApp(fixturePath);
    app.update(new WindowSizeMsg(120, 40));

    const shiftI = new KeyPressMsg({ text: 'i', mod: KeyMod.Ctrl | KeyMod.Shift, code: 73 });
    app.update(shiftI);

    app.update(specialKey('tab'));
    expect(app.state.activePane).toBe('editor');
  });
});

// =============================================================================
// Ingest Submission
// =============================================================================

describe('studio ingest - submission', () => {
  let fixturePath: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const fixture = await createStudioFixture();
    fixturePath = fixture.wikiDir;
    cleanup = fixture.cleanup;
  });

  test('enter with source adds to queue and activates status', () => {
    const app = createApp(fixturePath);
    app.update(new WindowSizeMsg(120, 40));

    // Switch to ingest and type a source
    const shiftI = new KeyPressMsg({ text: 'i', mod: KeyMod.Ctrl | KeyMod.Shift, code: 73 });
    app.update(shiftI);

    const source = 'test-source.md';
    for (const ch of source) {
      app.update(key(ch));
    }

    expect(app.state.ingest.source).toBe(source);

    // Submit
    app.update(specialKey('enter'));

    // Source should be cleared (moved to queue)
    expect(app.state.ingest.source).toBe('');
    expect(app.state.ingest.queue).toHaveLength(1);
    expect(app.state.ingest.queue[0].source).toBe(source);
    expect(app.state.ingest.queue[0].status).toBe('pending');

    // Status bar should show active operation
    expect(app.state.statusBar.activeOperation).toBe('Ingesting...');

    // Bottom panel should be visible with output
    expect(app.state.bottomPanel.visible).toBe(true);
    expect(app.state.bottomPanel.output.length).toBeGreaterThan(0);
  });

  test('enter with empty source does nothing', () => {
    const app = createApp(fixturePath);
    app.update(new WindowSizeMsg(120, 40));

    const shiftI = new KeyPressMsg({ text: 'i', mod: KeyMod.Ctrl | KeyMod.Shift, code: 73 });
    app.update(shiftI);

    // Submit with empty source
    app.update(specialKey('enter'));

    expect(app.state.ingest.queue).toHaveLength(0);
    expect(app.state.statusBar.activeOperation).toBeNull();
  });
});

// =============================================================================
// View Rendering
// =============================================================================

describe('studio ingest - view rendering', () => {
  let fixturePath: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const fixture = await createStudioFixture();
    fixturePath = fixture.wikiDir;
    cleanup = fixture.cleanup;
  });

  test('view renders ingest pane when sidebar view is ingest', () => {
    const app = createApp(fixturePath);
    app.update(new WindowSizeMsg(120, 40));

    // Switch to ingest
    const shiftI = new KeyPressMsg({ text: 'i', mod: KeyMod.Ctrl | KeyMod.Shift, code: 73 });
    app.update(shiftI);

    const view = app.view();
    expect(view).toContain('INGEST');
  });

  test('contextual help shows ingest bindings', () => {
    const app = createApp(fixturePath);
    app.update(new WindowSizeMsg(120, 40));

    const shiftI = new KeyPressMsg({ text: 'i', mod: KeyMod.Ctrl | KeyMod.Shift, code: 73 });
    app.update(shiftI);

    const view = app.view();
    expect(view).toContain('ingest');
  });
});
