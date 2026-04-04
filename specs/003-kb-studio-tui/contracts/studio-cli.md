# Contract: Studio CLI Surface

## Purpose

Define the external command-line behavior introduced or changed by KB Studio.

## Commands

### `kb studio`

- Launches the full-screen terminal UI in a valid kb workspace.
- Exit code `0` on normal quit.
- Exit code `1` on runtime/workspace/precondition failure.
- Exit code `2` on invalid arguments.

#### Preconditions

- Current directory or a parent directory resolves to a valid kb workspace.
- Terminal is interactive (`stdout.isTTY === true`).
- Terminal dimensions are at least `80x24`.

#### Failure cases

- Missing workspace: show kb workspace resolution error.
- Terminal too small: show resize error overlay/message and exit non-zero if launch cannot proceed.
- Non-interactive output: reject studio launch and instruct user to use standard CLI commands instead.

### `kb` (no args)

- In interactive TTY and valid workspace: launches studio.
- In non-interactive context: preserves current machine-readable help behavior.
- Outside a workspace: either prints current help or workspace-specific error depending on final command routing implementation, but the plan target is studio-first only when the workspace precondition is met.

## Keyboard Contract

The studio must reserve and support the following top-level shortcuts:

| Shortcut | Action |
|----------|--------|
| `Ctrl+Q` | Quit studio |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+J` | Toggle bottom panel |
| `Ctrl+P` | Quick open |
| `Ctrl+Shift+P` | Command palette |
| `Ctrl+Shift+E` | Explorer view |
| `Ctrl+Shift+F` | Search view |
| `Ctrl+Shift+I` | Ingest view |

## Command Palette Contract

Command palette must expose at least these command ids:

| Command ID | Behavior |
|------------|----------|
| `kb.compile` | Run compile workflow and show progress/output |
| `kb.lint` | Run lint workflow and populate Problems tab |
| `kb.status` | Refresh workspace/status information |
| `kb.query.save` | Save active transient query output to `queries/` |
| `kb.promote` | Promote selected query/article when applicable |
| `kb.focusExplorer` | Switch sidebar to explorer |
| `kb.focusSearch` | Switch sidebar to search |
| `kb.focusIngest` | Switch sidebar to ingest |

## Interaction Contract

- Mouse wheel scroll must move the hovered/focused list or viewport.
- Single click focuses the clicked pane.
- Explorer/list click selects items; double click or Enter opens the selected file.
- Tab/Shift+Tab in the editor cycles visible wikilinks.
- Enter on a focused wikilink opens the linked article.

## Output Contract

- Studio itself is an interactive full-screen interface, not JSON output.
- Underlying business operations must still reuse current kb behaviors for file outputs and workspace mutations.
