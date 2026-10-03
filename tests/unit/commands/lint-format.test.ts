/**
 * Unit tests for kb lint TTY formatting
 */

import { describe, test, expect } from 'bun:test';
import { formatIssue } from '../../../src/commands/lint';
import { stripAnsi } from '@oakoliver/lipgloss';

describe('lint formatIssue', () => {
  test('distinguishes a broken link in the body from one in related', () => {
    const base = { type: 'broken_link' as const, file: 'wiki/concepts/a.md', link: '[[Gone]]' };
    const body = stripAnsi(formatIssue({ ...base, message: 'Broken link to [[Gone]]', location: 'body' }));
    const related = stripAnsi(formatIssue({ ...base, message: 'Broken link in related: [[Gone]]', location: 'related' }));

    expect(body).toBe('Broken link: wiki/concepts/a.md → [[Gone]] (in body)');
    expect(related).toBe('Broken link: wiki/concepts/a.md → [[Gone]] (in related)');
  });
});
