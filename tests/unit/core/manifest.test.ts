/**
 * Unit tests for manifest operations
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  loadManifest,
  saveManifest,
  addEntry,
  removeEntry,
  findEntryByHash,
  findEntryByPath,
  updateEntry,
  computeHash,
  createManifest,
} from '../../../src/core/manifest';
import { createEmptyManifest, type ManifestEntry } from '../../../src/core/schemas';

describe('manifest operations', () => {
  let testDir: string;
  let manifestPath: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'kb-manifest-test-'));
    manifestPath = join(testDir, '_manifest.json');
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('createManifest', () => {
    test('creates empty manifest file', async () => {
      await createManifest(manifestPath);

      const file = Bun.file(manifestPath);
      expect(await file.exists()).toBe(true);

      const content = await file.json();
      expect(content.version).toBe(1);
      expect(content.entries).toEqual([]);
    });
  });

  describe('loadManifest', () => {
    test('loads existing manifest', async () => {
      const manifest = createEmptyManifest();
      await Bun.write(manifestPath, JSON.stringify(manifest));

      const loaded = await loadManifest(manifestPath);
      expect(loaded.version).toBe(1);
      expect(loaded.entries).toEqual([]);
    });

    test('throws on missing manifest', async () => {
      await expect(loadManifest(manifestPath)).rejects.toThrow();
    });

    test('throws on invalid JSON', async () => {
      await Bun.write(manifestPath, 'not json');
      await expect(loadManifest(manifestPath)).rejects.toThrow();
    });
  });

  describe('saveManifest', () => {
    test('saves manifest to file', async () => {
      const manifest = createEmptyManifest();
      manifest.entries.push({
        path: 'test.md',
        title: 'Test',
        hash: 'abc123',
        type: 'article',
        dateAdded: new Date().toISOString(),
      });

      await saveManifest(manifestPath, manifest);

      const loaded = await loadManifest(manifestPath);
      expect(loaded.entries).toHaveLength(1);
      expect(loaded.entries[0].path).toBe('test.md');
    });
  });

  describe('addEntry', () => {
    test('adds entry to manifest', () => {
      const manifest = createEmptyManifest();
      const entry: ManifestEntry = {
        path: 'articles/test.md',
        title: 'Test Article',
        hash: 'abc123',
        type: 'article',
        dateAdded: new Date().toISOString(),
      };

      const updated = addEntry(manifest, entry);

      expect(updated.entries).toHaveLength(1);
      expect(updated.entries[0].path).toBe('articles/test.md');
    });

    test('does not mutate original manifest', () => {
      const manifest = createEmptyManifest();
      const entry: ManifestEntry = {
        path: 'articles/test.md',
        title: 'Test Article',
        hash: 'abc123',
        type: 'article',
        dateAdded: new Date().toISOString(),
      };

      addEntry(manifest, entry);

      expect(manifest.entries).toHaveLength(0);
    });
  });

  describe('removeEntry', () => {
    test('removes entry by path', () => {
      const manifest = createEmptyManifest();
      manifest.entries.push({
        path: 'articles/test.md',
        title: 'Test',
        hash: 'abc123',
        type: 'article',
        dateAdded: new Date().toISOString(),
      });

      const updated = removeEntry(manifest, 'articles/test.md');

      expect(updated.entries).toHaveLength(0);
    });

    test('returns unchanged manifest if path not found', () => {
      const manifest = createEmptyManifest();
      manifest.entries.push({
        path: 'articles/test.md',
        title: 'Test',
        hash: 'abc123',
        type: 'article',
        dateAdded: new Date().toISOString(),
      });

      const updated = removeEntry(manifest, 'articles/other.md');

      expect(updated.entries).toHaveLength(1);
    });
  });

  describe('findEntryByHash', () => {
    test('finds entry by hash', () => {
      const manifest = createEmptyManifest();
      manifest.entries.push({
        path: 'articles/test.md',
        title: 'Test',
        hash: 'abc123',
        type: 'article',
        dateAdded: new Date().toISOString(),
      });

      const found = findEntryByHash(manifest, 'abc123');

      expect(found).not.toBeNull();
      expect(found?.path).toBe('articles/test.md');
    });

    test('returns null if hash not found', () => {
      const manifest = createEmptyManifest();

      const found = findEntryByHash(manifest, 'nonexistent');

      expect(found).toBeNull();
    });
  });

  describe('findEntryByPath', () => {
    test('finds entry by path', () => {
      const manifest = createEmptyManifest();
      manifest.entries.push({
        path: 'articles/test.md',
        title: 'Test',
        hash: 'abc123',
        type: 'article',
        dateAdded: new Date().toISOString(),
      });

      const found = findEntryByPath(manifest, 'articles/test.md');

      expect(found).not.toBeNull();
      expect(found?.hash).toBe('abc123');
    });
  });

  describe('updateEntry', () => {
    test('updates existing entry', () => {
      const manifest = createEmptyManifest();
      manifest.entries.push({
        path: 'articles/test.md',
        title: 'Test',
        hash: 'abc123',
        type: 'article',
        dateAdded: new Date().toISOString(),
      });

      const updated = updateEntry(manifest, 'articles/test.md', { hash: 'xyz789' });

      expect(updated.entries[0].hash).toBe('xyz789');
      expect(updated.entries[0].title).toBe('Test'); // Unchanged
    });
  });

  describe('computeHash', () => {
    test('computes consistent hash for same content', async () => {
      const content = 'Hello, World!';
      const hash1 = await computeHash(content);
      const hash2 = await computeHash(content);

      expect(hash1).toBe(hash2);
    });

    test('computes different hash for different content', async () => {
      const hash1 = await computeHash('Hello');
      const hash2 = await computeHash('World');

      expect(hash1).not.toBe(hash2);
    });

    test('returns hex string', async () => {
      const hash = await computeHash('test');

      expect(hash).toMatch(/^[a-f0-9]+$/);
    });
  });
});
