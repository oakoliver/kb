import { describe, test, expect } from 'bun:test';
import { stripAnsi } from '@oakoliver/lipgloss';
import { formatCompileOutput } from '../../../src/commands/compile';

describe('compile summary', () => {
  test('does not repeat the per-article lines the spinner already printed', () => {
    const text = stripAnsi(
      formatCompileOutput({
        created: ['wiki/concepts/autolyse.md'],
        updated: ['wiki/concepts/hydration.md'],
        deleted: [],
        unchanged: 3,
        duration_ms: 1234,
      }),
    );
    expect(text).not.toContain('autolyse.md');
    expect(text).not.toContain('hydration.md');
    expect(text).toBe('Compiled 2 articles (1 created, 1 updated) in 1.2s');
  });
});
