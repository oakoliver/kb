/**
 * Output formatting utilities with TTY detection
 * @module output/format
 */

import { newStyle } from '@oakoliver/lipgloss';

// =============================================================================
// TTY Detection
// =============================================================================

/**
 * Check if stdout is a TTY (terminal)
 */
export const isTTY = process.stdout.isTTY ?? false;

// =============================================================================
// Styles
// =============================================================================

export const styles = {
  // Status indicators
  success: newStyle().foreground('#04B575').bold(true),
  error: newStyle().foreground('#FF6B6B').bold(true),
  warning: newStyle().foreground('#FFD93D').bold(true),
  info: newStyle().foreground('#6C9EFF'),

  // Text styles
  bold: newStyle().bold(true),
  dim: newStyle().faint(true),
  highlight: newStyle().foreground('#7D56F4').bold(true),

  // Semantic styles
  path: newStyle().foreground('#6C9EFF'),
  title: newStyle().bold(true).foreground('#FFFFFF'),
  label: newStyle().foreground('#888888'),
  value: newStyle().foreground('#FFFFFF'),

  // Score/ranking
  score: newStyle().foreground('#FFD93D'),
};

// =============================================================================
// Symbols
// =============================================================================

export const symbols = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
  arrow: '→',
  bullet: '•',
  spinner: '⣾',
};

// =============================================================================
// Output Functions
// =============================================================================

/**
 * Generic output function that respects TTY mode
 * In TTY mode: uses human-readable format
 * In pipe mode: outputs JSON
 */
export function output<T>(data: T, humanFormat?: (data: T) => string): void {
  if (isTTY && humanFormat) {
    console.log(humanFormat(data));
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

/**
 * Output a success message
 */
export function success(message: string): void {
  if (isTTY) {
    console.log(styles.success.render(`${symbols.success} ${message}`));
  }
}

/**
 * Output an error message
 */
export function error(message: string, suggestion?: string): void {
  if (isTTY) {
    console.error(styles.error.render(`${symbols.error} Error: ${message}`));
    if (suggestion) {
      console.error(styles.dim.render(`  ${suggestion}`));
    }
  } else {
    console.error(
      JSON.stringify({
        error: {
          message,
          suggestion,
        },
      })
    );
  }
}

/**
 * Output a warning message
 */
export function warning(message: string): void {
  if (isTTY) {
    console.log(styles.warning.render(`${symbols.warning} ${message}`));
  }
}

/**
 * Output an info message
 */
export function info(message: string): void {
  if (isTTY) {
    console.log(styles.info.render(`${symbols.info} ${message}`));
  }
}

/**
 * Output a labeled value pair
 */
export function labeled(label: string, value: string): void {
  if (isTTY) {
    console.log(`${styles.label.render(label + ':')} ${styles.value.render(value)}`);
  }
}

/**
 * Output a path with arrow
 */
export function pathOutput(prefix: string, path: string): void {
  if (isTTY) {
    console.log(`  ${symbols.arrow} ${styles.path.render(path)}`);
  }
}

/**
 * Output a list item
 */
export function listItem(text: string, indent = 2): void {
  if (isTTY) {
    const padding = ' '.repeat(indent);
    console.log(`${padding}${symbols.bullet} ${text}`);
  }
}

/**
 * Output a blank line
 */
export function blank(): void {
  if (isTTY) {
    console.log();
  }
}

/**
 * Output a header/title
 */
export function header(text: string): void {
  if (isTTY) {
    console.log(styles.title.render(text));
  }
}

// =============================================================================
// Error Formatting
// =============================================================================

export interface KBError {
  code: string;
  message: string;
  suggestion?: string;
}

/**
 * Format and output a structured error
 */
export function outputError(err: KBError): void {
  if (isTTY) {
    console.error(styles.error.render(`Error: ${err.message}`));
    if (err.suggestion) {
      console.error();
      console.error(styles.dim.render(err.suggestion));
    }
  } else {
    console.error(JSON.stringify({ error: err }));
  }
}

/**
 * Create a standardized error object
 */
export function createError(code: string, message: string, suggestion?: string): KBError {
  return { code, message, suggestion };
}

// =============================================================================
// Result Formatting (for search results)
// =============================================================================

export interface SearchResult {
  path: string;
  title: string;
  score: number;
  snippet: string;
}

/**
 * Format search results for human output
 */
export function formatSearchResults(results: SearchResult[]): string {
  return results
    .map((r) => {
      const scoreLine = styles.path.render(r.path) + ' ' + styles.score.render(`(${r.score.toFixed(2)})`);
      const snippetLine = styles.dim.render(`  ${r.snippet}`);
      return `${scoreLine}\n${snippetLine}`;
    })
    .join('\n\n');
}
