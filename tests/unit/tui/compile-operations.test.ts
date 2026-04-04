/**
 * Unit tests for compile operations, progress panel, and event mapping
 */

import { describe, test, expect } from 'bun:test';
import type { BottomPanelState } from '../../../src/tui/state';

// =============================================================================
// Compile Operations
// =============================================================================

import {
  calculateCompileProgress,
  buildCompileStartLines,
  buildCompileCompleteLines,
} from '../../../src/tui/operations/compile';

describe('calculateCompileProgress', () => {
  test('returns 1.0 for zero total', () => {
    expect(calculateCompileProgress(0, 0)).toBe(1.0);
  });

  test('returns base progress for 0/n', () => {
    const result = calculateCompileProgress(0, 5);
    expect(result).toBeCloseTo(0.1, 2);
  });

  test('returns increasing progress', () => {
    const p1 = calculateCompileProgress(1, 4);
    const p2 = calculateCompileProgress(2, 4);
    const p3 = calculateCompileProgress(3, 4);
    expect(p2).toBeGreaterThan(p1);
    expect(p3).toBeGreaterThan(p2);
  });

  test('caps at 1.0', () => {
    const result = calculateCompileProgress(10, 5);
    expect(result).toBeLessThanOrEqual(1.0);
  });
});

describe('buildCompileStartLines', () => {
  test('includes source count', () => {
    const lines = buildCompileStartLines(3);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toContain('3');
    expect(lines[0].kind).toBe('info');
  });
});

describe('buildCompileCompleteLines', () => {
  test('includes article count and duration', () => {
    const lines = buildCompileCompleteLines(5, 2500);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toContain('5');
    expect(lines[0].text).toContain('2.5s');
    expect(lines[0].kind).toBe('success');
  });
});

// =============================================================================
// Progress Panel
// =============================================================================

import {
  setProgress,
  resetProgress,
  renderProgressBar,
  renderProgressPanel,
} from '../../../src/tui/panels/progress';

describe('progress state management', () => {
  const basePanel: BottomPanelState = {
    visible: true,
    activeTab: 'progress',
    output: [],
    problems: [],
    selectedProblemIndex: 0,
    progressPercent: 0,
    progressLabel: '',
  };

  test('setProgress updates percent and label', () => {
    const result = setProgress(basePanel, 0.5, 'Compiling...');
    expect(result.progressPercent).toBe(0.5);
    expect(result.progressLabel).toBe('Compiling...');
  });

  test('setProgress clamps to 0-1', () => {
    const result = setProgress(basePanel, 1.5, 'test');
    expect(result.progressPercent).toBe(1);

    const result2 = setProgress(basePanel, -0.5, 'test');
    expect(result2.progressPercent).toBe(0);
  });

  test('resetProgress zeros out', () => {
    const state = setProgress(basePanel, 0.75, 'Working...');
    const result = resetProgress(state);
    expect(result.progressPercent).toBe(0);
    expect(result.progressLabel).toBe('');
  });
});

describe('renderProgressBar', () => {
  test('renders filled and empty sections', () => {
    const bar = renderProgressBar(0.5, 30, 'Half done');
    expect(bar).toContain('Half done');
    expect(bar).toContain('50%');
  });

  test('renders 0% progress', () => {
    const bar = renderProgressBar(0, 30, 'Starting');
    expect(bar).toContain('0%');
  });

  test('renders 100% progress', () => {
    const bar = renderProgressBar(1.0, 30, 'Done');
    expect(bar).toContain('100%');
  });
});

describe('renderProgressPanel', () => {
  test('renders active progress', () => {
    const state: BottomPanelState = {
      visible: true,
      activeTab: 'progress',
      output: [],
      problems: [],
      selectedProblemIndex: 0,
      progressPercent: 0.75,
      progressLabel: 'Compiling article 3/4',
    };
    const view = renderProgressPanel(state, 60, 5);
    expect(view).toContain('Compiling article 3/4');
    expect(view).toContain('75%');
  });

  test('renders no active operations when idle', () => {
    const state: BottomPanelState = {
      visible: true,
      activeTab: 'progress',
      output: [],
      problems: [],
      selectedProblemIndex: 0,
      progressPercent: 0,
      progressLabel: '',
    };
    const view = renderProgressPanel(state, 60, 5);
    expect(view).toContain('No active operations');
  });
});
