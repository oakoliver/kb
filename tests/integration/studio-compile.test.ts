/**
 * Integration tests for studio compile functionality
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { StudioApp } from '../../src/tui/app';
import { getWikiPaths } from '../../src/core/resolver';
import { KeyPressMsg, KeyMod, WindowSizeMsg } from '@oakoliver/bubbletea';
import { createStudioFixture } from './helpers/studio';
import { CompileDoneMsg, CompileErrorMsg, CompileProgressMsg } from '../../src/tui/messages';

// =============================================================================
// Test Helpers
// =============================================================================

function createApp(fixturePath: string): StudioApp {
  const paths = getWikiPaths(fixturePath);
  return new StudioApp(fixturePath, paths);
}

// =============================================================================
// Compile Command via Palette
// =============================================================================

describe('studio compile - command execution', () => {
  let fixturePath: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const fixture = await createStudioFixture();
    fixturePath = fixture.wikiDir;
    cleanup = fixture.cleanup;
  });

  test('kb.compile command activates bottom panel with progress tab', () => {
    const app = createApp(fixturePath);
    app.update(new WindowSizeMsg(120, 40));

    // Execute compile command directly (simulating palette selection)
    // Access the private method via bracket notation
    const result = (app as any)._executeCommand('kb.compile');

    // Bottom panel should be visible with progress tab
    expect(app.state.bottomPanel.visible).toBe(true);
    expect(app.state.bottomPanel.activeTab).toBe('progress');
    expect(app.state.statusBar.activeOperation).toBe('Compiling...');
  });

  test('compile output contains starting message', () => {
    const app = createApp(fixturePath);
    app.update(new WindowSizeMsg(120, 40));

    (app as any)._executeCommand('kb.compile');

    // Output should have a compilation start message
    expect(app.state.bottomPanel.output.some(
      (l: any) => l.text.includes('compilation') || l.text.includes('Compil'),
    )).toBe(true);
  });
});

// =============================================================================
// Compile Message Handling
// =============================================================================

describe('studio compile - message handling', () => {
  let fixturePath: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const fixture = await createStudioFixture();
    fixturePath = fixture.wikiDir;
    cleanup = fixture.cleanup;
  });

  test('CompileProgressMsg updates progress state', () => {
    const app = createApp(fixturePath);
    app.update(new WindowSizeMsg(120, 40));

    app.update(new CompileProgressMsg(0.5, 'Compiling article 2/4'));

    expect(app.state.bottomPanel.progressPercent).toBe(0.5);
    expect(app.state.bottomPanel.progressLabel).toBe('Compiling article 2/4');
  });

  test('CompileDoneMsg clears operation and triggers refresh', () => {
    const app = createApp(fixturePath);
    app.update(new WindowSizeMsg(120, 40));

    // Set some progress first
    app.state.statusBar.activeOperation = 'Compiling...';
    app.state.bottomPanel.progressPercent = 0.5;

    const [, cmd] = app.update(new CompileDoneMsg(3));

    expect(app.state.statusBar.activeOperation).toBeNull();
    expect(app.state.bottomPanel.progressPercent).toBe(0);
    expect(cmd).not.toBeNull(); // should return refresh command
  });

  test('CompileErrorMsg clears operation and shows error', () => {
    const app = createApp(fixturePath);
    app.update(new WindowSizeMsg(120, 40));

    app.state.statusBar.activeOperation = 'Compiling...';

    app.update(new CompileErrorMsg('API key missing'));

    expect(app.state.statusBar.activeOperation).toBeNull();
    expect(app.state.bottomPanel.activeTab).toBe('output');
    expect(app.state.bottomPanel.output.some(
      (l: any) => l.text.includes('API key missing'),
    )).toBe(true);
  });
});

// =============================================================================
// View Rendering with Compile
// =============================================================================

describe('studio compile - view rendering', () => {
  let fixturePath: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const fixture = await createStudioFixture();
    fixturePath = fixture.wikiDir;
    cleanup = fixture.cleanup;
  });

  test('view renders progress tab in bottom panel', () => {
    const app = createApp(fixturePath);
    app.update(new WindowSizeMsg(120, 40));

    // Set up progress state
    app.state.bottomPanel.visible = true;
    app.state.bottomPanel.activeTab = 'progress';
    app.state.bottomPanel.progressPercent = 0.6;
    app.state.bottomPanel.progressLabel = 'Compiling...';

    const view = app.view();
    expect(view).toContain('PROGRESS');
  });
});
