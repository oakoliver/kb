/**
 * kb studio command - Launch the TUI workspace
 * @module commands/studio
 */

import type { CommandContext } from '../cli';
import { error, isTTY } from '../output/format';
import { resolveWikiRoot, getWikiPaths } from '../core/resolver';
import { launchStudio } from '../tui/app';

/**
 * Launch KB Studio TUI
 */
export default async function studio(ctx: CommandContext): Promise<number> {
  // Studio requires a TTY
  if (!isTTY) {
    error('KB Studio requires an interactive terminal.', 'Run without piping to use the TUI.');
    return 1;
  }

  // Check minimum terminal size
  const cols = process.stdout.columns ?? 0;
  const rows = process.stdout.rows ?? 0;

  if (cols < 80 || rows < 24) {
    error(
      `Terminal too small: ${cols}x${rows}. Minimum required: 80x24.`,
      'Resize your terminal window and try again.',
    );
    return 1;
  }

  // Resolve workspace
  try {
    const wikiRoot = await resolveWikiRoot();
    const paths = getWikiPaths(wikiRoot.path);

    await launchStudio(wikiRoot.path, paths);
    return 0;
  } catch (err) {
    if (err instanceof Error && err.name === 'WikiNotFoundError') {
      error(
        'No knowledge base found.',
        "Run 'kb init' to create one, then 'kb studio' to open the TUI.",
      );
      return 1;
    }
    throw err;
  }
}
