/**
 * Integration tests for kb status command
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { $ } from 'bun';

const CLI_PATH = join(import.meta.dir, '../../src/cli.ts');

describe('kb status', () => {
  let testDir: string;
  let wikiDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'kb-status-test-'));
    wikiDir = join(testDir, 'wiki');

    // Initialize a wiki
    await $`bun run ${CLI_PATH} init wiki`.cwd(testDir).nothrow();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  // T091: Integration test for `kb status` output
  test('shows wiki statistics', async () => {
    // Create some articles
    await mkdir(join(wikiDir, 'wiki', 'concepts'), { recursive: true });
    await mkdir(join(wikiDir, 'wiki', 'entities'), { recursive: true });

    await writeFile(
      join(wikiDir, 'wiki', 'concepts', 'attention.md'),
      `---
title: Attention Mechanism
type: concept
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources:
  - raw/paper.md
related: []
---

# Attention Mechanism`
    );

    await writeFile(
      join(wikiDir, 'wiki', 'entities', 'gpt.md'),
      `---
title: GPT-4
type: entity
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources:
  - raw/docs.md
related: []
---

# GPT-4`
    );

    // Create a source in manifest
    await writeFile(
      join(wikiDir, 'raw', '_manifest.json'),
      JSON.stringify({
        version: 1,
        entries: [
          {
            path: 'articles/paper.md',
            title: 'Paper',
            dateAdded: '2026-04-01T10:00:00Z',
            hash: 'abc123',
            type: 'article',
          },
        ],
      })
    );

    const result = await $`bun run ${CLI_PATH} status`.cwd(wikiDir).nothrow();

    expect(result.exitCode).toBe(0);

    const output = result.stdout.toString().toLowerCase();
    expect(output).toMatch(/sources|articles/i);
  });

  // T092: Integration test for empty wiki status
  test('handles empty wiki', async () => {
    const result = await $`bun run ${CLI_PATH} status`.cwd(wikiDir).nothrow();

    expect(result.exitCode).toBe(0);

    const output = result.stdout.toString();
    // Should show zero counts
    expect(output).toMatch(/0|empty|no/i);
  });

  test('requires a wiki', async () => {
    const result = await $`bun run ${CLI_PATH} status`.cwd(testDir).nothrow();

    expect(result.exitCode).toBe(1);
  });

  test('outputs valid JSON when piped', async () => {
    const result = await $`bun run ${CLI_PATH} status | cat`.cwd(wikiDir).nothrow();

    const output = result.stdout.toString().trim();
    expect(() => JSON.parse(output)).not.toThrow();

    const json = JSON.parse(output);
    expect(json.path).toBeDefined();
    expect(json.sources).toBeDefined();
    expect(json.articles).toBeDefined();
  });

  test('shows article breakdown by type', async () => {
    // Create articles of different types
    await mkdir(join(wikiDir, 'wiki', 'concepts'), { recursive: true });
    await mkdir(join(wikiDir, 'wiki', 'entities'), { recursive: true });
    await mkdir(join(wikiDir, 'wiki', 'syntheses'), { recursive: true });

    await writeFile(
      join(wikiDir, 'wiki', 'concepts', 'test.md'),
      `---
title: Test Concept
type: concept
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources: []
related: []
---

# Test`
    );

    await writeFile(
      join(wikiDir, 'wiki', 'entities', 'test.md'),
      `---
title: Test Entity
type: entity
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources: []
related: []
---

# Test`
    );

    const result = await $`bun run ${CLI_PATH} status | cat`.cwd(wikiDir).nothrow();

    const json = JSON.parse(result.stdout.toString().trim());

    expect(json.articles.concepts).toBe(1);
    expect(json.articles.entities).toBe(1);
    expect(json.articles.syntheses).toBe(0);
  });

  test('counts queries', async () => {
    // Create a query file
    await writeFile(
      join(wikiDir, 'queries', '2026-04-01-test.md'),
      `---
title: Test Query
type: query
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources: []
related: []
---

# Test Query`
    );

    const result = await $`bun run ${CLI_PATH} status | cat`.cwd(wikiDir).nothrow();

    const json = JSON.parse(result.stdout.toString().trim());

    expect(json.queries).toBe(1);
  });
});
