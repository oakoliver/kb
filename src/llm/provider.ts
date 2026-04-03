/**
 * LLM provider abstraction for Anthropic and OpenAI
 * @module llm/provider
 */

import type { LLMProvider as ProviderType } from '../core/schemas';

// =============================================================================
// Types
// =============================================================================

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
}

export interface LLMResponse {
  content: string;
  stopReason: 'end_turn' | 'max_tokens' | 'stop_sequence';
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface LLMStreamDelta {
  type: 'text' | 'stop';
  text?: string;
  stopReason?: 'end_turn' | 'max_tokens' | 'stop_sequence';
}

export interface LLMProvider {
  readonly name: ProviderType;
  readonly model: string;

  /**
   * Stream a completion response
   */
  stream(request: LLMRequest): AsyncGenerator<LLMStreamDelta>;

  /**
   * Get a complete response (non-streaming)
   */
  complete(request: LLMRequest): Promise<LLMResponse>;
}

// =============================================================================
// Error Types
// =============================================================================

export type LLMErrorType =
  | 'rate_limit'
  | 'overloaded'
  | 'server_error'
  | 'invalid_request'
  | 'authentication'
  | 'network'
  | 'unknown';

export class LLMError extends Error {
  constructor(
    public statusCode: number,
    public errorType: LLMErrorType,
    message: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'LLMError';
  }

  static fromStatusCode(statusCode: number, message: string): LLMError {
    let errorType: LLMErrorType;
    let retryable: boolean;

    switch (statusCode) {
      case 429:
        errorType = 'rate_limit';
        retryable = true;
        break;
      case 529:
        errorType = 'overloaded';
        retryable = true;
        break;
      case 500:
      case 502:
      case 503:
        errorType = 'server_error';
        retryable = true;
        break;
      case 400:
        errorType = 'invalid_request';
        retryable = false;
        break;
      case 401:
      case 403:
        errorType = 'authentication';
        retryable = false;
        break;
      default:
        errorType = 'unknown';
        retryable = false;
    }

    return new LLMError(statusCode, errorType, message, retryable);
  }
}

// =============================================================================
// Anthropic Provider
// =============================================================================

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

export class AnthropicProvider implements LLMProvider {
  readonly name: ProviderType = 'anthropic';

  constructor(
    private apiKey: string,
    public readonly model: string = 'claude-sonnet-4-20250514'
  ) {}

  async *stream(request: LLMRequest): AsyncGenerator<LLMStreamDelta> {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        system: request.systemPrompt,
        messages: request.messages.filter((m) => m.role !== 'system'),
        stop_sequences: request.stopSequences,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let message: string;
      try {
        const parsed = JSON.parse(errorBody);
        message = parsed.error?.message || errorBody;
      } catch {
        message = errorBody;
      }
      throw LLMError.fromStatusCode(response.status, message);
    }

    if (!response.body) {
      throw new LLMError(500, 'server_error', 'No response body', false);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data);

            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              yield { type: 'text', text: event.delta.text };
            } else if (event.type === 'message_delta' && event.delta?.stop_reason) {
              yield {
                type: 'stop',
                stopReason: this.mapStopReason(event.delta.stop_reason),
              };
            } else if (event.type === 'error') {
              throw new LLMError(529, 'server_error', event.error?.message || 'Stream error', true);
            }
          } catch (parseErr) {
            if (parseErr instanceof LLMError) throw parseErr;
            // Ignore JSON parse errors for non-event lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        system: request.systemPrompt,
        messages: request.messages.filter((m) => m.role !== 'system'),
        stop_sequences: request.stopSequences,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let message: string;
      try {
        const parsed = JSON.parse(errorBody);
        message = parsed.error?.message || errorBody;
      } catch {
        message = errorBody;
      }
      throw LLMError.fromStatusCode(response.status, message);
    }

    const result = (await response.json()) as {
      content?: Array<{ text?: string }>;
      stop_reason?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    return {
      content: result.content?.[0]?.text || '',
      stopReason: this.mapStopReason(result.stop_reason || ''),
      usage: {
        inputTokens: result.usage?.input_tokens || 0,
        outputTokens: result.usage?.output_tokens || 0,
      },
    };
  }

  private mapStopReason(reason: string): 'end_turn' | 'max_tokens' | 'stop_sequence' {
    switch (reason) {
      case 'end_turn':
        return 'end_turn';
      case 'max_tokens':
        return 'max_tokens';
      case 'stop_sequence':
        return 'stop_sequence';
      default:
        return 'end_turn';
    }
  }
}

// =============================================================================
// OpenAI Provider
// =============================================================================

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export class OpenAIProvider implements LLMProvider {
  readonly name: ProviderType = 'openai';

  constructor(
    private apiKey: string,
    public readonly model: string = 'gpt-4o'
  ) {}

  async *stream(request: LLMRequest): AsyncGenerator<LLMStreamDelta> {
    const messages = this.formatMessages(request);

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        messages,
        stop: request.stopSequences,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let message: string;
      try {
        const parsed = JSON.parse(errorBody);
        message = parsed.error?.message || errorBody;
      } catch {
        message = errorBody;
      }
      throw LLMError.fromStatusCode(response.status, message);
    }

    if (!response.body) {
      throw new LLMError(500, 'server_error', 'No response body', false);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') {
            yield { type: 'stop', stopReason: 'end_turn' };
            continue;
          }

          try {
            const event = JSON.parse(data);
            const delta = event.choices?.[0]?.delta;
            const finishReason = event.choices?.[0]?.finish_reason;

            if (delta?.content) {
              yield { type: 'text', text: delta.content };
            }

            if (finishReason) {
              yield {
                type: 'stop',
                stopReason: this.mapStopReason(finishReason),
              };
            }
          } catch (parseErr) {
            // Ignore JSON parse errors for non-event lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const messages = this.formatMessages(request);

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        messages,
        stop: request.stopSequences,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let message: string;
      try {
        const parsed = JSON.parse(errorBody);
        message = parsed.error?.message || errorBody;
      } catch {
        message = errorBody;
      }
      throw LLMError.fromStatusCode(response.status, message);
    }

    const result = (await response.json()) as {
      choices?: Array<{
        message?: { content?: string };
        finish_reason?: string;
      }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const choice = result.choices?.[0];

    return {
      content: choice?.message?.content || '',
      stopReason: this.mapStopReason(choice?.finish_reason || ''),
      usage: {
        inputTokens: result.usage?.prompt_tokens || 0,
        outputTokens: result.usage?.completion_tokens || 0,
      },
    };
  }

  private formatMessages(request: LLMRequest): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    for (const msg of request.messages) {
      if (msg.role === 'system' && request.systemPrompt) {
        continue; // Skip system messages if we already added systemPrompt
      }
      messages.push({ role: msg.role, content: msg.content });
    }

    return messages;
  }

  private mapStopReason(reason: string): 'end_turn' | 'max_tokens' | 'stop_sequence' {
    switch (reason) {
      case 'stop':
        return 'end_turn';
      case 'length':
        return 'max_tokens';
      case 'content_filter':
        return 'stop_sequence';
      default:
        return 'end_turn';
    }
  }
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create an LLM provider based on configuration
 */
export function createProvider(provider: ProviderType, apiKey: string, model?: string): LLMProvider {
  switch (provider) {
    case 'anthropic':
      return new AnthropicProvider(apiKey, model);
    case 'openai':
      return new OpenAIProvider(apiKey, model);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Create provider from environment and config
 */
export function createProviderFromEnv(provider: ProviderType, model?: string): LLMProvider {
  const apiKey = provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const envVar = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY';
    throw new Error(`Missing API key. Set the ${envVar} environment variable.`);
  }

  return createProvider(provider, apiKey, model);
}
