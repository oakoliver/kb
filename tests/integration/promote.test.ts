/**
 * Integration tests for kb promote command
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { $ } from 'bun';

const CLI_PATH = join(import.meta.dir, '../../src/cli.ts');

describe('kb promote', () => {
  let testDir: string;
  let wikiDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'kb-promote-test-'));
    wikiDir = join(testDir, 'wiki');

    // Initialize a wiki
    await $`bun run ${CLI_PATH} init wiki`.cwd(testDir).nothrow();

    // Create concept directory
    await mkdir(join(wikiDir, 'wiki', 'concepts'), { recursive: true });
    await mkdir(join(wikiDir, 'wiki', 'syntheses'), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  // T098: Integration test for promote command
  test('promotes query file to wiki', async () => {
    // Create a query file
    await writeFile(
      join(wikiDir, 'queries', '2026-04-01-test-query.md'),
      `---
title: Test Query
type: query
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources: []
related: []
---

# Test Query

This is a test query response.`
    );

    const result = await $`bun run ${CLI_PATH} promote queries/2026-04-01-test-query.md`.cwd(wikiDir).nothrow();

    expect(result.exitCode).toBe(0);

    // Check that file was moved to wiki/syntheses (default type)
    const destFile = Bun.file(join(wikiDir, 'wiki', 'syntheses', 'test-query.md'));
    expect(await destFile.exists()).toBe(true);

    // Source file should be deleted
    const sourceFile = Bun.file(join(wikiDir, 'queries', '2026-04-01-test-query.md'));
    expect(await sourceFile.exists()).toBe(false);
  });

  test('promotes with --as type option', async () => {
    // Create a query file
    await writeFile(
      join(wikiDir, 'queries', '2026-04-01-concept-query.md'),
      `---
title: Attention Mechanism Explained
type: query
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources: []
related: []
---

# Attention Mechanism Explained

A detailed explanation of attention mechanisms.`
    );

    const result = await $`bun run ${CLI_PATH} promote queries/2026-04-01-concept-query.md --as concept`.cwd(wikiDir).nothrow();

    expect(result.exitCode).toBe(0);

    // Check that file was moved to wiki/concepts
    const destFile = Bun.file(join(wikiDir, 'wiki', 'concepts', 'attention-mechanism-explained.md'));
    expect(await destFile.exists()).toBe(true);
  });

  // T099: Integration test for backlink addition
  test('adds backlinks to cited articles', async () => {
    // Create a concept article that will be cited
    await writeFile(
      join(wikiDir, 'wiki', 'concepts', 'transformers.md'),
      `---
title: Transformers
type: concept
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources: []
related: []
---

# Transformers

The transformer architecture is...`
    );

    // Create a query file that cites the concept
    await writeFile(
      join(wikiDir, 'queries', '2026-04-01-citing-query.md'),
      `---
title: Understanding Transformers
type: query
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources: []
related:
  - "[[Transformers]]"
---

# Understanding Transformers

See [[Transformers]] for details.`
    );

    const result = await $`bun run ${CLI_PATH} promote queries/2026-04-01-citing-query.md`.cwd(wikiDir).nothrow();

    expect(result.exitCode).toBe(0);

    // Check that the cited article now has a backlink
    const citedContent = await readFile(join(wikiDir, 'wiki', 'concepts', 'transformers.md'), 'utf-8');
    expect(citedContent).toMatch(/Understanding Transformers/);
  });

  // T100: Integration test for index update after promote
  test('updates index after promotion', async () => {
    // Create index file
    await writeFile(
      join(wikiDir, 'wiki', '_index.md'),
      `# Index

## Concepts

## Entities

## Syntheses
`
    );

    // Create a query file
    await writeFile(
      join(wikiDir, 'queries', '2026-04-01-index-test.md'),
      `---
title: New Synthesis Article
type: query
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources: []
related: []
---

# New Synthesis Article

This should appear in the index.`
    );

    const result = await $`bun run ${CLI_PATH} promote queries/2026-04-01-index-test.md`.cwd(wikiDir).nothrow();

    expect(result.exitCode).toBe(0);

    // Check that index was updated
    const indexContent = await readFile(join(wikiDir, 'wiki', '_index.md'), 'utf-8');
    expect(indexContent).toMatch(/New Synthesis Article/);
  });

  test('fails with nonexistent file', async () => {
    const result = await $`bun run ${CLI_PATH} promote queries/nonexistent.md`.cwd(wikiDir).nothrow();

    expect(result.exitCode).toBe(1);
  });

  test('fails without file argument', async () => {
    const result = await $`bun run ${CLI_PATH} promote`.cwd(wikiDir).nothrow();

    expect(result.exitCode).toBe(1);
  });

  test('outputs valid JSON when piped', async () => {
    // Create a query file
    await writeFile(
      join(wikiDir, 'queries', '2026-04-01-json-test.md'),
      `---
title: JSON Test
type: query
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources: []
related: []
---

# JSON Test`
    );

    const result = await $`bun run ${CLI_PATH} promote queries/2026-04-01-json-test.md | cat`.cwd(wikiDir).nothrow();

    const output = result.stdout.toString().trim();
    expect(() => JSON.parse(output)).not.toThrow();

    const json = JSON.parse(output);
    expect(json.source).toBeDefined();
    expect(json.destination).toBeDefined();
  });

  test('requires a wiki', async () => {
    const result = await $`bun run ${CLI_PATH} promote queries/test.md`.cwd(testDir).nothrow();

    expect(result.exitCode).toBe(1);
  });
});
