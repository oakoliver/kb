/**
 * Test helper utilities for KB Studio TUI tests
 * @module tests/integration/helpers/studio
 */

import { join } from 'path';
import { mkdtemp, cp, rm } from 'fs/promises';
import { tmpdir } from 'os';

// Path to the studio fixture
const STUDIO_FIXTURE = join(import.meta.dir, '../../fixtures/wikis/studio-wiki');

// Path to CLI entry point
export const CLI_PATH = join(import.meta.dir, '../../../src/cli.ts');

/**
 * Create a temporary copy of the studio fixture for testing
 * Returns the path to the temp wiki and a cleanup function
 */
export async function createStudioFixture(): Promise<{
  wikiDir: string;
  cleanup: () => Promise<void>;
}> {
  const testDir = await mkdtemp(join(tmpdir(), 'kb-studio-test-'));
  const wikiDir = join(testDir, 'studio-wiki');

  // Copy the fixture
  await cp(STUDIO_FIXTURE, wikiDir, { recursive: true });

  return {
    wikiDir,
    cleanup: async () => {
      await rm(testDir, { recursive: true, force: true });
    },
  };
}

/**
 * Fixture metadata for assertions
 */
export const STUDIO_FIXTURE_META = {
  sourceCount: 3,
  articles: {
    concepts: ['attention-mechanism.md', 'self-attention.md'],
    entities: ['transformer.md', 'bert.md'],
    syntheses: ['evolution-of-nlp.md'],
  },
  totalArticles: 5,
  queryCount: 1,
  wikilinks: {
    'attention-mechanism.md': ['Transformer Architecture', 'Self-Attention', 'BERT'],
    'self-attention.md': ['Attention Mechanism', 'Transformer Architecture'],
    'transformer.md': ['Attention Mechanism', 'Self-Attention', 'BERT'],
    'bert.md': ['Transformer Architecture', 'Attention Mechanism'],
    'evolution-of-nlp.md': ['Transformer Architecture', 'Attention Mechanism', 'BERT', 'Self-Attention'],
  },
};
