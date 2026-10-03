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

  test('--fix removes broken related entries and leaves body links reported', async () => {
    const article = (title: string, related: string[], body: string) => `---
title: ${title}
type: concept
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources:
  - raw/articles/source.md
related:
${related.map((r) => `  - "${r}"`).join('\n') || '  []'}
---

# ${title}

${body}`;
    await writeFile(join(wikiDir, 'wiki', 'concepts', 'kept.md'), article('Kept Article', ['[[Linking Article]]'], 'Exists.'));
    const linkingPath = join(wikiDir, 'wiki', 'concepts', 'linking.md');
    await writeFile(
      linkingPath,
      article('Linking Article', ['[[Kept Article]]', '[[Deleted Article]]'], 'See [[Deleted Article]].')
    );

    const fixedRun = await $`bun run ${CLI_PATH} lint --fix`.cwd(wikiDir).nothrow();
    const fixedResult = JSON.parse(fixedRun.stdout.toString());

    expect(fixedResult.fixed).toHaveLength(1);
    expect(fixedResult.fixed[0]).toMatchObject({ location: 'related', link: '[[Deleted Article]]' });
    // The body link can't be fixed deterministically, so it is still an error
    expect(fixedResult.errors).toEqual([
      expect.objectContaining({ type: 'broken_link', location: 'body', link: '[[Deleted Article]]' }),
    ]);

    const content = await Bun.file(linkingPath).text();
    expect(content).toContain('[[Kept Article]]');
    expect(content).toContain('See [[Deleted Article]].');
    expect(content.split('---')[1]).not.toContain('Deleted Article');

    const after = JSON.parse((await $`bun run ${CLI_PATH} lint`.cwd(wikiDir).nothrow()).stdout.toString());
    expect(after.errors.filter((e: { location?: string }) => e.location === 'related')).toEqual([]);
  });

  test('related entries written as plain titles (older kb compile) are checked and fixed too', async () => {
    const article = (title: string, related: string[]) => `---
title: ${title}
type: concept
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources:
  - raw/articles/source.md
related:
${related.map((r) => `  - "${r}"`).join('\n')}
---

# ${title}

Body.`;
    await writeFile(join(wikiDir, 'wiki', 'concepts', 'kept.md'), article('Kept Article', ['Linking Article']));
    const linkingPath = join(wikiDir, 'wiki', 'concepts', 'linking.md');
    await writeFile(linkingPath, article('Linking Article', ['Kept Article', 'Deleted Article']));

    const before = JSON.parse((await $`bun run ${CLI_PATH} lint`.cwd(wikiDir).nothrow()).stdout.toString());
    expect(before.errors).toEqual([
      expect.objectContaining({ type: 'broken_link', location: 'related', link: '[[Deleted Article]]' }),
    ]);

    const fixed = JSON.parse((await $`bun run ${CLI_PATH} lint --fix`.cwd(wikiDir).nothrow()).stdout.toString());
    expect(fixed.fixed).toHaveLength(1);
    const frontmatter = (await Bun.file(linkingPath).text()).split('---')[1];
    expect(frontmatter).toContain('Kept Article');
    expect(frontmatter).not.toContain('Deleted Article');
  });

  test('lint without --fix does not modify files', async () => {
    const path = join(wikiDir, 'wiki', 'concepts', 'test.md');
    const original = `---
title: Test Article
type: concept
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources: []
related:
  - "[[Nonexistent Article]]"
---

# Test Article`;
    await writeFile(path, original);

    await $`bun run ${CLI_PATH} lint`.cwd(wikiDir).nothrow();

    expect(await Bun.file(path).text()).toBe(original);
  });
});
