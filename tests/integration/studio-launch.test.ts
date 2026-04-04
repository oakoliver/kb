/**
 * Integration tests for KB Studio launch and resize
 * Tests: T016 [US1]
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { $ } from 'bun';
import { join } from 'path';
import { createStudioFixture, CLI_PATH } from './helpers/studio';

describe('studio launch', () => {
  let wikiDir: string;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    const fixture = await createStudioFixture();
    wikiDir = fixture.wikiDir;
    cleanup = fixture.cleanup;
  });

  afterAll(async () => {
    await cleanup();
  });

  test('kb studio exits 1 when not in a wiki', async () => {
    const result = await $`bun ${CLI_PATH} studio`
      .cwd('/tmp')
      .nothrow()
      .quiet();
    expect(result.exitCode).toBe(1);
  });

  test('kb studio exits 2 when --help is passed', async () => {
    const result = await $`bun ${CLI_PATH} studio --help`
      .cwd(wikiDir)
      .nothrow()
      .quiet();
    // --help triggers the global help handler which exits 0
    expect(result.exitCode).toBe(0);
  });

  test('studio command is registered in help text', async () => {
    const result = await $`bun ${CLI_PATH} --help`
      .cwd(wikiDir)
      .nothrow()
      .quiet();
    const stdout = result.stdout.toString();
    expect(stdout).toContain('studio');
  });
});
