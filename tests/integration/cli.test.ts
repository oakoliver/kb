/**
 * Integration tests for the kb entry point: global flags and argument parsing
 */

import { describe, test, expect } from 'bun:test';
import { join } from 'path';
import { $ } from 'bun';
import pkg from '../../package.json';

const CLI_PATH = join(import.meta.dir, '../../src/cli.ts');

describe('kb --version', () => {
  test('reports the package version', async () => {
    const result = await $`bun run ${CLI_PATH} --version`.nothrow().quiet();
    expect(JSON.parse(result.stdout.toString())).toEqual({ version: pkg.version });
  });
});

describe('kb --json', () => {
  test('does not swallow the argument after it, in any position', async () => {
    const { mkdtemp, rm, writeFile, mkdir } = await import('fs/promises');
    const { tmpdir } = await import('os');
    const testDir = await mkdtemp(join(tmpdir(), 'kb-json-test-'));
    try {
      await $`bun run ${CLI_PATH} init wiki`.cwd(testDir).nothrow().quiet();
      const wikiDir = join(testDir, 'wiki');
      await mkdir(join(wikiDir, 'wiki', 'concepts'), { recursive: true });
      await writeFile(
        join(wikiDir, 'wiki', 'concepts', 'starter.md'),
        '---\ntitle: Sourdough Starter\ntype: concept\ncreated: 2026-04-01T10:00:00Z\nupdated: 2026-04-01T10:00:00Z\nsources: []\nrelated: []\n---\n\n# Sourdough Starter\n\nA starter is flour and water.\n',
      );
      await writeFile(
        join(wikiDir, 'wiki', 'concepts', 'crumb.md'),
        '---\ntitle: Open Crumb\ntype: concept\ncreated: 2026-04-01T10:00:00Z\nupdated: 2026-04-01T10:00:00Z\nsources: []\nrelated: []\n---\n\n# Open Crumb\n\nLarge irregular holes in the loaf.\n',
      );
      for (const args of [['find', '--json', 'starter'], ['--json', 'find', 'starter'], ['find', 'starter', '--json']]) {
        const result = await $`bun run ${CLI_PATH} ${args}`.cwd(wikiDir).nothrow().quiet();
        expect(result.exitCode).toBe(0);
        const body = JSON.parse(result.stdout.toString());
        expect(body.results[0].title).toBe('Sourdough Starter');
      }
    } finally {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  test('forces JSON output even when stdout is a terminal', async () => {
    const { wantsJsonOutput } = await import('../../src/output/format');
    expect(wantsJsonOutput(['bun', 'kb', 'status', '--json'])).toBe(true);
    expect(wantsJsonOutput(['bun', 'kb', '--json', 'status'])).toBe(true);
    expect(wantsJsonOutput(['bun', 'kb', 'status'])).toBe(false);
  });
});
