/**
 * Integration tests for kb find command
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { $ } from 'bun';

const CLI_PATH = join(import.meta.dir, '../../src/cli.ts');

describe('kb find', () => {
  let testDir: string;
  let wikiDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'kb-find-test-'));
    wikiDir = join(testDir, 'wiki');

    // Initialize a wiki
    await $`bun run ${CLI_PATH} init wiki`.cwd(testDir).nothrow();

    // Create some test articles
    await mkdir(join(wikiDir, 'wiki', 'concepts'), { recursive: true });

    await writeFile(
      join(wikiDir, 'wiki', 'concepts', 'attention.md'),
      `---
title: Attention Mechanism
type: concept
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources: []
related: []
---

# Attention Mechanism

The attention mechanism allows neural networks to focus on relevant parts of the input.
It is a key component of the Transformer architecture.`
    );

    await writeFile(
      join(wikiDir, 'wiki', 'concepts', 'transformer.md'),
      `---
title: Transformer Architecture
type: concept
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources: []
related: []
---

# Transformer Architecture

The Transformer uses self-attention to process sequences in parallel.
This makes it much faster than recurrent neural networks.`
    );
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  // T063: Integration test for `kb find`
  test('finds articles matching query', async () => {
    const result = await $`bun run ${CLI_PATH} find "attention"`.cwd(wikiDir).nothrow();

    expect(result.exitCode).toBe(0);

    const output = result.stdout.toString();
    // Should contain the attention article
    expect(output.toLowerCase()).toContain('attention');
  });

  // T064: Integration test for `kb find --limit`
  test('respects --limit option', async () => {
    const result = await $`bun run ${CLI_PATH} find "neural" --limit 1`.cwd(wikiDir).nothrow();

    expect(result.exitCode).toBe(0);

    // Parse JSON output when piped
    const jsonResult = await $`bun run ${CLI_PATH} find "neural" --limit 1 | cat`.cwd(wikiDir).nothrow();
    const json = JSON.parse(jsonResult.stdout.toString().trim());

    expect(json.results.length).toBeLessThanOrEqual(1);
  });

  // T065: Integration test for no results exit code
  test('returns exit code 1 for no results', async () => {
    const result = await $`bun run ${CLI_PATH} find "xyzzyx nonexistent term"`.cwd(wikiDir).nothrow();

    expect(result.exitCode).toBe(1);
  });

  test('requires a wiki', async () => {
    const result = await $`bun run ${CLI_PATH} find "test"`.cwd(testDir).nothrow();

    // Should fail because no wiki found
    expect(result.exitCode).toBe(1);
  });

  test('requires a query argument', async () => {
    const result = await $`bun run ${CLI_PATH} find`.cwd(wikiDir).nothrow();

    expect(result.exitCode).not.toBe(0);
  });

  test('outputs valid JSON when piped', async () => {
    const result = await $`bun run ${CLI_PATH} find "attention" | cat`.cwd(wikiDir).nothrow();

    expect(result.exitCode).toBe(0);

    const output = result.stdout.toString().trim();
    expect(() => JSON.parse(output)).not.toThrow();

    const json = JSON.parse(output);
    expect(json.results).toBeDefined();
    expect(json.total).toBeDefined();
  });

  test('results include score and snippet', async () => {
    const result = await $`bun run ${CLI_PATH} find "attention" | cat`.cwd(wikiDir).nothrow();

    expect(result.exitCode).toBe(0);

    const json = JSON.parse(result.stdout.toString().trim());

    if (json.results.length > 0) {
      expect(json.results[0].score).toBeDefined();
      expect(json.results[0].snippet).toBeDefined();
      expect(json.results[0].path).toBeDefined();
      expect(json.results[0].title).toBeDefined();
    }
  });

  test('handles empty wiki gracefully', async () => {
    // Remove the articles we created
    await rm(join(wikiDir, 'wiki', 'concepts'), { recursive: true, force: true });
    await mkdir(join(wikiDir, 'wiki', 'concepts'), { recursive: true });

    const result = await $`bun run ${CLI_PATH} find "anything"`.cwd(wikiDir).nothrow();

    // Should return exit code 1 for no results
    expect(result.exitCode).toBe(1);
  });
});
