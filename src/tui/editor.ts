/**
 * Editor viewport state management and history navigation
 * @module tui/editor
 */

import type { EditorState, OpenDocument, HistoryEntry } from './state';
import { loadDocument, parseFrontmatterSimple, renderDocumentContent } from './document';
import { nextLinkIndex, prevLinkIndex, buildLinkTargetMap, resolveWikilinkPath } from './link-map';
import { existsSync } from 'fs';
import { join, basename } from 'path';
import { theme, colors, icons } from './theme';
import { newStyle, truncate } from '@oakoliver/lipgloss';

// =============================================================================
// Document Opening & Closing
// =============================================================================

/**
 * Open a document in the editor, pushing current doc to history
 */
export async function openDocument(
  state: EditorState,
  filePath: string,
  width?: number,
): Promise<EditorState> {
  const doc = await loadDocument(filePath, width);

  // Push current document to history before opening new one
  const history = [...state.history];
  let historyIndex = state.historyIndex;

  if (state.document) {
    // Trim forward history when branching
    const trimmed = history.slice(0, historyIndex + 1);
    trimmed.push({
      path: state.document.path,
      scrollY: state.document.scrollY,
    });
    history.length = 0;
    history.push(...trimmed);
    historyIndex = trimmed.length - 1;
  }

  return {
    document: doc,
    history,
    historyIndex,
  };
}

/**
 * Navigate back in history
 */
export async function navigateBack(state: EditorState, width?: number): Promise<EditorState> {
  if (state.historyIndex < 0 || state.history.length === 0) return state;

  const entry = state.history[state.historyIndex];
  const doc = await loadDocument(entry.path, width);
  doc.scrollY = entry.scrollY;

  return {
    document: doc,
    history: state.history,
    historyIndex: Math.max(-1, state.historyIndex - 1),
  };
}

/**
 * Navigate forward in history
 */
export async function navigateForward(state: EditorState): Promise<EditorState> {
  if (state.historyIndex >= state.history.length - 1) return state;

  const nextIndex = state.historyIndex + 1;

  // If there is a next entry, the forward entry is at nextIndex + 1
  // Actually, forward means we need to track where we are going
  // The current doc IS the forward state. Let me re-think.
  //
  // History represents past documents. When navigating back, we decrement.
  // navigateForward is not standard in our model -- we only support back.
  return state;
}

/**
 * Re-render the open document for a new editor width (terminal resize),
 * keeping the scroll position in range.
 */
export function rewrapDocument(state: EditorState, width: number): EditorState {
  const doc = state.document;
  if (!doc || !doc.content) return state;
  const { body } = parseFrontmatterSimple(doc.content);
  const renderedContent = renderDocumentContent(body, width);
  const maxScroll = Math.max(0, renderedContent.split('\n').length - 1);
  return { ...state, document: { ...doc, renderedContent, scrollY: Math.min(doc.scrollY, maxScroll) } };
}

// =============================================================================
// Scrolling
// =============================================================================

/**
 * Scroll the document viewport by delta lines
 */
export function scrollDocument(doc: OpenDocument, delta: number, viewportHeight: number): OpenDocument {
  const lines = doc.renderedContent.split('\n');
  const maxScroll = Math.max(0, lines.length - viewportHeight);
  const newScrollY = Math.max(0, Math.min(maxScroll, doc.scrollY + delta));

  return { ...doc, scrollY: newScrollY };
}

/**
 * Scroll to the top
 */
export function scrollToTop(doc: OpenDocument): OpenDocument {
  return { ...doc, scrollY: 0, focusedLinkIndex: -1 };
}

/**
 * Scroll to the bottom
 */
export function scrollToBottom(doc: OpenDocument, viewportHeight: number): OpenDocument {
  const lines = doc.renderedContent.split('\n');
  const maxScroll = Math.max(0, lines.length - viewportHeight);
  return { ...doc, scrollY: maxScroll };
}

/**
 * Page down
 */
export function pageDown(doc: OpenDocument, viewportHeight: number): OpenDocument {
  return scrollDocument(doc, viewportHeight - 2, viewportHeight);
}

/**
 * Page up
 */
export function pageUp(doc: OpenDocument, viewportHeight: number): OpenDocument {
  return scrollDocument(doc, -(viewportHeight - 2), viewportHeight);
}

// =============================================================================
// Link Navigation
// =============================================================================

/**
 * Move focus to the next wikilink in the document
 */
export function focusNextLink(doc: OpenDocument): OpenDocument {
  const next = nextLinkIndex(doc.links, doc.focusedLinkIndex);
  return { ...doc, focusedLinkIndex: next };
}

/**
 * Move focus to the previous wikilink in the document
 */
export function focusPrevLink(doc: OpenDocument): OpenDocument {
  const prev = prevLinkIndex(doc.links, doc.focusedLinkIndex);
  return { ...doc, focusedLinkIndex: prev };
}

/**
 * Get the currently focused link, or null
 */
export function getFocusedLink(doc: OpenDocument): { target: string } | null {
  if (doc.focusedLinkIndex < 0 || doc.focusedLinkIndex >= doc.links.length) {
    return null;
  }
  return doc.links[doc.focusedLinkIndex];
}

/**
 * Resolve a wikilink target to a file path, searching the wiki directory
 */
export function resolveLink(target: string, wikiDir: string): string | null {
  const slug = target.toLowerCase().replace(/\s+/g, '-');
  const filename = `${slug}.md`;

  const searchDirs = ['concepts', 'entities', 'syntheses'];
  for (const dir of searchDirs) {
    const candidate = join(wikiDir, dir, filename);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

// =============================================================================
// Transient Query Document
// =============================================================================

/**
 * Create a transient (unsaved) query document in the editor for streaming
 */
export function createQueryDocument(
  state: EditorState,
  question: string,
): EditorState {
  const doc: OpenDocument = {
    path: '__query__',
    title: `Query: ${question}`,
    content: '',
    renderedContent: '',
    links: [],
    scrollY: 0,
    focusedLinkIndex: -1,
  };

  return {
    ...state,
    document: doc,
  };
}

/**
 * Append streamed text to the current query document
 */
export function appendQueryStream(doc: OpenDocument, chunk: string): OpenDocument {
  const newContent = doc.content + chunk;
  return {
    ...doc,
    content: newContent,
    renderedContent: newContent, // Raw text during streaming; rendered on complete
  };
}

/**
 * Finalize a query document with rendered markdown and link extraction
 */
export function finalizeQueryDocument(
  doc: OpenDocument,
  renderFn: (content: string) => string,
  extractLinks: (content: string) => Array<{ target: string; row: number; colStart: number; colEnd: number; displayText: string }>,
): OpenDocument {
  const rendered = renderFn(doc.content);
  const links = extractLinks(doc.content);

  return {
    ...doc,
    renderedContent: rendered,
    links,
  };
}

// =============================================================================
// Editor Rendering
// =============================================================================

/**
 * Render the editor viewport
 */
export function renderEditor(
  state: EditorState,
  width: number,
  height: number,
  isFocused: boolean,
): string {
  if (!state.document) {
    return renderWelcome(width, height);
  }

  const doc = state.document;
  const lines = doc.renderedContent.split('\n');

  // Title bar (1 line)
  const titleBarHeight = 1;
  const contentHeight = height - titleBarHeight;

  // Render title bar
  const titleIcon = icons.fileMarkdown;
  let titleText = ` ${titleIcon} ${doc.title}`;
  if (titleText.length > width) {
    titleText = titleText.slice(0, width - 1) + '…';
  }
  const titleStyle = isFocused ? theme.paneTitleFocused : theme.paneTitle;
  const titleBar = titleStyle.width(width).render(titleText);

  // Render visible content slice
  const start = doc.scrollY;
  const end = Math.min(start + contentHeight, lines.length);
  const visibleLines = lines.slice(start, end);

  // Pad to fill viewport
  while (visibleLines.length < contentHeight) {
    visibleLines.push(theme.muted.render('~'));
  }

  // Clip anything still wider than the pane (long code lines, URLs), so the
  // frame never overflows
  const contentBlock = visibleLines.map((line) => truncate(line, width)).join('\n');

  return titleBar + '\n' + contentBlock;
}

/**
 * Render welcome screen when no document is open
 */
function renderWelcome(width: number, height: number): string {
  const lines: string[] = [];
  const centerY = Math.floor(height / 2) - 4;

  // Pad top
  for (let i = 0; i < centerY; i++) {
    lines.push('');
  }

  const logo = theme.heading.render('  KB Studio');
  const subtitle = theme.muted.render('  Knowledge Base Workspace');
  lines.push(logo);
  lines.push(subtitle);
  lines.push('');

  const hints = [
    `  ${theme.helpKey.render('Ctrl+P')}  ${theme.muted.render('Quick Open')}`,
    `  ${theme.helpKey.render('Ctrl+B')}  ${theme.muted.render('Toggle Sidebar')}`,
    `  ${theme.helpKey.render('Ctrl+Q')}  ${theme.muted.render('Quit')}`,
  ];

  for (const hint of hints) {
    lines.push(hint);
  }

  // Pad remaining
  while (lines.length < height) {
    lines.push('');
  }

  return lines.join('\n');
}
