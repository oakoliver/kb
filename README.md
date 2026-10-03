# @oakoliver/kb

CLI tool for LLM-compiled knowledge bases.

![kb init garden, kb ingest of a local note, and kb status showing one new source](https://raw.githubusercontent.com/oakoliver/kb/main/assets/quickstart.gif)

`kb` turns raw source material (web pages, PDFs, Markdown notes, git repositories) into a structured, Obsidian-compatible wiki that an LLM writes and maintains for you. You ingest sources, `kb compile` has the LLM extract concepts, entities and syntheses into linked articles, and then you search the wiki with BM25 or ask it questions with cited answers.

- **Multi-source ingestion**: URLs, PDFs, Markdown files and git repositories
- **LLM-powered compilation**: concept and entity extraction into linked articles, with incremental recompiles of only what changed
- **Obsidian-compatible**: articles with YAML frontmatter and `[[wikilinks]]`
- **Fast offline search**: BM25 keyword search, no LLM call needed
- **Q&A with citations**: natural-language questions answered from your articles
- **TTY-aware output**: readable in a terminal, JSON when piped or with `--json`
- **KB Studio**: `kb studio` opens a full-screen workspace to browse, search and follow links

## Install

`kb` runs on [Bun](https://bun.sh) 1.0 or newer.

```bash
bun add -g @oakoliver/kb
# or
npm install -g @oakoliver/kb   # still needs bun on your PATH
```

`compile` and `query` call an LLM. Set one of:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."   # Claude
export OPENAI_API_KEY="sk-..."          # GPT
```

`init`, `ingest`, `find`, `lint`, `status` and `promote` work without a key.

## Quick start

```bash
kb init my-research            # create raw/, wiki/, queries/ and .kb/config.json
cd my-research

kb ingest https://arxiv.org/abs/1706.03762   # a web page
kb ingest ./notes/meeting-notes.md           # a local file
kb ingest ./papers/research-paper.pdf        # a PDF

kb compile                                   # LLM writes wiki articles
kb find "attention mechanism"                # BM25 search
kb query "How does attention work in transformers?"
```

### Search

`kb find` ranks wiki articles with BM25 and shows a snippet of each match:

![kb find "tomato watering" listing four wiki articles with scores and snippets](https://raw.githubusercontent.com/oakoliver/kb/main/assets/find.png)

### Keep the wiki healthy

`kb lint` checks for broken wikilinks, orphan and stale articles, and invalid frontmatter. `kb lint --fix` removes `related:` entries that point to missing articles; broken links in an article's body are reported but never rewritten:

![kb lint reporting a broken related entry and two broken body links, then kb lint --fix removing the related entry and still reporting the body links](https://raw.githubusercontent.com/oakoliver/kb/main/assets/lint.png)

The search, lint and Studio examples use a small sample garden wiki written by hand in the format `kb compile` produces (see `assets/tapes/demo-fixtures.sh`). No LLM was called to record them.

## KB Studio

`kb studio` opens a full-screen workspace for the knowledge base: an Explorer of the wiki, a document view where wikilinks can be followed, quick open, search, ingest and a command palette.

![kb studio: opening the Tomato article from the Explorer, following its [[Watering]] link, then using Ctrl+P quick open to jump to Companion Planting](https://raw.githubusercontent.com/oakoliver/kb/main/assets/studio.gif)

It needs an interactive terminal of at least 80×24, and a [Nerd Font](https://www.nerdfonts.com/) for its icons.

| Key | Action |
|-----|--------|
| `↑`/`↓`, `j`/`k`, `Enter` | Move in the Explorer and open an article |
| `Tab`, then `Enter` | Focus the next wikilink in the document and follow it |
| `Alt+←` | Go back |
| `Ctrl+P` | Quick open an article by name |
| `Ctrl+Shift+P` | Command palette (compile, lint, …) |
| `Ctrl+Shift+E` / `Ctrl+Shift+F` / `Ctrl+Shift+I` | Explorer / search / ingest in the sidebar |
| `Ctrl+B` / `Ctrl+J` | Toggle the sidebar / the bottom panel |
| `Ctrl+S` | Save a query result |
| `Ctrl+Q` | Quit |

## How it works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Sources   │────▶│  kb ingest  │────▶│    raw/     │
│ URLs, PDFs, │     │             │     │  Markdown   │
│  Markdown   │     └─────────────┘     └──────┬──────┘
└─────────────┘                                │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Answer    │◀────│  kb query   │◀────│ kb compile  │
│  + Sources  │     │   (LLM)     │     │    (LLM)    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌─────────────┐            ▼
                    │  kb find    │◀────┌─────────────┐
                    │   (BM25)    │     │   wiki/     │
                    └─────────────┘     │  Articles   │
                                        └─────────────┘
```

1. **Ingest** sources (URLs, PDFs, markdown, git repos) into `raw/`
2. **Compile** sources into wiki articles with LLM (concepts, entities, syntheses)
3. **Search** with BM25 keywords (`find`) or ask questions with LLM (`query`)

## Commands

![kb --help: usage, commands, global options, examples and environment variables](https://raw.githubusercontent.com/oakoliver/kb/main/assets/help.png)

| Command | Description |
|---------|-------------|
| `kb init [path] [--global]` | Initialize a knowledge base (`--global` creates it at `~/.kb/`) |
| `kb ingest <source> [--type article\|paper\|code] [--title <title>]` | Add a URL, file, PDF or git repo to `raw/` |
| `kb compile [--full] [--dry-run]` | Compile changed sources into wiki articles (LLM) |
| `kb find <query> [--limit <n>]` | BM25 keyword search over the wiki (default limit 10) |
| `kb query <question> [--no-file]` | Answer a question from the wiki with sources (LLM); saved to `queries/` unless `--no-file` |
| `kb lint [--fix]` | Check wiki health: broken links, orphan and stale articles, frontmatter. `--fix` removes `related:` entries that link to missing articles |
| `kb status` | Show source, article and query counts |
| `kb promote <file> [--as concept\|entity\|synthesis]` | Move a saved query answer into the wiki |
| `kb studio` | Open KB Studio, the interactive workspace |

Global options: `--help`, `--version`, `--json` (force JSON output).

## Knowledge base layout

```
my-research/
├── .kb/config.json       # LLM provider and settings
├── raw/                  # ingested sources + _manifest.json
├── wiki/
│   ├── _index.md         # table of contents
│   ├── concepts/
│   ├── entities/
│   ├── syntheses/
│   └── meta/graph.json   # link graph
└── queries/              # saved Q&A answers
```

## Documentation

- [Getting started](docs/getting-started.md)
- [How it works](docs/how-it-works.md)
- [Commands reference](docs/commands.md)
- [Examples](docs/examples.md)
- [Input/output formats](docs/input-output.md)
- [When to use](docs/when-to-use.md)
- [Troubleshooting](docs/troubleshooting.md)

## License

MIT
