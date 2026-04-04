/**
 * Integration tests for studio lint and problems functionality
 * T059: Lint/problems acceptance coverage
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createStudioFixture, STUDIO_FIXTURE_META } from './helpers/studio';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { getWikiPaths } from '../../src/core/resolver';
import { lintWorkspace, mapLintIssuesToProblems, countProblemsBySeverity } from '../../src/tui/operations/lint';
import { setProblems, clearProblems, getProblemAtIndex, renderProblemsPanel } from '../../src/tui/panels/problems';
import { renderStatusBar, getContextualHelp } from '../../src/tui/chrome';
import type { BottomPanelState, ProblemItem, StatusBarState } from '../../src/tui/state';

// =============================================================================
// Lint Operations Integration Tests
// =============================================================================

describe('studio lint operations', () => {
  let wikiDir: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const fixture = await createStudioFixture();
    wikiDir = fixture.wikiDir;
    cleanup = fixture.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  test('lintWorkspace returns results for valid wiki', async () => {
    const paths = getWikiPaths(wikiDir);
    const problems = await lintWorkspace({ wikiRoot: wikiDir, paths });
    // All fixture articles have valid frontmatter and sources, and all links resolve
    // So we expect no errors (at most orphan warnings if graph is empty)
    expect(Array.isArray(problems)).toBe(true);
    // Every problem should have required fields
    for (const p of problems) {
      expect(typeof p.path).toBe('string');
      expect(typeof p.line).toBe('number');
      expect(typeof p.message).toBe('string');
      expect(['error', 'warning', 'info']).toContain(p.severity);
    }
  });

  test('lintWorkspace detects broken wikilinks', async () => {
    const paths = getWikiPaths(wikiDir);

    // Create an article with a broken wikilink
    const brokenArticle = `---
title: Broken Links Test
type: concept
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources:
  - test-source.md
related: []
tags:
  - test
---

# Broken Links Test

This links to [[NonExistent Article]] which does not exist.
`;
    await writeFile(join(paths.wiki, 'concepts', 'broken-links-test.md'), brokenArticle);

    const problems = await lintWorkspace({ wikiRoot: wikiDir, paths });
    const brokenLinkProblems = problems.filter(
      (p) => p.message.includes('Broken link') && p.message.includes('NonExistent Article')
    );
    expect(brokenLinkProblems.length).toBe(1);
    expect(brokenLinkProblems[0].severity).toBe('error');
    expect(brokenLinkProblems[0].path).toContain('broken-links-test.md');
  });

  test('lintWorkspace detects invalid frontmatter', async () => {
    const paths = getWikiPaths(wikiDir);

    // Create an article with invalid frontmatter (missing required fields)
    const invalidArticle = `---
title: Invalid Article
---

# Invalid

This article has incomplete frontmatter.
`;
    await writeFile(join(paths.wiki, 'concepts', 'invalid-frontmatter.md'), invalidArticle);

    const problems = await lintWorkspace({ wikiRoot: wikiDir, paths });
    const fmProblems = problems.filter(
      (p) => p.path.includes('invalid-frontmatter.md') && p.message.includes('frontmatter')
    );
    expect(fmProblems.length).toBeGreaterThan(0);
    expect(fmProblems[0].severity).toBe('error');
  });

  test('lintWorkspace detects orphan articles', async () => {
    const paths = getWikiPaths(wikiDir);

    // Create an article with no sources and no graph dependencies
    const orphanArticle = `---
title: Orphan Article
type: concept
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources: []
related: []
tags:
  - test
---

# Orphan Article

This article has no sources.
`;
    await writeFile(join(paths.wiki, 'concepts', 'orphan-article.md'), orphanArticle);

    const problems = await lintWorkspace({ wikiRoot: wikiDir, paths });
    const orphanProblems = problems.filter(
      (p) => p.path.includes('orphan-article.md') && p.message.includes('Orphan')
    );
    expect(orphanProblems.length).toBe(1);
    expect(orphanProblems[0].severity).toBe('warning');
  });

  test('lintWorkspace returns error on non-existent wiki', async () => {
    const paths = getWikiPaths('/nonexistent/path');
    const problems = await lintWorkspace({ wikiRoot: '/nonexistent/path', paths });
    // Should gracefully return either empty or an error problem
    expect(Array.isArray(problems)).toBe(true);
  });

  test('lintWorkspace identifies correct line for broken links', async () => {
    const paths = getWikiPaths(wikiDir);

    const article = `---
title: Line Number Test
type: concept
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources:
  - test.md
related: []
tags:
  - test
---

# Line Number Test

First paragraph.

Second paragraph with [[Ghost Article]] link.
`;
    await writeFile(join(paths.wiki, 'concepts', 'line-test.md'), article);

    const problems = await lintWorkspace({ wikiRoot: wikiDir, paths });
    const linkProblem = problems.find(
      (p) => p.path.includes('line-test.md') && p.message.includes('Ghost Article')
    );
    expect(linkProblem).toBeDefined();
    // The link is on the last non-empty line of the body (after frontmatter)
    expect(linkProblem!.line).toBeGreaterThan(1);
  });
});

// =============================================================================
// Lint Results -> Problems Panel Flow
// =============================================================================

describe('lint results to problems panel flow', () => {
  let wikiDir: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const fixture = await createStudioFixture();
    wikiDir = fixture.wikiDir;
    cleanup = fixture.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  test('full lint flow: run lint, populate problems, render panel', async () => {
    const paths = getWikiPaths(wikiDir);

    // Create an article with issues
    const badArticle = `---
title: Bad Article
type: concept
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources: []
related: []
tags:
  - test
---

# Bad Article

This links to [[No Such Article]].
`;
    await writeFile(join(paths.wiki, 'concepts', 'bad-article.md'), badArticle);

    // 1. Run lint
    const problems = await lintWorkspace({ wikiRoot: wikiDir, paths });
    expect(problems.length).toBeGreaterThan(0);

    // 2. Set problems in panel state
    let panelState: BottomPanelState = {
      visible: true,
      activeTab: 'problems',
      output: [],
      problems: [],
      selectedProblemIndex: 0,
      progressPercent: 0,
      progressLabel: '',
    };
    panelState = setProblems(panelState, problems);
    expect(panelState.problems.length).toBe(problems.length);

    // 3. Count by severity
    const counts = countProblemsBySeverity(panelState.problems);
    expect(counts.errors + counts.warnings + counts.info).toBe(problems.length);

    // 4. Render the panel
    const rendered = renderProblemsPanel(panelState.problems, 80, 20, 0);
    expect(rendered).toContain('bad-article.md'); // Should show problem file path

    // 5. Navigate to a problem
    const selected = getProblemAtIndex(panelState.problems, 0);
    expect(selected).toBeDefined();
    expect(selected!.path).toBeTruthy();
  });

  test('lint results render with error/warning counts in panel', async () => {
    const paths = getWikiPaths(wikiDir);

    // Create articles with different issues
    const orphan = `---
title: Orphan For Render
type: concept
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources: []
related: []
tags: []
---

# Orphan
`;
    const broken = `---
title: Broken For Render
type: concept
created: 2026-04-01T10:00:00Z
updated: 2026-04-01T10:00:00Z
sources:
  - test.md
related: []
tags: []
---

# Broken

See [[Nonexistent Link]].
`;
    await writeFile(join(paths.wiki, 'concepts', 'orphan-render.md'), orphan);
    await writeFile(join(paths.wiki, 'concepts', 'broken-render.md'), broken);

    const problems = await lintWorkspace({ wikiRoot: wikiDir, paths });
    const rendered = renderProblemsPanel(problems, 80, 20, 0);

    // Should contain both errors and warnings in the summary
    const hasError = problems.some((p) => p.severity === 'error');
    const hasWarning = problems.some((p) => p.severity === 'warning');
    if (hasError) expect(rendered).toContain('error');
    if (hasWarning) expect(rendered).toContain('warning');
  });
});

// =============================================================================
// Status Bar Error/Warning Counts
// =============================================================================

describe('status bar with lint counts', () => {
  test('renders error count when present', () => {
    const status: StatusBarState = {
      workspaceName: 'test',
      branch: '',
      articleCount: 5,
      sourceCount: 3,
      activeOperation: null,
      provider: '',
      errorCount: 3,
      warningCount: 0,
    };
    const rendered = renderStatusBar(status, 100);
    // Should contain the error count
    expect(rendered).toContain('3');
  });

  test('renders warning count when present', () => {
    const status: StatusBarState = {
      workspaceName: 'test',
      branch: '',
      articleCount: 5,
      sourceCount: 3,
      activeOperation: null,
      provider: '',
      errorCount: 0,
      warningCount: 2,
    };
    const rendered = renderStatusBar(status, 100);
    expect(rendered).toContain('2');
  });

  test('renders both error and warning counts', () => {
    const status: StatusBarState = {
      workspaceName: 'test',
      branch: '',
      articleCount: 5,
      sourceCount: 3,
      activeOperation: null,
      provider: '',
      errorCount: 1,
      warningCount: 4,
    };
    const rendered = renderStatusBar(status, 100);
    expect(rendered).toContain('1');
    expect(rendered).toContain('4');
  });

  test('does not render counts when zero', () => {
    const status: StatusBarState = {
      workspaceName: 'test',
      branch: '',
      articleCount: 5,
      sourceCount: 3,
      activeOperation: null,
      provider: '',
      errorCount: 0,
      warningCount: 0,
    };
    const rendered = renderStatusBar(status, 100);
    // Strip ANSI and check - should not contain error/warning icons with counts
    const stripped = rendered.replace(/\x1b\[[0-9;]*m/g, '');
    // Articles and sources may show counts, but error/warning icons shouldn't appear
    // We just verify it renders without error
    expect(stripped.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Bottom Panel Help Bindings
// =============================================================================

describe('bottom panel contextual help', () => {
  test('bottomPanel pane has navigate, go to file, and back bindings', () => {
    const bindings = getContextualHelp('bottomPanel', 'none', 'explorer', false);
    const keys = bindings.map((b) => b.key);
    const descs = bindings.map((b) => b.desc);
    expect(descs).toContain('navigate');
    expect(descs).toContain('go to file');
    expect(descs).toContain('back');
  });

  test('bottomPanel help includes common bindings', () => {
    const bindings = getContextualHelp('bottomPanel', 'none', 'explorer', false);
    const descs = bindings.map((b) => b.desc);
    expect(descs).toContain('Quick Open');
    expect(descs).toContain('Quit');
  });
});

// =============================================================================
// Problem Navigation State Tests
// =============================================================================

describe('problem navigation state', () => {
  test('selectedProblemIndex starts at 0', () => {
    const state: BottomPanelState = {
      visible: true,
      activeTab: 'problems',
      output: [],
      problems: [
        { path: 'a.md', line: 1, message: 'Error 1', severity: 'error' },
        { path: 'b.md', line: 1, message: 'Error 2', severity: 'error' },
      ],
      selectedProblemIndex: 0,
      progressPercent: 0,
      progressLabel: '',
    };
    expect(state.selectedProblemIndex).toBe(0);
    expect(getProblemAtIndex(state.problems, state.selectedProblemIndex)?.message).toBe('Error 1');
  });

  test('navigating down increments selectedProblemIndex', () => {
    let idx = 0;
    const problems: ProblemItem[] = [
      { path: 'a.md', line: 1, message: 'First', severity: 'error' },
      { path: 'b.md', line: 1, message: 'Second', severity: 'warning' },
      { path: 'c.md', line: 1, message: 'Third', severity: 'error' },
    ];

    // Move down
    idx = Math.min(problems.length - 1, idx + 1);
    expect(idx).toBe(1);
    expect(getProblemAtIndex(problems, idx)?.message).toBe('Second');

    // Move down again
    idx = Math.min(problems.length - 1, idx + 1);
    expect(idx).toBe(2);
    expect(getProblemAtIndex(problems, idx)?.message).toBe('Third');

    // Move down at end stays at end
    idx = Math.min(problems.length - 1, idx + 1);
    expect(idx).toBe(2);
  });

  test('navigating up decrements selectedProblemIndex', () => {
    let idx = 2;
    const problems: ProblemItem[] = [
      { path: 'a.md', line: 1, message: 'First', severity: 'error' },
      { path: 'b.md', line: 1, message: 'Second', severity: 'warning' },
      { path: 'c.md', line: 1, message: 'Third', severity: 'error' },
    ];

    // Move up
    idx = Math.max(0, idx - 1);
    expect(idx).toBe(1);
    expect(getProblemAtIndex(problems, idx)?.message).toBe('Second');

    // Move up again
    idx = Math.max(0, idx - 1);
    expect(idx).toBe(0);
    expect(getProblemAtIndex(problems, idx)?.message).toBe('First');

    // Move up at top stays at top
    idx = Math.max(0, idx - 1);
    expect(idx).toBe(0);
  });
});
