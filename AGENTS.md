# kb Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-03

## Active Technologies
- JSON files only (no SQLite), git-friendly diffs (001-kb-cli-tool)
- TypeScript on Bun >= 1.0.0 + `@oakoliver/bubbletea`, `@oakoliver/bubbles`, `@oakoliver/lipgloss`, `@oakoliver/glamour`, `@oakoliver/huh`, `bm25s`, `pageindex`, `zod` (003-kb-studio-tui)
- Local filesystem only; JSON manifests/config plus markdown content in `.kb/`, `raw/`, `wiki/`, and `queries/` (003-kb-studio-tui)

- TypeScript (Bun >= 1.0.0, pure TypeScript with no transpilation) + @oakoliver/lipgloss ^1.0.2, @oakoliver/glamour ^1.0.1, @oakoliver/huh ^1.0.1, @oakoliver/bubbles ^1.0.3, bm25s ^1.0.1, pageindex ^1.0.1, zod ^3.x (001-kb-cli-tool)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript (Bun >= 1.0.0, pure TypeScript with no transpilation): Follow standard conventions

## Recent Changes
- 003-kb-studio-tui: Added TypeScript on Bun >= 1.0.0 + `@oakoliver/bubbletea`, `@oakoliver/bubbles`, `@oakoliver/lipgloss`, `@oakoliver/glamour`, `@oakoliver/huh`, `bm25s`, `pageindex`, `zod`
- 001-kb-cli-tool: Added TypeScript (Bun >= 1.0.0, pure TypeScript with no transpilation) + @oakoliver/lipgloss ^1.0.2, @oakoliver/glamour ^1.0.1, @oakoliver/huh ^1.0.1, @oakoliver/bubbles ^1.0.3, bm25s ^1.0.1, pageindex ^1.0.1, zod ^3.x

- 001-kb-cli-tool: Added TypeScript (Bun >= 1.0.0, pure TypeScript with no transpilation) + @oakoliver/lipgloss ^1.0.2, @oakoliver/glamour ^1.0.1, @oakoliver/huh ^1.0.1, @oakoliver/bubbles ^1.0.3, bm25s ^1.0.1, pageindex ^1.0.1, zod ^3.x

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
