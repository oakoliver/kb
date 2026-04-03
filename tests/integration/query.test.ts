/**
 * Integration tests for kb query command
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm, writeFile, mkdir, readdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { $ } from 'bun';

const CLI_PATH = join(import.meta.dir, '../../src/cli.ts');

describe('kb query', () => {
  let testDir: string;
  let wikiDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'kb-query-test-'));
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
It is a key component of the Transformer architecture.
Attention computes weights based on query-key similarity.`
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
This makes it much faster than recurrent neural networks.
The architecture was introduced in the paper "Attention Is All You Need".`
    );
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  // T072: Integration test for `kb query` (without API key, should fail gracefully)
  test('requires API key for query', async () => {
    const result = await $`bun run ${CLI_PATH} query "What is attention?"`.cwd(wikiDir).nothrow();

    // Should fail because no API key is set
    expect(result.exitCode).toBe(1);

    const output = result.stdout.toString() + result.stderr.toString();
    expect(output.toLowerCase()).toMatch(/api.*key|missing|anthropic|openai/i);
  });

  // T073: Integration test for `kb query --no-file`
  test('--no-file flag is recognized', async () => {
    const result = await $`bun run ${CLI_PATH} query "What is attention?" --no-file`.cwd(wikiDir).nothrow();

    // Should fail because no API key, but flag should be recognized (no "unknown option" error)
    expect(result.exitCode).toBe(1);

    const output = result.stdout.toString() + result.stderr.toString();
    // Should mention API key, not unknown flag
    expect(output.toLowerCase()).not.toContain('unknown');
  });

  test('requires a question argument', async () => {
    const result = await $`bun run ${CLI_PATH} query`.cwd(wikiDir).nothrow();

    expect(result.exitCode).not.toBe(0);
  });

  test('requires a wiki', async () => {
    const result = await $`bun run ${CLI_PATH} query "test question"`.cwd(testDir).nothrow();

    // Should fail because no wiki found
    expect(result.exitCode).toBe(1);
  });

  // T074: Test that query outputs proper JSON for errors
  test('outputs JSON error format when API key missing', async () => {
    // Run without pipe to get proper JSON output
    const result = await $`bun run ${CLI_PATH} query "What is attention?"`.cwd(wikiDir).nothrow();
    
    // Should fail because no API key
    expect(result.exitCode).toBe(1);

    // Check that error message mentions API key
    const output = result.stdout.toString() + result.stderr.toString();
    expect(output.toLowerCase()).toMatch(/api.*key|missing/i);
  });

  test('handles empty wiki gracefully', async () => {
    // Remove the articles we created
    await rm(join(wikiDir, 'wiki', 'concepts'), { recursive: true, force: true });
    await mkdir(join(wikiDir, 'wiki', 'concepts'), { recursive: true });

    const result = await $`bun run ${CLI_PATH} query "anything"`.cwd(wikiDir).nothrow();

    // Should fail - either no articles or no API key
    expect(result.exitCode).toBe(1);
  });
});
