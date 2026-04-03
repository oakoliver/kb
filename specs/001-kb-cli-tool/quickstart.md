# Quickstart: @oakoliver/kb

**Date**: 2026-04-03  
**Feature**: 001-kb-cli-tool

This guide helps developers get started implementing the kb CLI tool.

---

## Prerequisites

- Bun >= 1.0.0
- Anthropic API key (`ANTHROPIC_API_KEY`) or OpenAI API key (`OPENAI_API_KEY`)

---

## Project Setup

```bash
# Initialize project
bun init

# Install dependencies
bun add @oakoliver/lipgloss @oakoliver/glamour @oakoliver/huh @oakoliver/bubbles
bun add bm25s pageindex zod

# Dev dependencies
bun add -d @types/bun
```

### package.json

```json
{
  "name": "@oakoliver/kb",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "kb": "./src/cli.ts"
  },
  "scripts": {
    "dev": "bun run ./src/cli.ts",
    "test": "bun test",
    "build": "bun build --compile ./src/cli.ts --outfile ./dist/kb"
  }
}
```

---

## Implementation Order

Follow this order to build incrementally testable features:

### Phase 1: Core Infrastructure (P1 Stories)

1. **Arg parser** (`src/cli.ts`)
   - Parse subcommands and flags
   - Route to command handlers
   - Exit code handling

2. **Output module** (`src/output/format.ts`)
   - TTY detection
   - JSON vs human-readable formatting
   - Style helpers with lipgloss

3. **Resolver** (`src/core/resolver.ts`)
   - Find wiki root (traverse up)
   - Check global `~/.kb/`
   - Return paths or "no wiki found"

4. **Config** (`src/core/config.ts`)
   - Load `.kb/config.json`
   - Validate with Zod schema
   - Default values

### Phase 2: Init Command (User Story 1)

5. **Init command** (`src/commands/init.ts`)
   - Create directory structure
   - Generate config.json
   - Generate instructions.md

### Phase 3: Ingest Command (User Story 2)

6. **Manifest** (`src/core/manifest.ts`)
   - Load/save `raw/_manifest.json`
   - Add/check entries
   - Hash computation

7. **URL fetcher** (`src/ingest/url.ts`)
   - Fetch HTML
   - Convert to markdown
   - Extract images

8. **PDF extractor** (`src/ingest/pdf.ts`)
   - Use pageindex for extraction
   - Handle OCR if needed

9. **Ingest command** (`src/commands/ingest.ts`)
   - Detect source type
   - Call appropriate handler
   - Update manifest

### Phase 4: Compile Command (User Story 3)

10. **LLM provider** (`src/llm/provider.ts`)
    - Anthropic implementation
    - OpenAI implementation
    - Unified interface

11. **Prompts** (`src/llm/prompts.ts`)
    - Concept extraction prompt
    - Entity extraction prompt
    - Synthesis prompt

12. **Markdown utils** (`src/core/markdown.ts`)
    - Parse frontmatter
    - Extract wikilinks
    - Serialize frontmatter

13. **Graph** (`src/core/graph.ts`)
    - Load/save dependency graph
    - Mark stale articles
    - Get dependents

14. **Compile command** (`src/commands/compile.ts`)
    - Detect changed sources
    - Extract concepts/entities
    - Generate wikilinks
    - Build index

### Phase 5: Search Commands (User Stories 4-5)

15. **BM25 index** (`src/index/bm25.ts`)
    - Build index from wiki
    - Search with ranking
    - Persist index

16. **Find command** (`src/commands/find.ts`)
    - Search with BM25
    - Format results

17. **Query command** (`src/commands/query.ts`)
    - Use pageindex tree-search
    - Stream LLM response
    - File output

### Phase 6: Maintenance Commands (User Stories 6-8)

18. **Lint command** (`src/commands/lint.ts`)
    - Validate wikilinks
    - Detect orphans
    - Check frontmatter

19. **Status command** (`src/commands/status.ts`)
    - Count articles by type
    - Show health metrics

20. **Promote command** (`src/commands/promote.ts`)
    - Move query to wiki
    - Add backlinks
    - Update index

---

## Key Code Patterns

### TTY-Aware Output

```typescript
import { newStyle } from '@oakoliver/lipgloss';

const isTTY = process.stdout.isTTY ?? false;
const successStyle = newStyle().foreground('#04B575');

function output<T>(data: T, humanFormat: (d: T) => string): void {
  if (isTTY) {
    console.log(humanFormat(data));
  } else {
    console.log(JSON.stringify(data));
  }
}
```

### Zod Schema Validation

```typescript
import { z } from 'zod';

const ConfigSchema = z.object({
  version: z.literal(1),
  llm: z.object({
    provider: z.enum(['anthropic', 'openai']),
    model: z.string().default('claude-sonnet-4-20250514'),
  }),
});

function loadConfig(path: string): Config {
  const raw = JSON.parse(Bun.file(path).text());
  return ConfigSchema.parse(raw); // Throws on invalid
}
```

### Progress Spinner

```typescript
import { newSpinner, Dot } from '@oakoliver/bubbles';

async function withSpinner<T>(message: string, fn: () => Promise<T>): Promise<T> {
  const spinner = newSpinner(Dot);
  const interval = setInterval(() => {
    process.stdout.write(`\r${spinner.view()} ${message}`);
    spinner.tick();
  }, 100);
  
  try {
    return await fn();
  } finally {
    clearInterval(interval);
    process.stdout.write('\r\x1b[K'); // Clear line
  }
}
```

### LLM Streaming

```typescript
async function* streamResponse(provider: LLMProvider, request: LLMRequest) {
  for await (const delta of provider.stream(request)) {
    if (delta.type === 'text') {
      yield delta.text;
    }
  }
}

// Usage
for await (const chunk of streamResponse(provider, request)) {
  process.stdout.write(chunk);
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// tests/unit/core/manifest.test.ts
import { describe, test, expect } from 'bun:test';
import { addEntry, checkDuplicate } from '../../../src/core/manifest';

describe('manifest', () => {
  test('detects duplicate by hash', () => {
    const manifest = { version: 1, entries: [{ hash: 'abc123', ... }] };
    expect(checkDuplicate(manifest, 'abc123')).toBe(true);
  });
});
```

### Integration Tests

```typescript
// tests/integration/init.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { $ } from 'bun';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

describe('kb init', () => {
  let testDir: string;
  
  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'kb-test-'));
  });
  
  afterEach(async () => {
    await rm(testDir, { recursive: true });
  });
  
  test('creates directory structure', async () => {
    const result = await $`bun run ./src/cli.ts init test-wiki`
      .cwd(testDir)
      .nothrow();
    
    expect(result.exitCode).toBe(0);
    expect(await Bun.file(join(testDir, 'test-wiki/.kb/config.json')).exists()).toBe(true);
  });
});
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | One of | Anthropic API key |
| `OPENAI_API_KEY` | One of | OpenAI API key |

---

## File Structure Reference

```
src/
├── cli.ts               # Entry point
├── commands/
│   ├── init.ts
│   ├── ingest.ts
│   ├── compile.ts
│   ├── find.ts
│   ├── query.ts
│   ├── lint.ts
│   ├── status.ts
│   └── promote.ts
├── core/
│   ├── config.ts
│   ├── manifest.ts
│   ├── graph.ts
│   ├── markdown.ts
│   ├── resolver.ts
│   └── schemas.ts
├── index/
│   ├── bm25.ts
│   └── pageindex.ts
├── llm/
│   ├── provider.ts
│   ├── prompts.ts
│   └── stream.ts
├── ingest/
│   ├── url.ts
│   ├── pdf.ts
│   ├── file.ts
│   └── git.ts
└── output/
    ├── format.ts
    ├── progress.ts
    └── render.ts
```

---

## Next Steps

1. Run `/speckit.tasks` to generate the task breakdown
2. Implement Phase 1 (Core Infrastructure) first
3. Each command can be tested independently
4. Use `bun test --watch` during development
