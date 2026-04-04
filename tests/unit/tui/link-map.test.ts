/**
 * Unit tests for wikilink parsing and link map
 */

import { describe, test, expect } from 'bun:test';
import {
  extractWikilinks,
  findLinkAt,
  nextLinkIndex,
  prevLinkIndex,
  buildLinkTargetMap,
} from '../../../src/tui/link-map';

describe('extractWikilinks', () => {
  test('extracts simple wikilinks', () => {
    const content = 'See [[Transformer Architecture]] for more info.';
    const links = extractWikilinks(content);

    expect(links).toHaveLength(1);
    expect(links[0].target).toBe('Transformer Architecture');
    expect(links[0].displayText).toBe('Transformer Architecture');
    expect(links[0].row).toBe(0);
  });

  test('extracts wikilinks with display text', () => {
    const content = 'Uses [[Attention Mechanism|attention]] heavily.';
    const links = extractWikilinks(content);

    expect(links).toHaveLength(1);
    expect(links[0].target).toBe('Attention Mechanism');
    expect(links[0].displayText).toBe('attention');
  });

  test('extracts multiple links from one line', () => {
    const content = 'See [[BERT]] and [[GPT]] for examples.';
    const links = extractWikilinks(content);

    expect(links).toHaveLength(2);
    expect(links[0].target).toBe('BERT');
    expect(links[1].target).toBe('GPT');
  });

  test('extracts links from multiple lines', () => {
    const content = '# Title\n\nSee [[BERT]] on line 3.\n\nAlso [[GPT]] on line 5.';
    const links = extractWikilinks(content);

    expect(links).toHaveLength(2);
    expect(links[0].row).toBe(2);
    expect(links[1].row).toBe(4);
  });

  test('computes correct column positions', () => {
    const content = 'Prefix [[Link Target]] suffix';
    const links = extractWikilinks(content);

    expect(links[0].colStart).toBe(7);
    expect(links[0].colEnd).toBe(22);
  });

  test('returns empty array for no links', () => {
    const content = 'No links here.';
    const links = extractWikilinks(content);

    expect(links).toHaveLength(0);
  });

  test('handles empty content', () => {
    expect(extractWikilinks('')).toHaveLength(0);
  });

  test('trims whitespace in target and display text', () => {
    const content = '[[  Spaced Target  |  Spaced Display  ]]';
    const links = extractWikilinks(content);

    expect(links[0].target).toBe('Spaced Target');
    expect(links[0].displayText).toBe('Spaced Display');
  });
});

describe('findLinkAt', () => {
  const links = extractWikilinks('Prefix [[Link One]] middle [[Link Two]] end');

  test('finds link at exact position', () => {
    const found = findLinkAt(links, 0, 7);
    expect(found).not.toBeNull();
    expect(found!.target).toBe('Link One');
  });

  test('finds link at end of range', () => {
    const found = findLinkAt(links, 0, 18);
    expect(found).not.toBeNull();
    expect(found!.target).toBe('Link One');
  });

  test('returns null for position between links', () => {
    const found = findLinkAt(links, 0, 22);
    expect(found).toBeNull();
  });

  test('returns null for wrong row', () => {
    const found = findLinkAt(links, 1, 7);
    expect(found).toBeNull();
  });

  test('returns null for empty links', () => {
    expect(findLinkAt([], 0, 0)).toBeNull();
  });
});

describe('nextLinkIndex', () => {
  const links = extractWikilinks('[[A]] [[B]] [[C]]');

  test('advances to next link', () => {
    expect(nextLinkIndex(links, 0)).toBe(1);
    expect(nextLinkIndex(links, 1)).toBe(2);
  });

  test('wraps around from last to first', () => {
    expect(nextLinkIndex(links, 2)).toBe(0);
  });

  test('starts at 0 from -1', () => {
    expect(nextLinkIndex(links, -1)).toBe(0);
  });

  test('returns -1 for empty links', () => {
    expect(nextLinkIndex([], 0)).toBe(-1);
  });
});

describe('prevLinkIndex', () => {
  const links = extractWikilinks('[[A]] [[B]] [[C]]');

  test('goes to previous link', () => {
    expect(prevLinkIndex(links, 2)).toBe(1);
    expect(prevLinkIndex(links, 1)).toBe(0);
  });

  test('wraps around from first to last', () => {
    expect(prevLinkIndex(links, 0)).toBe(2);
  });

  test('returns -1 for empty links', () => {
    expect(prevLinkIndex([], 0)).toBe(-1);
  });
});

describe('buildLinkTargetMap', () => {
  test('maps display names to paths', () => {
    const paths = [
      '/wiki/concepts/attention-mechanism.md',
      '/wiki/entities/transformer.md',
    ];
    const map = buildLinkTargetMap(paths);

    expect(map.get('Attention Mechanism')).toBe('/wiki/concepts/attention-mechanism.md');
    expect(map.get('Transformer')).toBe('/wiki/entities/transformer.md');
  });

  test('handles single-word names', () => {
    const map = buildLinkTargetMap(['/wiki/entities/bert.md']);

    expect(map.get('Bert')).toBe('/wiki/entities/bert.md');
  });

  test('returns empty map for no paths', () => {
    const map = buildLinkTargetMap([]);

    expect(map.size).toBe(0);
  });
});
