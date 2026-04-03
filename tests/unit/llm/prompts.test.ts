/**
 * Unit tests for LLM prompts
 */

import { describe, test, expect } from 'bun:test';
import {
  SYSTEM_PROMPT_BASE,
  SYSTEM_PROMPT_CONCEPTS,
  SYSTEM_PROMPT_ENTITIES,
  SYSTEM_PROMPT_SYNTHESIS,
  SYSTEM_PROMPT_QA,
  conceptExtractionPrompt,
  entityExtractionPrompt,
  synthesisPrompt,
  articleGenerationPrompt,
  relatedArticlesPrompt,
  questionAnswerPrompt,
  generateIndex,
  estimateTokens,
  truncateToTokens,
} from '../../../src/llm/prompts';
import type { ArticleType } from '../../../src/core/schemas';

describe('system prompts', () => {
  test('SYSTEM_PROMPT_BASE contains key instructions', () => {
    expect(SYSTEM_PROMPT_BASE).toContain('knowledge base compiler');
    expect(SYSTEM_PROMPT_BASE).toContain('wikilinks');
    expect(SYSTEM_PROMPT_BASE).toContain('[[Like This]]');
  });

  test('SYSTEM_PROMPT_CONCEPTS extends base prompt', () => {
    expect(SYSTEM_PROMPT_CONCEPTS).toContain(SYSTEM_PROMPT_BASE);
    expect(SYSTEM_PROMPT_CONCEPTS).toContain('CONCEPTS');
    expect(SYSTEM_PROMPT_CONCEPTS).toContain('abstract idea');
  });

  test('SYSTEM_PROMPT_ENTITIES extends base prompt', () => {
    expect(SYSTEM_PROMPT_ENTITIES).toContain(SYSTEM_PROMPT_BASE);
    expect(SYSTEM_PROMPT_ENTITIES).toContain('ENTITIES');
    expect(SYSTEM_PROMPT_ENTITIES).toContain('named thing');
  });

  test('SYSTEM_PROMPT_SYNTHESIS extends base prompt', () => {
    expect(SYSTEM_PROMPT_SYNTHESIS).toContain(SYSTEM_PROMPT_BASE);
    expect(SYSTEM_PROMPT_SYNTHESIS).toContain('SYNTHESIS');
    expect(SYSTEM_PROMPT_SYNTHESIS).toContain('multiple sources');
  });

  test('SYSTEM_PROMPT_QA contains Q&A instructions', () => {
    expect(SYSTEM_PROMPT_QA).toContain('knowledge base assistant');
    expect(SYSTEM_PROMPT_QA).toContain('wikilinks');
  });
});

describe('extraction prompts', () => {
  test('conceptExtractionPrompt includes source content', () => {
    const prompt = conceptExtractionPrompt(
      '# Attention Mechanism\n\nAttention is a technique...',
      'Attention Paper'
    );

    expect(prompt).toContain('Attention Paper');
    expect(prompt).toContain('Attention is a technique');
    expect(prompt).toContain('CONCEPTS');
    expect(prompt).toContain('[[wikilinks]]');
  });

  test('entityExtractionPrompt includes source content', () => {
    const prompt = entityExtractionPrompt(
      '# GPT-4\n\nGPT-4 is a large language model...',
      'GPT-4 Documentation'
    );

    expect(prompt).toContain('GPT-4 Documentation');
    expect(prompt).toContain('large language model');
    expect(prompt).toContain('ENTITIES');
    expect(prompt).toContain('person, organization');
  });

  test('synthesisPrompt combines multiple sources', () => {
    const prompt = synthesisPrompt(
      [
        { title: 'Source 1', content: 'Content from source 1' },
        { title: 'Source 2', content: 'Content from source 2' },
      ],
      'AI Overview'
    );

    expect(prompt).toContain('AI Overview');
    expect(prompt).toContain('Source 1');
    expect(prompt).toContain('Source 2');
    expect(prompt).toContain('Content from source 1');
    expect(prompt).toContain('synthesis');
  });
});

describe('article generation prompts', () => {
  test('articleGenerationPrompt includes extracted content', () => {
    const prompt = articleGenerationPrompt(
      '## Concept: Attention\n\nAttention mechanism allows...',
      'concept',
      'Attention Mechanism',
      []
    );

    expect(prompt).toContain('Attention Mechanism');
    expect(prompt).toContain('concept');
    expect(prompt).toContain('Attention mechanism allows');
    expect(prompt).toContain('wikilinks');
  });

  test('articleGenerationPrompt includes existing articles for linking', () => {
    const prompt = articleGenerationPrompt(
      'Some content',
      'entity',
      'GPT-4',
      ['Transformer', 'Machine Learning', 'OpenAI']
    );

    expect(prompt).toContain('[[Transformer]]');
    expect(prompt).toContain('[[Machine Learning]]');
    expect(prompt).toContain('[[OpenAI]]');
  });

  test('relatedArticlesPrompt suggests links', () => {
    const prompt = relatedArticlesPrompt(
      '# Attention\n\nThe attention mechanism...',
      'Attention Mechanism',
      ['Transformer', 'BERT', 'GPT']
    );

    expect(prompt).toContain('Attention Mechanism');
    expect(prompt).toContain('Transformer');
    expect(prompt).toContain('BERT');
    expect(prompt).toContain('GPT');
  });
});

describe('Q&A prompts', () => {
  test('questionAnswerPrompt includes question and context', () => {
    const prompt = questionAnswerPrompt('What is attention?', [
      { title: 'Attention Mechanism', content: 'Attention allows models to focus...' },
      { title: 'Transformer', content: 'The Transformer uses attention...' },
    ]);

    expect(prompt).toContain('What is attention?');
    expect(prompt).toContain('Attention Mechanism');
    expect(prompt).toContain('Transformer');
    expect(prompt).toContain('Attention allows models to focus');
    expect(prompt).toContain('[[wikilinks]]');
  });
});

describe('index generation', () => {
  test('generates empty index message when no articles', () => {
    const index = generateIndex([]);

    expect(index).toContain('# Index');
    expect(index).toContain('No articles yet');
  });

  test('groups articles by type', () => {
    const articles: Array<{ title: string; type: ArticleType; path: string }> = [
      { title: 'Attention', type: 'concept', path: 'wiki/concepts/attention.md' },
      { title: 'GPT-4', type: 'entity', path: 'wiki/entities/gpt-4.md' },
      { title: 'Overview', type: 'synthesis', path: 'wiki/syntheses/overview.md' },
      { title: 'Transformer', type: 'concept', path: 'wiki/concepts/transformer.md' },
    ];

    const index = generateIndex(articles);

    expect(index).toContain('## Concepts');
    expect(index).toContain('## Entities');
    expect(index).toContain('## Syntheses');
    expect(index).toContain('[[Attention]]');
    expect(index).toContain('[[GPT-4]]');
    expect(index).toContain('[[Overview]]');
    expect(index).toContain('[[Transformer]]');
  });

  test('sorts articles alphabetically within groups', () => {
    const articles: Array<{ title: string; type: ArticleType; path: string }> = [
      { title: 'Zebra', type: 'concept', path: 'wiki/concepts/zebra.md' },
      { title: 'Apple', type: 'concept', path: 'wiki/concepts/apple.md' },
      { title: 'Mango', type: 'concept', path: 'wiki/concepts/mango.md' },
    ];

    const index = generateIndex(articles);
    const appleIndex = index.indexOf('[[Apple]]');
    const mangoIndex = index.indexOf('[[Mango]]');
    const zebraIndex = index.indexOf('[[Zebra]]');

    expect(appleIndex).toBeLessThan(mangoIndex);
    expect(mangoIndex).toBeLessThan(zebraIndex);
  });

  test('omits empty sections', () => {
    const articles: Array<{ title: string; type: ArticleType; path: string }> = [
      { title: 'Attention', type: 'concept', path: 'wiki/concepts/attention.md' },
    ];

    const index = generateIndex(articles);

    expect(index).toContain('## Concepts');
    expect(index).not.toContain('## Entities');
    expect(index).not.toContain('## Syntheses');
  });
});

describe('token utilities', () => {
  test('estimateTokens provides rough count', () => {
    // ~4 characters per token
    const text = 'This is a test sentence with some words.';
    const estimate = estimateTokens(text);

    // 40 characters / 4 = ~10 tokens
    expect(estimate).toBeGreaterThan(5);
    expect(estimate).toBeLessThan(20);
  });

  test('truncateToTokens preserves text under limit', () => {
    const text = 'Short text';
    const result = truncateToTokens(text, 100);

    expect(result).toBe(text);
  });

  test('truncateToTokens cuts text over limit', () => {
    const text = 'A'.repeat(1000); // 1000 characters
    const result = truncateToTokens(text, 50); // ~200 character limit

    expect(result.length).toBeLessThan(text.length);
    expect(result).toContain('[Content truncated...]');
  });
});
