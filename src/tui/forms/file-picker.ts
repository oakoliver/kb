/**
 * File picker integration for local source selection in the TUI
 * @module tui/forms/file-picker
 */

import type { IngestState } from '../state';
import { existsSync, readdirSync, statSync } from 'fs';
import { join, basename, dirname, resolve, relative } from 'path';

// =============================================================================
// Types
// =============================================================================

export interface FilePickerEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
}

export interface FilePickerState {
  currentDir: string;
  entries: FilePickerEntry[];
  selectedIndex: number;
  visible: boolean;
}

// =============================================================================
// State Management (pure transforms)
// =============================================================================

/**
 * Create a new file picker state rooted at the given directory
 */
export function createFilePickerState(rootDir: string): FilePickerState {
  const entries = listDirectory(rootDir);
  return {
    currentDir: rootDir,
    entries,
    selectedIndex: 0,
    visible: true,
  };
}

/**
 * Move selection up
 */
export function filePickerUp(state: FilePickerState): FilePickerState {
  if (state.selectedIndex <= 0) return state;
  return { ...state, selectedIndex: state.selectedIndex - 1 };
}

/**
 * Move selection down
 */
export function filePickerDown(state: FilePickerState): FilePickerState {
  if (state.selectedIndex >= state.entries.length - 1) return state;
  return { ...state, selectedIndex: state.selectedIndex + 1 };
}

/**
 * Enter selected directory or select file
 */
export function filePickerEnter(state: FilePickerState): { state: FilePickerState; selectedFile: string | null } {
  const entry = state.entries[state.selectedIndex];
  if (!entry) return { state, selectedFile: null };

  if (entry.isDir) {
    // Navigate into directory
    const newEntries = listDirectory(entry.path);
    return {
      state: {
        ...state,
        currentDir: entry.path,
        entries: newEntries,
        selectedIndex: 0,
      },
      selectedFile: null,
    };
  }

  // File selected
  return { state: { ...state, visible: false }, selectedFile: entry.path };
}

/**
 * Go up one directory level
 */
export function filePickerGoUp(state: FilePickerState): FilePickerState {
  const parentDir = dirname(state.currentDir);
  if (parentDir === state.currentDir) return state; // already at root
  const entries = listDirectory(parentDir);
  return {
    ...state,
    currentDir: parentDir,
    entries,
    selectedIndex: 0,
  };
}

/**
 * Get the currently selected entry
 */
export function getSelectedEntry(state: FilePickerState): FilePickerEntry | null {
  return state.entries[state.selectedIndex] ?? null;
}

/**
 * Dismiss the file picker
 */
export function dismissFilePicker(state: FilePickerState): FilePickerState {
  return { ...state, visible: false };
}

// =============================================================================
// Directory Listing
// =============================================================================

/**
 * List files and directories, sorted (dirs first, then files alphabetically).
 * Filters out hidden files (starting with .) and node_modules.
 */
export function listDirectory(dirPath: string): FilePickerEntry[] {
  try {
    const names = readdirSync(dirPath);
    const entries: FilePickerEntry[] = [];

    // Add parent directory entry
    const parentDir = dirname(dirPath);
    if (parentDir !== dirPath) {
      entries.push({
        name: '..',
        path: parentDir,
        isDir: true,
        size: 0,
      });
    }

    for (const name of names) {
      // Skip hidden files and node_modules
      if (name.startsWith('.') || name === 'node_modules') continue;

      const fullPath = join(dirPath, name);
      try {
        const stat = statSync(fullPath);
        entries.push({
          name,
          path: fullPath,
          isDir: stat.isDirectory(),
          size: stat.size,
        });
      } catch {
        // Skip inaccessible files
      }
    }

    // Sort: dirs first, then alphabetical
    entries.sort((a, b) => {
      if (a.name === '..') return -1;
      if (b.name === '..') return 1;
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });

    return entries;
  } catch {
    return [];
  }
}

// =============================================================================
// File Filtering
// =============================================================================

/** Allowed extensions for ingest */
const INGESTABLE_EXTENSIONS = new Set(['.md', '.txt', '.pdf', '.html', '.htm', '.json', '.csv']);

/**
 * Check if a file is ingestable
 */
export function isIngestable(filePath: string): boolean {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  return INGESTABLE_EXTENSIONS.has(ext);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}
