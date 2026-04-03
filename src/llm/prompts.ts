/**
 * LLM prompts for knowledge base compilation
 * @module llm/prompts
 */

import type { ArticleType, Frontmatter } from '../core/schemas';

// =============================================================================
// System Prompts
// =============================================================================

/**
 * Base system prompt for all compilation tasks
 */
export const SYSTEM_PROMPT_BASE = `You are an expert knowledge base compiler. Your task is to transform raw source material into well-structured wiki articles.

Guidelines:
- Write clear, concise, and accurate content
- Use wikilinks [[Like This]] to reference related concepts
- Maintain academic/technical tone appropriate for a knowledge base
- Preserve important details and citations from sources
- Structure content with clear headings and sections
- Focus on explaining concepts clearly for future reference`;

/**
 * System prompt for concept extraction
 */
export const SYSTEM_PROMPT_CONCEPTS = `${SYSTEM_PROMPT_BASE}

You are extracting CONCEPTS from source material. A concept is an abstract idea, technique, or principle that can be explained and linked to other concepts.

Examples of concepts:
- "Attention Mechanism" - a technique in neural networks
- "Recursion" - a programming concept
- "Market Equilibrium" - an economic principle

For each concept:
1. Write a clear definition
2. Explain how it works
3. Provide examples if applicable
4. Link to related concepts using [[wikilinks]]`;

/**
 * System prompt for entity extraction
 */
export const SYSTEM_PROMPT_ENTITIES = `${SYSTEM_PROMPT_BASE}

You are extracting ENTITIES from source material. An entity is a named thing - a person, organization, product, model, or specific implementation.

Examples of entities:
- "GPT-4" - a specific AI model
- "OpenAI" - an organization
- "Transformer" - a specific architecture (when referring to THE Transformer from the paper)

For each entity:
1. Provide key facts and details
2. Explain its significance
3. Link to related concepts and entities using [[wikilinks]]
4. Include relevant dates, creators, or origins`;

/**
 * System prompt for synthesis generation
 */
export const SYSTEM_PROMPT_SYNTHESIS = `${SYSTEM_PROMPT_BASE}

You are creating a SYNTHESIS article that combines information from multiple sources into a coherent overview.

Guidelines:
1. Identify common themes across sources
2. Compare and contrast different perspectives
3. Create a unified narrative
4. Use [[wikilinks]] to reference concepts and entities
5. Cite sources appropriately`;

/**
 * System prompt for Q&A
 */
export const SYSTEM_PROMPT_QA = `You are a helpful knowledge base assistant. Answer questions based on the provided wiki articles.

Guidelines:
- Base your answers on the provided context
- Cite relevant articles using [[wikilinks]]
- If the answer isn't in the provided context, say so
- Be concise but thorough
- Use markdown formatting for clarity`;

// =============================================================================
// Extraction Prompts
// =============================================================================

/**
 * Generate prompt for extracting concepts from a source
 */
export function conceptExtractionPrompt(sourceContent: string, sourceTitle: string): string {
  return `Analyze the following source material and extract the key CONCEPTS that should be documented in a knowledge base.

SOURCE TITLE: ${sourceTitle}

SOURCE CONTENT:
${sourceContent}

---

For each concept you identify:
1. Provide a clear title
2. Write a comprehensive explanation (2-4 paragraphs)
3. Include relevant examples
4. List related concepts that should be linked

Output your response in the following format:

## Concept: [Concept Title]

[Explanation with [[wikilinks]] to related concepts]

### Related
- [[Related Concept 1]]
- [[Related Concept 2]]

---

Identify and document all significant concepts from this source.`;
}

/**
 * Generate prompt for extracting entities from a source
 */
export function entityExtractionPrompt(sourceContent: string, sourceTitle: string): string {
  return `Analyze the following source material and extract the key ENTITIES (named things) that should be documented in a knowledge base.

SOURCE TITLE: ${sourceTitle}

SOURCE CONTENT:
${sourceContent}

---

For each entity you identify:
1. Provide the exact name
2. State what type of entity it is (person, organization, model, product, etc.)
3. Summarize key facts
4. Explain its significance

Output your response in the following format:

## Entity: [Entity Name]

**Type**: [person/organization/model/product/etc.]

[Description with [[wikilinks]] to related concepts and entities]

### Key Facts
- Fact 1
- Fact 2

---

Identify and document all significant entities from this source.`;
}

/**
 * Generate prompt for creating a synthesis from multiple sources
 */
export function synthesisPrompt(
  sources: Array<{ title: string; content: string }>,
  topic: string
): string {
  const sourceList = sources
    .map((s, i) => `### Source ${i + 1}: ${s.title}\n\n${s.content}`)
    .join('\n\n---\n\n');

  return `Create a synthesis article about "${topic}" by combining information from the following sources.

${sourceList}

---

Create a comprehensive synthesis that:
1. Identifies common themes across all sources
2. Compares different perspectives or approaches
3. Provides a unified overview of the topic
4. Uses [[wikilinks]] to reference related concepts and entities
5. Maintains a neutral, encyclopedic tone

Structure the article with clear sections and headings.`;
}

// =============================================================================
// Article Generation Prompts
// =============================================================================

/**
 * Generate prompt for creating an article from extracted content
 */
export function articleGenerationPrompt(
  extractedContent: string,
  articleType: ArticleType,
  title: string,
  existingArticles: string[]
): string {
  const wikilinkContext =
    existingArticles.length > 0
      ? `\nExisting articles you can link to:\n${existingArticles.map((a) => `- [[${a}]]`).join('\n')}`
      : '';

  return `Create a well-structured ${articleType} article titled "${title}".

EXTRACTED CONTENT:
${extractedContent}
${wikilinkContext}

---

Write a complete article that:
1. Has a clear introduction explaining what this ${articleType} is
2. Uses proper markdown headings for organization
3. Links to related articles using [[wikilinks]]
4. Is comprehensive but concise
5. Ends with a "See Also" section linking related articles

Do NOT include YAML frontmatter - just the article content starting with the main heading.`;
}

/**
 * Generate prompt for suggesting related articles
 */
export function relatedArticlesPrompt(
  articleContent: string,
  articleTitle: string,
  existingArticles: string[]
): string {
  return `Given the following article and list of existing articles, suggest which articles should be linked as "related".

ARTICLE TITLE: ${articleTitle}

ARTICLE CONTENT:
${articleContent}

EXISTING ARTICLES:
${existingArticles.map((a) => `- ${a}`).join('\n')}

---

List the most relevant existing articles that should be linked from this article. Return only article titles, one per line.`;
}

// =============================================================================
// Q&A Prompts
// =============================================================================

/**
 * Generate prompt for answering a question
 */
export function questionAnswerPrompt(
  question: string,
  relevantArticles: Array<{ title: string; content: string }>
): string {
  const context = relevantArticles
    .map((a) => `## ${a.title}\n\n${a.content}`)
    .join('\n\n---\n\n');

  return `Answer the following question based on the provided wiki articles.

QUESTION: ${question}

CONTEXT:
${context}

---

Provide a clear, comprehensive answer based on the above context. Cite relevant articles using [[wikilinks]].

If the information needed to answer the question is not in the provided context, clearly state that.`;
}

// =============================================================================
// Index Generation
// =============================================================================

/**
 * Generate the wiki index markdown
 */
export function generateIndex(
  articles: Array<{ title: string; type: ArticleType; path: string }>
): string {
  const grouped: Record<ArticleType, Array<{ title: string; path: string }>> = {
    concept: [],
    entity: [],
    synthesis: [],
    query: [],
  };

  for (const article of articles) {
    grouped[article.type].push({ title: article.title, path: article.path });
  }

  // Sort each group alphabetically
  for (const type of Object.keys(grouped) as ArticleType[]) {
    grouped[type].sort((a, b) => a.title.localeCompare(b.title));
  }

  const lines: string[] = ['# Index', ''];

  if (grouped.concept.length > 0) {
    lines.push('## Concepts', '');
    for (const article of grouped.concept) {
      lines.push(`- [[${article.title}]]`);
    }
    lines.push('');
  }

  if (grouped.entity.length > 0) {
    lines.push('## Entities', '');
    for (const article of grouped.entity) {
      lines.push(`- [[${article.title}]]`);
    }
    lines.push('');
  }

  if (grouped.synthesis.length > 0) {
    lines.push('## Syntheses', '');
    for (const article of grouped.synthesis) {
      lines.push(`- [[${article.title}]]`);
    }
    lines.push('');
  }

  if (lines.length === 2) {
    lines.push('_No articles yet. Run `kb compile` after ingesting sources._');
  }

  return lines.join('\n');
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Estimate token count (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit within token limit
 */
export function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) {
    return text;
  }
  return text.slice(0, maxChars - 100) + '\n\n[Content truncated...]';
}
