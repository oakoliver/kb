import { describe, expect, test } from 'bun:test';
import { parseFrontmatterSimple } from '../../../src/tui/document';
import { createArticle } from '../../../src/core/markdown';

describe('parseFrontmatterSimple', () => {
  test('unquotes titles the way kb writes them', () => {
    const article = createArticle(
      {
        title: 'Say "hello"',
        type: 'concept',
        created: '2026-01-01T00:00:00Z',
        updated: '2026-01-01T00:00:00Z',
        sources: [],
        related: [],
      } as never,
      '# Body\n',
    );
    expect(parseFrontmatterSimple(article).title).toBe('Say "hello"');
  });

  test('accepts single-quoted and unquoted values', () => {
    expect(parseFrontmatterSimple("---\ntitle: 'It''s here'\ntype: entity\n---\n").title).toBe("It's here");
    expect(parseFrontmatterSimple('---\ntitle: Plain\ntype: "concept"\n---\n')).toMatchObject({ title: 'Plain', type: 'concept' });
  });
});
