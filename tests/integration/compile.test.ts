/**
 * Integration tests for kb compile command
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { $ } from 'bun';

const CLI_PATH = join(import.meta.dir, '../../src/cli.ts');

describe('kb compile', () => {
  let testDir: string;
  let wikiDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'kb-compile-test-'));
    wikiDir = join(testDir, 'wiki');

    // Initialize a wiki
    await $`bun run ${CLI_PATH} init wiki`.cwd(testDir).nothrow();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  // T047: Integration test for `kb compile` (basic - no API key)
  test('reports nothing to compile for empty wiki', async () => {
    const result = await $`bun run ${CLI_PATH} compile`.cwd(wikiDir).nothrow();

    // Should succeed but report nothing to compile
    expect(result.exitCode).toBe(0);
  });

  // T048: Integration test for idempotent compilation
  test('compile is idempotent', async () => {
    // Without an API key, compile should fail gracefully or report nothing to do
    // First compile
    const result1 = await $`bun run ${CLI_PATH} compile`.cwd(wikiDir).nothrow();

    // Second compile should produce same result
    const result2 = await $`bun run ${CLI_PATH} compile`.cwd(wikiDir).nothrow();

    expect(result1.exitCode).toBe(result2.exitCode);
  });

  // T049: Integration test for `kb compile --dry-run`
  test('dry-run shows what would be compiled', async () => {
    // Ingest a test file
    const testFile = join(testDir, 'test.md');
    await writeFile(testFile, '# Test Content\n\nSome content here.');
    await $`bun run ${CLI_PATH} ingest ${testFile}`.cwd(wikiDir).nothrow();

    // Dry run
    const result = await $`bun run ${CLI_PATH} compile --dry-run`.cwd(wikiDir).nothrow();

    expect(result.exitCode).toBe(0);

    const output = result.stdout.toString();
    // Should mention dry run or what would be compiled
    expect(output.toLowerCase()).toMatch(/dry|would|compile/i);
  });

  test('compile outputs valid JSON when piped', async () => {
    const result = await $`bun run ${CLI_PATH} compile | cat`.cwd(wikiDir).nothrow();

    expect(result.exitCode).toBe(0);

    const output = result.stdout.toString().trim();
    expect(() => JSON.parse(output)).not.toThrow();

    const json = JSON.parse(output);
    expect(json.created).toBeDefined();
    expect(json.updated).toBeDefined();
    expect(json.duration_ms).toBeDefined();
  });

  test('compile requires a wiki', async () => {
    // Try to compile in a non-wiki directory
    const result = await $`bun run ${CLI_PATH} compile`.cwd(testDir).nothrow();

    // Should fail because no wiki found
    expect(result.exitCode).toBe(1);
  });

  test('compile --full flag is recognized', async () => {
    const result = await $`bun run ${CLI_PATH} compile --full`.cwd(wikiDir).nothrow();

    // Should succeed (nothing to compile)
    expect(result.exitCode).toBe(0);
  });
});
