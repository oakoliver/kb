/**
 * Unit tests for markdown utilities
 */

import { describe, test, expect } from 'bun:test';
import {
  parseFrontmatter,
  serializeFrontmatter,
  createArticle,
  extractWikilinks,
  toWikilink,
  titleToSlug,
  slugToTitle,
  getArticlePath,
  extractTitle,
  extractSummary,
} from '../../../src/core/markdown';
import type { Frontmatter } from '../../../src/core/schemas';

describe('frontmatter parsing', () => {
  test('parses valid frontmatter', () => {
    const content = `---
title: Test Article
type: concept
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources:
  - source1.md
related:
  - "[[Related Article]]"
---

# Content here`;

    const { frontmatter, body } = parseFrontmatter(content);

    expect(frontmatter).not.toBeNull();
    expect(frontmatter?.title).toBe('Test Article');
    expect(frontmatter?.type).toBe('concept');
    expect(frontmatter?.sources).toEqual(['source1.md']);
    expect(body.trim()).toBe('# Content here');
  });

  test('returns null frontmatter for content without frontmatter', () => {
    const content = '# Just a heading\n\nSome content.';

    const { frontmatter, body } = parseFrontmatter(content);

    expect(frontmatter).toBeNull();
    expect(body).toBe(content);
  });

  test('handles empty arrays', () => {
    const content = `---
title: Test
type: concept
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources: []
related: []
---

Content`;

    const { frontmatter } = parseFrontmatter(content);

    expect(frontmatter?.sources).toEqual([]);
    expect(frontmatter?.related).toEqual([]);
  });
});

describe('frontmatter serialization', () => {
  test('serializes frontmatter correctly', () => {
    const frontmatter: Frontmatter = {
      title: 'Test Article',
      type: 'concept',
      created: '2026-04-01T10:00:00Z',
      updated: '2026-04-01T10:00:00Z',
      sources: ['source1.md', 'source2.md'],
      related: ['[[Related 1]]', '[[Related 2]]'],
      tags: ['test', 'example'],
    };

    const yaml = serializeFrontmatter(frontmatter);

    expect(yaml).toContain('title: "Test Article"');
    expect(yaml).toContain('type: concept');
    expect(yaml).toContain('- source1.md');
    expect(yaml).toContain('- source2.md');
    expect(yaml).toContain('- "[[Related 1]]"');
  });

  test('creates complete article', () => {
    const frontmatter: Frontmatter = {
      title: 'Test',
      type: 'concept',
      created: '2026-04-01T10:00:00Z',
      updated: '2026-04-01T10:00:00Z',
      sources: [],
      related: [],
    };

    const article = createArticle(frontmatter, '# Test\n\nContent here.');

    expect(article).toContain('---');
    expect(article).toContain('title: "Test"');
    expect(article).toContain('# Test');
    expect(article).toContain('Content here.');
  });
});

describe('wikilink extraction', () => {
  test('extracts simple wikilinks', () => {
    const content = 'See [[Article One]] and [[Article Two]] for more.';

    const links = extractWikilinks(content);

    expect(links).toEqual(['Article One', 'Article Two']);
  });

  test('extracts wikilinks with display text', () => {
    const content = 'See [[Article One|custom text]] for details.';

    const links = extractWikilinks(content);

    expect(links).toEqual(['Article One']);
  });

  test('removes duplicates', () => {
    const content = '[[A]] and [[B]] and [[A]] again.';

    const links = extractWikilinks(content);

    expect(links).toEqual(['A', 'B']);
  });

  test('handles content without wikilinks', () => {
    const content = 'No links here.';

    const links = extractWikilinks(content);

    expect(links).toEqual([]);
  });
});

describe('wikilink creation', () => {
  test('creates simple wikilink', () => {
    expect(toWikilink('Article')).toBe('[[Article]]');
  });

  test('creates wikilink with display text', () => {
    expect(toWikilink('Full Title', 'short')).toBe('[[Full Title|short]]');
  });

  test('omits display text if same as title', () => {
    expect(toWikilink('Title', 'Title')).toBe('[[Title]]');
  });
});

describe('slug utilities', () => {
  test('converts title to slug', () => {
    expect(titleToSlug('Hello World')).toBe('hello-world');
    expect(titleToSlug("It's a Test!")).toBe('it-s-a-test');
    expect(titleToSlug('CamelCase')).toBe('camelcase');
  });

  test('converts slug to title', () => {
    expect(slugToTitle('hello-world')).toBe('Hello World');
    expect(slugToTitle('test-article')).toBe('Test Article');
  });

  test('gets article path', () => {
    expect(getArticlePath('Attention Mechanism', 'concept')).toBe('wiki/concepts/attention-mechanism.md');
    expect(getArticlePath('GPT-4', 'entity')).toBe('wiki/entities/gpt-4.md');
    expect(getArticlePath('Overview', 'synthesis')).toBe('wiki/syntheses/overview.md');
  });
});

describe('content extraction', () => {
  test('extracts title from heading', () => {
    expect(extractTitle('# My Title\n\nContent')).toBe('My Title');
    expect(extractTitle('No heading here')).toBeNull();
  });

  test('extracts summary from content', () => {
    const content = `---
title: Test
type: concept
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources: []
related: []
---

# Title

This is the first paragraph that should be extracted as the summary.

This is the second paragraph.`;

    const summary = extractSummary(content);

    expect(summary).toContain('first paragraph');
    expect(summary).not.toContain('second paragraph');
  });
});
