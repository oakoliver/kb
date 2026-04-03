# Research: @oakoliver/kb CLI Tool

**Date**: 2026-04-03  
**Feature**: 001-kb-cli-tool

## Summary

This document consolidates research findings for implementing the `@oakoliver/kb` CLI tool. All technical unknowns have been resolved.

---

## 1. @oakoliver Package Ecosystem

### Decision: Use @oakoliver packages for all TUI functionality

**Rationale**: These packages are explicitly required by project constraints and provide a cohesive, zero-dependency terminal UI ecosystem built on Elm Architecture principles.

**Alternatives Considered**:
- chalk/inquirer/ora: Rejected - not @oakoliver/* packages
- Direct ANSI codes: Rejected - lower level than required, less maintainable

### Package Summary

| Package | Purpose | Key APIs |
|---------|---------|----------|
| `@oakoliver/lipgloss` | CSS-like terminal styling | `newStyle()`, `render()`, `joinVertical/Horizontal()` |
| `@oakoliver/glamour` | Markdown rendering | `render()`, `renderWithTheme()` |
| `@oakoliver/bubbles` | TUI components | `newSpinner(Dot)`, `newProgress()`, `newTable()` |
| `@oakoliver/huh` | Interactive forms | `NewForm()`, `NewGroup()`, `NewInput()`, `NewSelect()`, `Run()` |

### Integration Pattern

```typescript
// Style hierarchy: lipgloss is foundation
import { newStyle } from '@oakoliver/lipgloss';
import { render as renderMarkdown } from '@oakoliver/glamour';
import { newSpinner, Dot } from '@oakoliver/bubbles';
import { NewForm, NewGroup, NewInput, Run } from '@oakoliver/huh';

const titleStyle = newStyle().bold(true).foreground('#7D56F4');
const errorStyle = newStyle().foreground('#FF6B6B').bold(true);
```

---

## 2. Search Implementation (bm25s)

### Decision: Use bm25s for BM25 keyword search

**Rationale**: Zero-dependency, high-performance (4.3M+ tokens/sec indexing), built-in persistence, supports multiple BM25 variants.

**Alternatives Considered**:
- lunr.js: Rejected - not bm25s as specified
- Custom implementation: Rejected - unnecessary complexity

### Key APIs

```typescript
import { BM25, tokenize } from 'bm25s';

// Index
const tokens = tokenize(corpus);
const retriever = new BM25();
retriever.index(tokens, { corpus });

// Search
const results = retriever.retrieve(tokenize([query]), { k: 10 });

// Persist
await retriever.save('./index');
const loaded = await BM25.load('./index', { loadCorpus: true });
```

---

## 3. PDF/Document Processing (pageindex)

### Decision: Use pageindex for PDF extraction and tree-search

**Rationale**: Provides LLM-powered document indexing with tree structure, OCR support for scanned PDFs, and markdown processing.

**Alternatives Considered**:
- pdf-parse directly: Rejected - lacks tree structure and LLM integration
- Custom extraction: Rejected - pageindex handles complexity

### Key APIs

```typescript
import { PageIndex, indexPdf, mdToTree } from 'pageindex';

// PDF indexing
const result = await indexPdf('doc.pdf', {
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-opus-20240229',
});

// Markdown processing
const tree = await mdToTree('README.md', {
  addNodeSummary: true,
  thinning: true,
});
```

---

## 4. LLM Provider Abstraction

### Decision: Unified provider interface with fail-fast error handling

**Rationale**: Project requires both Anthropic and OpenAI support. Fetch-based implementation avoids SDK dependencies. Fail-immediately pattern ensures no partial output on errors.

**Alternatives Considered**:
- Official SDKs: Rejected - adds external dependencies beyond constraints
- Single provider only: Rejected - spec requires both providers

### Architecture

```typescript
interface LLMProvider {
  readonly name: string;
  stream(request: LLMRequest): AsyncGenerator<LLMStreamDelta>;
  complete(request: LLMRequest): Promise<LLMResponse>;
}

class LLMError extends Error {
  constructor(
    public statusCode: number,
    public errorType: string,
    message: string,
    public retryable: boolean = false
  ) { super(message); }
}
```

### Error Handling

| Code | Type | Retryable |
|------|------|-----------|
| 429 | rate_limit | Yes |
| 529 | overloaded | Yes |
| 500-503 | server_error | Yes |
| 400 | invalid_request | No |

### Fail-Fast Pattern

```typescript
async function* stream(request: LLMRequest) {
  const response = await fetch(endpoint, { ... });
  
  // Fail immediately on HTTP error
  if (!response.ok) {
    throw new LLMError(response.status, ...);
  }
  
  // Fail immediately on stream error
  for await (const event of parseSSE(response)) {
    if (event.type === 'error') {
      throw new LLMError(529, event.error.type, event.error.message);
    }
    yield normalizeEvent(event);
  }
}
```

---

## 5. CLI Architecture (Bun)

### Decision: Custom arg parsing with TTY-aware output

**Rationale**: Bun provides native process.argv and TTY detection. Custom parsing avoids commander/yargs dependencies while supporting subcommands and flags.

**Alternatives Considered**:
- commander/yargs: Rejected - external dependencies
- Just positional args: Rejected - insufficient for complex CLI

### Arg Parsing Pattern

```typescript
interface ParsedArgs {
  command: string | null;
  flags: Record<string, string | boolean>;
  positionals: string[];
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  // Parse --flag, --flag=value, -f patterns
  // First non-flag is command, rest are positionals
}
```

### TTY Detection

```typescript
const isTTY = process.stdout.isTTY ?? false;

function output<T>(data: T, humanFormat?: (d: T) => string): void {
  if (isTTY && humanFormat) {
    console.log(humanFormat(data));
  } else {
    console.log(JSON.stringify(data));
  }
}
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error / No results |
| 2 | Invalid arguments |

### bin Configuration

```json
{
  "bin": { "kb": "./src/cli.ts" },
  "scripts": {
    "build": "bun build --compile ./src/cli.ts --outfile ./dist/kb"
  }
}
```

---

## 6. Testing Strategy

### Decision: bun test with subprocess integration tests

**Rationale**: Constitution requires `bun test`. Integration tests via subprocess validate exit codes and JSON output.

### Unit Tests

```typescript
import { describe, test, expect } from 'bun:test';

describe('parseArgs', () => {
  test('parses command', () => {
    expect(parseArgs(['bun', 'cli.ts', 'init']).command).toBe('init');
  });
});
```

### Integration Tests

```typescript
import { $ } from 'bun';

describe('exit codes', () => {
  test('returns 0 on success', async () => {
    const result = await $`bun run ./src/cli.ts help`.nothrow().quiet();
    expect(result.exitCode).toBe(0);
  });
  
  test('outputs valid JSON when piped', async () => {
    const result = await $`bun run ./src/cli.ts status | cat`.nothrow();
    expect(() => JSON.parse(result.stdout.toString())).not.toThrow();
  });
});
```

---

## Resolved Unknowns

All technical unknowns from the Technical Context have been resolved:

| Unknown | Resolution |
|---------|------------|
| @oakoliver/* usage | Documented APIs and integration patterns |
| bm25s usage | Tokenize, index, retrieve, persist APIs |
| pageindex usage | indexPdf, mdToTree for document processing |
| LLM streaming | Fetch-based SSE parsing with fail-fast |
| CLI arg parsing | Custom parser with subcommands |
| TTY detection | `process.stdout.isTTY` |
| Exit codes | 0/1/2 convention |
| Testing | bun test + subprocess integration |
