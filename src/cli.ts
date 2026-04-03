#!/usr/bin/env bun
/**
 * kb - CLI tool for LLM-compiled knowledge bases
 * @module cli
 */

import { error, output, isTTY, styles, symbols } from './output/format';
import init from './commands/init';
import ingest from './commands/ingest';
import compile from './commands/compile';
import find from './commands/find';
import query from './commands/query';
import lint from './commands/lint';
import status from './commands/status';
import promote from './commands/promote';

// =============================================================================
// Version and Help
// =============================================================================

const VERSION = '0.1.0';

const HELP = `
${styles.bold.render('kb')} - CLI tool for LLM-compiled knowledge bases

${styles.bold.render('USAGE')}
  kb <command> [options]

${styles.bold.render('COMMANDS')}
  init [path]         Initialize a new knowledge base
  ingest <source>     Add a source (URL, file, or git repo)
  compile             Compile sources into wiki articles
  find <query>        Fast keyword search using BM25
  query <question>    Ask a question with LLM synthesis
  lint                Check wiki health
  status              Show wiki statistics
  promote <file>      Move a query output into the wiki

${styles.bold.render('GLOBAL OPTIONS')}
  --help, -h          Show help
  --version, -v       Show version
  --json              Force JSON output

${styles.bold.render('EXAMPLES')}
  kb init my-wiki
  kb ingest https://example.com/article
  kb ingest ./notes/meeting.md
  kb compile
  kb find "attention mechanism"
  kb query "What is the transformer architecture?"
  kb lint --fix
  kb status
  kb promote queries/2024-01-01-question.md

${styles.bold.render('ENVIRONMENT')}
  ANTHROPIC_API_KEY   Anthropic API key (for Claude models)
  OPENAI_API_KEY      OpenAI API key (for GPT models)

${styles.dim.render('For more information, visit: https://github.com/oakoliver/kb')}
`;

// =============================================================================
// Argument Parsing
// =============================================================================

export interface ParsedArgs {
  command: string | null;
  flags: Record<string, string | boolean>;
  positionals: string[];
}

/**
 * Parse command line arguments
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2); // Remove 'bun' and script path
  const flags: Record<string, string | boolean> = {};
  const positionals: string[] = [];
  let command: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      // Long flag
      const equalIndex = arg.indexOf('=');
      if (equalIndex !== -1) {
        // --flag=value
        const key = arg.slice(2, equalIndex);
        const value = arg.slice(equalIndex + 1);
        flags[key] = value;
      } else {
        // --flag or --flag value
        const key = arg.slice(2);
        const nextArg = args[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          // Check if it looks like a value (not a command or flag)
          if (isValueLike(nextArg)) {
            flags[key] = nextArg;
            i++;
          } else {
            flags[key] = true;
          }
        } else {
          flags[key] = true;
        }
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      // Short flag (-h, -v, etc.)
      const key = arg[1];
      flags[key] = true;
    } else if (command === null) {
      // First non-flag argument is the command
      command = arg;
    } else {
      // Subsequent non-flag arguments are positionals
      positionals.push(arg);
    }
  }

  return { command, flags, positionals };
}

/**
 * Check if a string looks like a flag value (not a command)
 */
function isValueLike(arg: string): boolean {
  // If it's a known command, it's not a value
  const commands = ['init', 'ingest', 'compile', 'find', 'query', 'lint', 'status', 'promote'];
  return !commands.includes(arg);
}

/**
 * Normalize flag aliases
 */
export function normalizeFlags(flags: Record<string, string | boolean>): Record<string, string | boolean> {
  const normalized = { ...flags };

  // Alias mappings
  if (normalized.h) {
    normalized.help = true;
    delete normalized.h;
  }
  if (normalized.v) {
    normalized.version = true;
    delete normalized.v;
  }

  return normalized;
}

// =============================================================================
// Command Types
// =============================================================================

export type CommandName = 'init' | 'ingest' | 'compile' | 'find' | 'query' | 'lint' | 'status' | 'promote';

export interface CommandContext {
  flags: Record<string, string | boolean>;
  positionals: string[];
}

export type CommandHandler = (ctx: CommandContext) => Promise<number>;

// =============================================================================
// Command Registry
// =============================================================================

const commands: Record<CommandName, CommandHandler | null> = {
  init: init,
  ingest: ingest,
  compile: compile,
  find: find,
  query: query,
  lint: lint,
  status: status,
  promote: promote,
};

/**
 * Register a command handler
 */
export function registerCommand(name: CommandName, handler: CommandHandler): void {
  commands[name] = handler;
}

/**
 * Check if a command is registered
 */
export function isCommand(name: string): name is CommandName {
  return name in commands;
}

// =============================================================================
// Main Entry Point
// =============================================================================

async function main(): Promise<number> {
  const { command, flags: rawFlags, positionals } = parseArgs(process.argv);
  const flags = normalizeFlags(rawFlags);

  // Handle --version
  if (flags.version) {
    if (isTTY) {
      console.log(`kb version ${VERSION}`);
    } else {
      output({ version: VERSION });
    }
    return 0;
  }

  // Handle --help or no command
  if (flags.help || command === null) {
    if (isTTY) {
      console.log(HELP);
    } else {
      output({
        version: VERSION,
        commands: Object.keys(commands),
      });
    }
    return 0;
  }

  // Validate command
  if (!isCommand(command)) {
    error(`Unknown command: ${command}`, `Run 'kb --help' for usage information.`);
    return 2;
  }

  // Get command handler
  const handler = commands[command];
  if (!handler) {
    error(`Command '${command}' is not yet implemented.`, 'This feature is coming soon.');
    return 1;
  }

  // Execute command
  try {
    const exitCode = await handler({ flags, positionals });
    return exitCode;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    error(message);
    return 1;
  }
}

// =============================================================================
// Run
// =============================================================================

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
