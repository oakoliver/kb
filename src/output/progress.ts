/**
 * Progress spinner utilities using @oakoliver/bubbles
 * @module output/progress
 */

import { newSpinner, withSpinner, Dot, Line, MiniDot, Jump, Pulse, Points, Globe, Moon, Monkey, Meter } from '@oakoliver/bubbles';
import { isTTY } from './format';

// =============================================================================
// Spinner Types
// =============================================================================

export type SpinnerStyle = 'dot' | 'line' | 'minidot' | 'jump' | 'pulse' | 'points' | 'globe' | 'moon' | 'monkey' | 'meter';

// Spinner definition type
type SpinnerDef = { frames: string[]; fps: number };

const spinnerTypes: Record<SpinnerStyle, SpinnerDef> = {
  dot: Dot,
  line: Line,
  minidot: MiniDot,
  jump: Jump,
  pulse: Pulse,
  points: Points,
  globe: Globe,
  moon: Moon,
  monkey: Monkey,
  meter: Meter,
};

// =============================================================================
// Spinner Wrapper
// =============================================================================

export interface SpinnerHandle {
  /**
   * Update the spinner message
   */
  update(message: string): void;

  /**
   * Stop the spinner with a success message
   */
  success(message: string): void;

  /**
   * Stop the spinner with an error message
   */
  error(message: string): void;

  /**
   * Stop the spinner without a message
   */
  stop(): void;
}

/**
 * Create and start a spinner with a message
 * Returns a handle to control the spinner
 */
export function spin(message: string, style: SpinnerStyle = 'dot'): SpinnerHandle {
  // In non-TTY mode, just log the message and return no-op handle
  if (!isTTY) {
    return {
      update: () => {},
      success: () => {},
      error: () => {},
      stop: () => {},
    };
  }

  const spinnerDef = spinnerTypes[style];
  let currentMessage = message;
  let stopped = false;
  let frameIndex = 0;

  // Get spinner frames
  const frames = spinnerDef.frames;
  const fps = spinnerDef.fps || 10;
  const interval_ms = Math.round(1000 / fps);

  // Start the spinner animation
  const interval = setInterval(() => {
    if (!stopped) {
      const frame = frames[frameIndex % frames.length];
      process.stdout.write(`\r\x1b[K${frame}${currentMessage}`);
      frameIndex++;
    }
  }, interval_ms);

  return {
    update(msg: string) {
      currentMessage = msg;
    },

    success(msg: string) {
      if (stopped) return;
      stopped = true;
      clearInterval(interval);
      process.stdout.write(`\r\x1b[K\x1b[32m✓\x1b[0m ${msg}\n`);
    },

    error(msg: string) {
      if (stopped) return;
      stopped = true;
      clearInterval(interval);
      process.stdout.write(`\r\x1b[K\x1b[31m✗\x1b[0m ${msg}\n`);
    },

    stop() {
      if (stopped) return;
      stopped = true;
      clearInterval(interval);
      process.stdout.write('\r\x1b[K');
    },
  };
}

/**
 * Execute an async function with a spinner
 * Automatically handles success/error states
 */
export async function withSpinnerAsync<T>(
  message: string,
  fn: () => Promise<T>,
  options?: {
    style?: SpinnerStyle;
    successMessage?: string | ((result: T) => string);
    errorMessage?: string | ((error: Error) => string);
  }
): Promise<T> {
  const spinner = spin(message, options?.style);

  try {
    const result = await fn();

    const successMsg =
      typeof options?.successMessage === 'function' ? options.successMessage(result) : options?.successMessage || message;

    spinner.success(successMsg);
    return result;
  } catch (err) {
    const errorMsg =
      typeof options?.errorMessage === 'function'
        ? options.errorMessage(err as Error)
        : options?.errorMessage || (err as Error).message;

    spinner.error(errorMsg);
    throw err;
  }
}

/**
 * Execute multiple async operations with progress tracking
 */
export async function withProgress<T>(
  items: T[],
  fn: (item: T, index: number) => Promise<void>,
  options?: {
    message?: (item: T, index: number, total: number) => string;
    style?: SpinnerStyle;
  }
): Promise<void> {
  const total = items.length;
  const getMessage = options?.message || ((_item, index, total) => `Processing ${index + 1}/${total}...`);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const message = getMessage(item, i, total);
    const spinner = spin(message, options?.style);

    try {
      await fn(item, i);
      spinner.success(getMessage(item, i, total));
    } catch (err) {
      spinner.error(`Failed: ${(err as Error).message}`);
      throw err;
    }
  }
}
