/**
 * Streaming response handler for LLM output
 * @module llm/stream
 */

import type { LLMProvider, LLMRequest, LLMStreamDelta, LLMResponse } from './provider';
import { isTTY } from '../output/format';

// =============================================================================
// Types
// =============================================================================

export interface StreamOptions {
  /**
   * Callback for each text chunk
   */
  onText?: (text: string) => void;

  /**
   * Callback when streaming completes
   */
  onComplete?: (content: string) => void;

  /**
   * Callback on error
   */
  onError?: (error: Error) => void;

  /**
   * Whether to print to stdout (default: true in TTY mode)
   */
  print?: boolean;
}

export interface StreamResult {
  content: string;
  stopReason: 'end_turn' | 'max_tokens' | 'stop_sequence';
}

// =============================================================================
// Streaming Functions
// =============================================================================

/**
 * Stream a response and collect the full content
 */
export async function streamResponse(
  provider: LLMProvider,
  request: LLMRequest,
  options?: StreamOptions
): Promise<StreamResult> {
  const shouldPrint = options?.print ?? isTTY;
  let content = '';
  let stopReason: 'end_turn' | 'max_tokens' | 'stop_sequence' = 'end_turn';

  try {
    for await (const delta of provider.stream(request)) {
      if (delta.type === 'text' && delta.text) {
        content += delta.text;

        if (shouldPrint) {
          process.stdout.write(delta.text);
        }

        options?.onText?.(delta.text);
      } else if (delta.type === 'stop') {
        stopReason = delta.stopReason || 'end_turn';
      }
    }

    if (shouldPrint) {
      process.stdout.write('\n');
    }

    options?.onComplete?.(content);

    return { content, stopReason };
  } catch (err) {
    options?.onError?.(err as Error);
    throw err;
  }
}

/**
 * Stream response as an async generator of text chunks
 */
export async function* streamText(provider: LLMProvider, request: LLMRequest): AsyncGenerator<string> {
  for await (const delta of provider.stream(request)) {
    if (delta.type === 'text' && delta.text) {
      yield delta.text;
    }
  }
}

/**
 * Collect streamed response into a single string
 */
export async function collectStream(provider: LLMProvider, request: LLMRequest): Promise<string> {
  let content = '';
  for await (const text of streamText(provider, request)) {
    content += text;
  }
  return content;
}

// =============================================================================
// Buffered Streaming
// =============================================================================

/**
 * Buffer streamed text by lines for better display
 */
export async function* streamLines(provider: LLMProvider, request: LLMRequest): AsyncGenerator<string> {
  let buffer = '';

  for await (const text of streamText(provider, request)) {
    buffer += text;

    const lines = buffer.split('\n');
    // Keep the last incomplete line in buffer
    buffer = lines.pop() || '';

    for (const line of lines) {
      yield line + '\n';
    }
  }

  // Yield any remaining content
  if (buffer) {
    yield buffer;
  }
}

/**
 * Buffer streamed text by words for smoother display
 */
export async function* streamWords(provider: LLMProvider, request: LLMRequest): AsyncGenerator<string> {
  let buffer = '';

  for await (const text of streamText(provider, request)) {
    buffer += text;

    // Look for word boundaries (space, newline, punctuation)
    const match = buffer.match(/^(.*[\s.,!?;:])/);
    if (match) {
      yield match[1];
      buffer = buffer.slice(match[1].length);
    }
  }

  // Yield any remaining content
  if (buffer) {
    yield buffer;
  }
}

// =============================================================================
// Progress Streaming
// =============================================================================

export interface ProgressStreamOptions {
  /**
   * Message to show while streaming
   */
  message?: string;

  /**
   * Update interval in ms
   */
  interval?: number;

  /**
   * Show character count
   */
  showCount?: boolean;
}

/**
 * Stream with progress indication
 */
export async function streamWithProgress(
  provider: LLMProvider,
  request: LLMRequest,
  options?: ProgressStreamOptions
): Promise<StreamResult> {
  const message = options?.message || 'Generating';
  const interval = options?.interval || 500;
  const showCount = options?.showCount ?? true;

  let charCount = 0;
  let content = '';
  let stopReason: 'end_turn' | 'max_tokens' | 'stop_sequence' = 'end_turn';

  // Progress indicator for TTY mode
  let progressInterval: ReturnType<typeof setInterval> | null = null;

  if (isTTY) {
    progressInterval = setInterval(() => {
      const countStr = showCount ? ` (${charCount} chars)` : '';
      process.stdout.write(`\r\x1b[K${message}...${countStr}`);
    }, interval);
  }

  try {
    for await (const delta of provider.stream(request)) {
      if (delta.type === 'text' && delta.text) {
        content += delta.text;
        charCount += delta.text.length;
      } else if (delta.type === 'stop') {
        stopReason = delta.stopReason || 'end_turn';
      }
    }

    if (progressInterval) {
      clearInterval(progressInterval);
      process.stdout.write('\r\x1b[K'); // Clear progress line
    }

    return { content, stopReason };
  } catch (err) {
    if (progressInterval) {
      clearInterval(progressInterval);
      process.stdout.write('\r\x1b[K');
    }
    throw err;
  }
}

// =============================================================================
// Retry Logic
// =============================================================================

export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   */
  maxRetries?: number;

  /**
   * Initial delay in ms
   */
  initialDelay?: number;

  /**
   * Maximum delay in ms
   */
  maxDelay?: number;

  /**
   * Multiplier for exponential backoff
   */
  backoffMultiplier?: number;
}

/**
 * Stream with automatic retry for retryable errors
 */
export async function streamWithRetry(
  provider: LLMProvider,
  request: LLMRequest,
  options?: RetryOptions
): Promise<StreamResult> {
  const maxRetries = options?.maxRetries ?? 3;
  const initialDelay = options?.initialDelay ?? 1000;
  const maxDelay = options?.maxDelay ?? 30000;
  const backoffMultiplier = options?.backoffMultiplier ?? 2;

  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await streamResponse(provider, request, { print: false });
    } catch (err) {
      lastError = err as Error;

      // Check if error is retryable
      const isRetryable = 'retryable' in lastError && (lastError as { retryable: boolean }).retryable;

      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      // Wait with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a simple request with a single user message
 */
export function createSimpleRequest(prompt: string, systemPrompt?: string): LLMRequest {
  return {
    messages: [{ role: 'user', content: prompt }],
    systemPrompt,
  };
}

/**
 * Create a request with conversation history
 */
export function createConversationRequest(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt?: string
): LLMRequest {
  return {
    messages: messages.map((m) => ({ ...m })),
    systemPrompt,
  };
}
