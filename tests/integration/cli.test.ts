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
