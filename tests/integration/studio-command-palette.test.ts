/**
 * Integration tests for KB Studio quick open and command palette
 * Tests: T027 [US2]
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { createStudioFixture, STUDIO_FIXTURE_META } from './helpers/studio';
import { StudioApp } from '../../src/tui/app';
import { getWikiPaths } from '../../src/core/resolver';
import { WindowSizeMsg, KeyPressMsg, KeyMod, KeyCode } from '@oakoliver/bubbletea';
import type { StudioState } from '../../src/tui/state';

/**
 * Helper to send a key press to the model
 */
function sendKey(app: StudioApp, key: string, mod: number = KeyMod.None): StudioApp {
  // Parse key string to KeyPressMsg
  let code = key.charCodeAt(0);
  let text = key;
  let keyMod = mod;

  // Handle special keys
  if (key === 'enter') { code = KeyCode.Enter; text = ''; }
  else if (key === 'escape') { code = KeyCode.Escape; text = ''; }
  else if (key === 'up') { code = KeyCode.Up; text = ''; }
  else if (key === 'down') { code = KeyCode.Down; text = ''; }
  else if (key === 'backspace') { code = KeyCode.Backspace; text = ''; }
  else if (key === 'tab') { code = KeyCode.Tab; text = ''; }

  const msg = new KeyPressMsg({ text, mod: keyMod, code });
  const [model] = app.update(msg);
  return model as StudioApp;
}

describe('quick open and command palette', () => {
  let wikiDir: string;
  let cleanup: () => Promise<void>;
  let baseApp: StudioApp;

  beforeAll(async () => {
    const fixture = await createStudioFixture();
    wikiDir = fixture.wikiDir;
    cleanup = fixture.cleanup;

    const paths = getWikiPaths(wikiDir);
    baseApp = new StudioApp(wikiDir, paths);

    // Initialize with window size
    const sizeMsg = new WindowSizeMsg(120, 40);
    const [sized] = baseApp.update(sizeMsg);
    baseApp = sized as StudioApp;

    // Run init to load workspace (execute the cmd)
    const cmd = baseApp.init();
    if (cmd) {
      const msg = await (cmd as () => Promise<any>)();
      const [loaded] = baseApp.update(msg);
      baseApp = loaded as StudioApp;

      // Load explorer items
      const cmd2 = (loaded as StudioApp).update(msg)[1];
      if (cmd2) {
        const msg2 = await (cmd2 as () => Promise<any>)();
        const [withExplorer] = baseApp.update(msg2);
        baseApp = withExplorer as StudioApp;
      }
    }
  });

  afterAll(async () => {
    await cleanup();
  });

  test('Ctrl+P opens quick open overlay', () => {
    let app = baseApp;
    const msg = new KeyPressMsg({ text: 'p', mod: KeyMod.Ctrl, code: 'p'.charCodeAt(0) });
    const [model] = app.update(msg);
    app = model as StudioApp;
    expect(app.state.overlay).toBe('quickOpen');
  });

  test('Ctrl+Shift+P opens command palette', () => {
    let app = baseApp;
    const msg = new KeyPressMsg({ text: 'p', mod: KeyMod.Ctrl | KeyMod.Shift, code: 'p'.charCodeAt(0) });
    const [model] = app.update(msg);
    app = model as StudioApp;
    expect(app.state.overlay).toBe('commandPalette');
  });

  test('Escape dismisses overlay', () => {
    // Open palette first
    let app = baseApp;
    const openMsg = new KeyPressMsg({ text: 'p', mod: KeyMod.Ctrl, code: 'p'.charCodeAt(0) });
    const [opened] = app.update(openMsg);
    app = opened as StudioApp;
    expect(app.state.overlay).toBe('quickOpen');

    // Dismiss with Escape
    const escMsg = new KeyPressMsg({ text: '', mod: KeyMod.None, code: KeyCode.Escape });
    const [closed] = app.update(escMsg);
    app = closed as StudioApp;
    expect(app.state.overlay).toBe('none');
  });

  test('command palette has commands populated', () => {
    let app = baseApp;
    const msg = new KeyPressMsg({ text: 'p', mod: KeyMod.Ctrl | KeyMod.Shift, code: 'p'.charCodeAt(0) });
    const [model] = app.update(msg);
    app = model as StudioApp;

    expect(app.state.palette.items.length).toBeGreaterThan(0);
    expect(app.state.palette.filteredItems.length).toBeGreaterThan(0);
  });

  test('palette up/down navigation changes selectedIndex', () => {
    // Open command palette
    let app = baseApp;
    const openMsg = new KeyPressMsg({ text: 'p', mod: KeyMod.Ctrl | KeyMod.Shift, code: 'p'.charCodeAt(0) });
    const [opened] = app.update(openMsg);
    app = opened as StudioApp;
    expect(app.state.palette.selectedIndex).toBe(0);

    // Press down
    const downMsg = new KeyPressMsg({ text: '', mod: KeyMod.None, code: KeyCode.Down });
    const [downModel] = app.update(downMsg);
    app = downModel as StudioApp;
    expect(app.state.palette.selectedIndex).toBe(1);

    // Press up
    const upMsg = new KeyPressMsg({ text: '', mod: KeyMod.None, code: KeyCode.Up });
    const [upModel] = app.update(upMsg);
    app = upModel as StudioApp;
    expect(app.state.palette.selectedIndex).toBe(0);
  });

  test('typing in palette filters items', () => {
    // Open command palette
    let app = baseApp;
    const openMsg = new KeyPressMsg({ text: 'p', mod: KeyMod.Ctrl | KeyMod.Shift, code: 'p'.charCodeAt(0) });
    const [opened] = app.update(openMsg);
    app = opened as StudioApp;
    const totalBefore = app.state.palette.filteredItems.length;

    // Type 'q' to filter
    const typeMsg = new KeyPressMsg({ text: 'q', mod: KeyMod.None, code: 'q'.charCodeAt(0) });
    const [typed] = app.update(typeMsg);
    app = typed as StudioApp;

    expect(app.state.palette.query).toBe('q');
    expect(app.state.palette.filteredItems.length).toBeLessThanOrEqual(totalBefore);
  });

  test('backspace removes characters from query', () => {
    // Open and type
    let app = baseApp;
    const openMsg = new KeyPressMsg({ text: 'p', mod: KeyMod.Ctrl | KeyMod.Shift, code: 'p'.charCodeAt(0) });
    const [opened] = app.update(openMsg);
    app = opened as StudioApp;

    const typeMsg = new KeyPressMsg({ text: 'q', mod: KeyMod.None, code: 'q'.charCodeAt(0) });
    const [typed] = app.update(typeMsg);
    app = typed as StudioApp;
    expect(app.state.palette.query).toBe('q');

    // Backspace
    const bsMsg = new KeyPressMsg({ text: '', mod: KeyMod.None, code: KeyCode.Backspace });
    const [deleted] = app.update(bsMsg);
    app = deleted as StudioApp;
    expect(app.state.palette.query).toBe('');
  });

  test('view renders overlay when active', () => {
    let app = baseApp;
    const openMsg = new KeyPressMsg({ text: 'p', mod: KeyMod.Ctrl | KeyMod.Shift, code: 'p'.charCodeAt(0) });
    const [opened] = app.update(openMsg);
    app = opened as StudioApp;

    const view = app.view();
    expect(typeof view).toBe('string');
    expect(view.length).toBeGreaterThan(0);
  });
});
