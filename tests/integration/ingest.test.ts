/**
 * Integration tests for kb ingest command
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { $ } from 'bun';

const CLI_PATH = join(import.meta.dir, '../../src/cli.ts');

describe('kb ingest', () => {
  let testDir: string;
  let wikiDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'kb-ingest-test-'));
    wikiDir = join(testDir, 'wiki');

    // Initialize a wiki
    await $`bun run ${CLI_PATH} init wiki`.cwd(testDir).nothrow();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  // T033: Integration test for `kb ingest <file.md>`
  test('ingests local markdown file', async () => {
    // Create a test file
    const testFile = join(testDir, 'test-article.md');
    await writeFile(testFile, '# Test Article\n\nThis is a test article.');

    const result = await $`bun run ${CLI_PATH} ingest ${testFile}`.cwd(wikiDir).nothrow();

    expect(result.exitCode).toBe(0);

    // Check manifest was updated
    const manifestPath = join(wikiDir, 'raw', '_manifest.json');
    const manifest = await Bun.file(manifestPath).json();

    expect(manifest.entries).toHaveLength(1);
    expect(manifest.entries[0].title).toBe('Test Article');
    expect(manifest.entries[0].type).toBe('article');
  });

  // T034: Integration test for duplicate detection
  test('detects duplicate content', async () => {
    // Create a test file
    const testFile = join(testDir, 'test-article.md');
    await writeFile(testFile, '# Test Article\n\nThis is a test article.');

    // First ingest
    await $`bun run ${CLI_PATH} ingest ${testFile}`.cwd(wikiDir).nothrow();

    // Create another file with same content
    const duplicateFile = join(testDir, 'duplicate-article.md');
    await writeFile(duplicateFile, '# Test Article\n\nThis is a test article.');

    // Second ingest - should be skipped
    const result = await $`bun run ${CLI_PATH} ingest ${duplicateFile}`.cwd(wikiDir).nothrow();

    expect(result.exitCode).toBe(0);

    // Check manifest still has only 1 entry
    const manifestPath = join(wikiDir, 'raw', '_manifest.json');
    const manifest = await Bun.file(manifestPath).json();

    expect(manifest.entries).toHaveLength(1);

    // Check output mentions skipped/duplicate
    const output = result.stdout.toString();
    expect(output.toLowerCase()).toMatch(/skip|duplicate/);
  });

  test('ingests file with custom title', async () => {
    const testFile = join(testDir, 'notes.md');
    await writeFile(testFile, 'Some content without a title');

    const result = await $`bun run ${CLI_PATH} ingest ${testFile} --title "My Custom Title"`.cwd(wikiDir).nothrow();

    expect(result.exitCode).toBe(0);

    const manifestPath = join(wikiDir, 'raw', '_manifest.json');
    const manifest = await Bun.file(manifestPath).json();

    expect(manifest.entries[0].title).toBe('My Custom Title');
  });

  test('ingests file with custom type', async () => {
    const testFile = join(testDir, 'doc.md');
    await writeFile(testFile, '# Some Document');

    const result = await $`bun run ${CLI_PATH} ingest ${testFile} --type paper`.cwd(wikiDir).nothrow();

    expect(result.exitCode).toBe(0);

    const manifestPath = join(wikiDir, 'raw', '_manifest.json');
    const manifest = await Bun.file(manifestPath).json();

    expect(manifest.entries[0].type).toBe('paper');
  });

  test('returns error when no source specified', async () => {
    const result = await $`bun run ${CLI_PATH} ingest`.cwd(wikiDir).nothrow();

    expect(result.exitCode).toBe(1);
  });

  test('returns error when file not found', async () => {
    const result = await $`bun run ${CLI_PATH} ingest /nonexistent/file.md`.cwd(wikiDir).nothrow();

    expect(result.exitCode).toBe(1);
  });

  test('outputs valid JSON when piped', async () => {
    const testFile = join(testDir, 'test.md');
    await writeFile(testFile, '# Test');

    const result = await $`bun run ${CLI_PATH} ingest ${testFile} | cat`.cwd(wikiDir).nothrow();

    expect(result.exitCode).toBe(0);

    const output = result.stdout.toString().trim();
    expect(() => JSON.parse(output)).not.toThrow();

    const json = JSON.parse(output);
    expect(json.path).toBeDefined();
    expect(json.hash).toBeDefined();
    expect(json.skipped).toBe(false);
  });

  test('extracts title from markdown H1', async () => {
    const testFile = join(testDir, 'unnamed.md');
    await writeFile(testFile, '# Extracted Title\n\nContent here.');

    await $`bun run ${CLI_PATH} ingest ${testFile}`.cwd(wikiDir).nothrow();

    const manifestPath = join(wikiDir, 'raw', '_manifest.json');
    const manifest = await Bun.file(manifestPath).json();

    expect(manifest.entries[0].title).toBe('Extracted Title');
  });

  test('copies file to raw directory', async () => {
    const testFile = join(testDir, 'source.md');
    await writeFile(testFile, '# Source Content');

    await $`bun run ${CLI_PATH} ingest ${testFile}`.cwd(wikiDir).nothrow();

    // Check file exists in raw/articles/
    const files = await $`ls ${wikiDir}/raw/articles/`.text();
    expect(files).toContain('.md');
  });

  test('rejects more than one source instead of ignoring the rest', async () => {
    const first = join(testDir, 'first.md');
    const second = join(testDir, 'second.md');
    await writeFile(first, '# First\n\nFirst article.');
    await writeFile(second, '# Second\n\nSecond article.');

    const result = await $`bun run ${CLI_PATH} ingest ${first} ${second}`.cwd(wikiDir).nothrow();

    expect(result.exitCode).toBe(1);
    expect(result.stdout.toString() + result.stderr.toString()).toContain('takes one source, got 2');
    // Nothing is ingested, so the user isn't left with half the files added
    const manifest = Bun.file(join(wikiDir, 'raw', '_manifest.json'));
    const entries = (await manifest.exists()) ? (await manifest.json()).entries : [];
    expect(entries).toEqual([]);
  });

  test('explains that a local folder or repository is not a source', async () => {
    const repo = join(testDir, 'my-repo');
    await mkdir(join(repo, '.git'), { recursive: true });
    await writeFile(join(repo, 'README.md'), '# My Repo\n\nWhat it does.');

    const result = await $`bun run ${CLI_PATH} ingest ${repo}`.cwd(wikiDir).nothrow();
    const text = result.stdout.toString() + result.stderr.toString();

    expect(result.exitCode).toBe(1);
    expect(text).not.toContain('File not found');
    expect(text).toContain('is a directory');
    expect(text).toContain(join(repo, 'README.md'));
  });
});
