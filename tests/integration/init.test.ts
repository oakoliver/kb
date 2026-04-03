/**
 * Integration tests for kb init command
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm, readdir, stat } from 'fs/promises';
import { tmpdir, homedir } from 'os';
import { join } from 'path';
import { $ } from 'bun';

const CLI_PATH = join(import.meta.dir, '../../src/cli.ts');

describe('kb init', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'kb-test-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  // T019: Integration test for `kb init`
  test('creates directory structure with default name', async () => {
    const result = await $`bun run ${CLI_PATH} init`.cwd(testDir).nothrow();

    expect(result.exitCode).toBe(0);

    // Check directory structure
    const wikiPath = join(testDir, 'kb');
    const entries = await readdir(wikiPath);

    expect(entries).toContain('.kb');
    expect(entries).toContain('raw');
    expect(entries).toContain('wiki');
    expect(entries).toContain('queries');

    // Check config file exists
    const configPath = join(wikiPath, '.kb', 'config.json');
    const configStat = await stat(configPath);
    expect(configStat.isFile()).toBe(true);

    // Check config content is valid JSON
    const configFile = Bun.file(configPath);
    const config = await configFile.json();
    expect(config.version).toBe(1);
    expect(config.llm).toBeDefined();
    expect(config.wiki).toBeDefined();
  });

  // T020: Integration test for `kb init <path>`
  test('creates directory structure at specified path', async () => {
    const wikiName = 'my-knowledge-base';
    const result = await $`bun run ${CLI_PATH} init ${wikiName}`.cwd(testDir).nothrow();

    expect(result.exitCode).toBe(0);

    // Check directory structure at specified path
    const wikiPath = join(testDir, wikiName);
    const entries = await readdir(wikiPath);

    expect(entries).toContain('.kb');
    expect(entries).toContain('raw');
    expect(entries).toContain('wiki');
    expect(entries).toContain('queries');

    // Check instructions.md exists
    const instructionsPath = join(wikiPath, '.kb', 'instructions.md');
    const instructionsStat = await stat(instructionsPath);
    expect(instructionsStat.isFile()).toBe(true);
  });

  // T021: Integration test for `kb init --global`
  test('creates global wiki at ~/.kb/', async () => {
    const globalPath = join(homedir(), '.kb');

    // Clean up any existing global wiki first
    try {
      await rm(globalPath, { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }

    try {
      const result = await $`bun run ${CLI_PATH} init --global`.nothrow();

      expect(result.exitCode).toBe(0);

      // Check directory structure at global path
      const entries = await readdir(globalPath);

      // Global wiki has different structure - .kb is the root
      expect(entries).toContain('config.json');
    } finally {
      // Clean up global wiki after test
      await rm(globalPath, { recursive: true, force: true });
    }
  });

  // T022: Integration test for duplicate init error
  test('returns error when wiki already exists', async () => {
    // First init
    const firstResult = await $`bun run ${CLI_PATH} init`.cwd(testDir).nothrow();
    expect(firstResult.exitCode).toBe(0);

    // Second init should fail
    const secondResult = await $`bun run ${CLI_PATH} init`.cwd(testDir).nothrow();
    expect(secondResult.exitCode).toBe(1);

    // Check error message
    const stderr = secondResult.stderr.toString();
    expect(stderr.toLowerCase()).toContain('already exists');
  });

  test('outputs valid JSON when piped', async () => {
    const result = await $`bun run ${CLI_PATH} init test-wiki | cat`.cwd(testDir).nothrow();

    expect(result.exitCode).toBe(0);

    // Should be valid JSON
    const output = result.stdout.toString().trim();
    expect(() => JSON.parse(output)).not.toThrow();

    const json = JSON.parse(output);
    expect(json.path).toBeDefined();
    expect(json.created).toBeInstanceOf(Array);
  });

  test('creates empty manifest file', async () => {
    await $`bun run ${CLI_PATH} init`.cwd(testDir).nothrow();

    const manifestPath = join(testDir, 'kb', 'raw', '_manifest.json');
    const manifestFile = Bun.file(manifestPath);
    expect(await manifestFile.exists()).toBe(true);

    const manifest = await manifestFile.json();
    expect(manifest.version).toBe(1);
    expect(manifest.entries).toEqual([]);
  });

  test('creates empty graph file', async () => {
    await $`bun run ${CLI_PATH} init`.cwd(testDir).nothrow();

    const graphPath = join(testDir, 'kb', 'wiki', 'meta', 'graph.json');
    const graphFile = Bun.file(graphPath);
    expect(await graphFile.exists()).toBe(true);

    const graph = await graphFile.json();
    expect(graph.version).toBe(1);
    expect(graph.nodes).toEqual({});
  });
});
