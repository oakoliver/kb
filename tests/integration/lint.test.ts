/**
 * Integration tests for kb lint command
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { $ } from 'bun';

const CLI_PATH = join(import.meta.dir, '../../src/cli.ts');

describe('kb lint', () => {
  let testDir: string;
  let wikiDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'kb-lint-test-'));
    wikiDir = join(testDir, 'wiki');

    // Initialize a wiki
    await $`bun run ${CLI_PATH} init wiki`.cwd(testDir).nothrow();

    // Create wiki directories
    await mkdir(join(wikiDir, 'wiki', 'concepts'), { recursive: true });
    await mkdir(join(wikiDir, 'wiki', 'entities'), { recursive: true });
    await mkdir(join(wikiDir, 'wiki', 'meta'), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  // T081: Integration test for broken link detection
  test('detects broken wikilinks', async () => {
    // Create article with broken link
    await writeFile(
      join(wikiDir, 'wiki', 'concepts', 'test.md'),
      `---
title: Test Article
type: concept
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources: []
related:
  - "[[Nonexistent Article]]"
---

# Test Article

This links to [[Nonexistent Article]] which doesn't exist.`
    );

    const result = await $`bun run ${CLI_PATH} lint`.cwd(wikiDir).nothrow();

    // Should fail with broken link
    expect(result.exitCode).toBe(1);

    const output = result.stdout.toString().toLowerCase();
    expect(output).toMatch(/broken|nonexistent/i);
  });

  // T082: Integration test for orphan article detection
  test('detects orphan articles', async () => {
    // Create article with no sources and no related
    await writeFile(
      join(wikiDir, 'wiki', 'concepts', 'orphan.md'),
      `---
title: Orphan Article
type: concept
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources: []
related: []
---

# Orphan Article

This article has no sources or relations.`
    );

    // Create empty graph
    await writeFile(
      join(wikiDir, 'wiki', 'meta', 'graph.json'),
      JSON.stringify({
        version: 1,
        nodes: {
          'wiki/concepts/orphan.md': {
            dependsOn: [],
            dependents: [],
          },
        },
      })
    );

    const result = await $`bun run ${CLI_PATH} lint`.cwd(wikiDir).nothrow();

    // Should report orphan as warning
    expect(result.exitCode).toBe(0); // Orphans are warnings, not errors

    const output = result.stdout.toString().toLowerCase();
    expect(output).toMatch(/orphan/i);
  });

  // T083: Integration test for frontmatter validation
  test('detects invalid frontmatter', async () => {
    // Create article with invalid frontmatter (missing required field)
    await writeFile(
      join(wikiDir, 'wiki', 'concepts', 'invalid.md'),
      `---
title: Invalid Article
type: invalid_type
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources: []
related: []
---

# Invalid Article

This article has invalid frontmatter.`
    );

    const result = await $`bun run ${CLI_PATH} lint`.cwd(wikiDir).nothrow();

    // Should fail with frontmatter error
    expect(result.exitCode).toBe(1);

    const output = result.stdout.toString().toLowerCase();
    expect(output).toMatch(/frontmatter|invalid|type/i);
  });

  // T084: Integration test for healthy wiki exit code
  test('returns success for healthy wiki', async () => {
    // Create valid article
    await writeFile(
      join(wikiDir, 'wiki', 'concepts', 'valid.md'),
      `---
title: Valid Article
type: concept
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources:
  - raw/source.md
related: []
---

# Valid Article

This is a valid article with proper frontmatter.`
    );

    // Create graph with source
    await writeFile(
      join(wikiDir, 'wiki', 'meta', 'graph.json'),
      JSON.stringify({
        version: 1,
        nodes: {
          'wiki/concepts/valid.md': {
            dependsOn: ['raw/source.md'],
            dependents: [],
          },
        },
      })
    );

    const result = await $`bun run ${CLI_PATH} lint`.cwd(wikiDir).nothrow();

    // Should succeed
    expect(result.exitCode).toBe(0);
  });

  test('requires a wiki', async () => {
    const result = await $`bun run ${CLI_PATH} lint`.cwd(testDir).nothrow();

    expect(result.exitCode).toBe(1);
  });

  test('outputs valid JSON when piped', async () => {
    // Create valid article
    await writeFile(
      join(wikiDir, 'wiki', 'concepts', 'test.md'),
      `---
title: Test
type: concept
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources: []
related: []
---

# Test`
    );

    const result = await $`bun run ${CLI_PATH} lint | cat`.cwd(wikiDir).nothrow();

    const output = result.stdout.toString().trim();
    expect(() => JSON.parse(output)).not.toThrow();

    const json = JSON.parse(output);
    expect(json.errors).toBeDefined();
    expect(json.warnings).toBeDefined();
    expect(json.healthy).toBeDefined();
  });

  test('handles empty wiki gracefully', async () => {
    const result = await $`bun run ${CLI_PATH} lint`.cwd(wikiDir).nothrow();

    // Should succeed with empty wiki
    expect(result.exitCode).toBe(0);
  });

  test('--fix flag is recognized', async () => {
    const result = await $`bun run ${CLI_PATH} lint --fix`.cwd(wikiDir).nothrow();

    // Should not error about unknown flag
    const output = result.stdout.toString() + result.stderr.toString();
    expect(output.toLowerCase()).not.toContain('unknown');
  });
});
