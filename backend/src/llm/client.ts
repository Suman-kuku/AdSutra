import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Thin wrapper over the company's LiteLLM gateway.
 *
 * The gateway speaks the OpenAI `/chat/completions` shape, so this is plain
 * HTTP rather than a vendor SDK — which also means swapping `LITELLM_MODEL`
 * for a different provider needs no code change.
 */

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateOptions {
  messages: LlmMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface GenerateResult {
  text: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
}

interface StreamChunk {
  choices?: {
    delta?: {
      /** Visible answer text. */
      content?: string | null;
      /** Some models (DeepSeek) stream their chain of thought here — never shown. */
      reasoning_content?: string | null;
    };
    finish_reason?: string | null;
  }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  } | null;
  model?: string;
}

/**
 * Generous because reasoning models (DeepSeek-V4-Pro among them) spend this
 * budget on their chain of thought *before* emitting a word of the promo. At
 * 600 tokens a 60-word promo came back completely empty.
 */
const DEFAULT_MAX_TOKENS = 200000;

/** Keeps the terminal readable when a message carries a full 60-page script. */
function previewText(text: string, max = 1500): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… [truncated — ${text.length} chars total]`;
}

/** Every LLM call in the app funnels through this function, so this is the one place that logs them all. */
function logRequest(options: GenerateOptions, model: string): void {
  console.log(
    `\n[llm] → request model=${model} temperature=${options.temperature ?? 'default'} maxTokens=${
      options.maxTokens ?? DEFAULT_MAX_TOKENS
    }`,
  );
  options.messages.forEach((message, index) => {
    console.log(`[llm]   [${index}] ${message.role}: ${previewText(message.content)}`);
  });
}

function logResponse(result: GenerateResult): void {
  console.log(
    `[llm] ← response model=${result.model} inputTokens=${result.inputTokens ?? '?'} outputTokens=${
      result.outputTokens ?? '?'
    } latencyMs=${result.latencyMs}`,
  );
  console.log(`[llm]   text: ${previewText(result.text)}`);
}

/**
 * Streams a completion, invoking `onDelta` for each visible text fragment.
 * Reasoning tokens are consumed but never forwarded — they are the model's
 * scratchpad, not the promo.
 */
export async function streamCompletion(
  options: GenerateOptions,
  onDelta: (text: string) => void,
): Promise<GenerateResult> {
  const startedAt = Date.now();
  const model = options.model ?? env.LITELLM_MODEL;
  logRequest(options, model);

  const response = await fetch(`${env.LITELLM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.LITELLM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      stream: true,
      stream_options: { include_usage: true },
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    }),
    ...(options.signal ? { signal: options.signal } : {}),
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => '');
    console.log(`[llm] ✗ request failed status=${response.status} detail=${previewText(detail, 500)}`);
    throw new AppError(
      502,
      'LLM_REQUEST_FAILED',
      `The model gateway rejected the request (${response.status}).`,
      { cause: detail },
    );
  }

  let text = '';
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  let resolvedModel = model;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line; the last fragment may be partial.
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      const line = frame.split('\n').find((l) => l.startsWith('data:'));
      if (!line) continue;

      const payload = line.slice(5).trim();
      if (payload === '' || payload === '[DONE]') continue;

      let chunk: StreamChunk;
      try {
        chunk = JSON.parse(payload) as StreamChunk;
      } catch {
        continue; // A malformed frame should not abort a working stream.
      }

      const delta = chunk.choices?.[0]?.delta?.content;
      if (typeof delta === 'string' && delta.length > 0) {
        text += delta;
        onDelta(delta);
      }

      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens ?? inputTokens;
        outputTokens = chunk.usage.completion_tokens ?? outputTokens;
      }
      if (chunk.model) resolvedModel = chunk.model;
    }
  }

  if (text.trim().length === 0) {
    console.log(`[llm] ✗ empty response model=${resolvedModel} latencyMs=${Date.now() - startedAt}`);
    throw new AppError(
      502,
      'LLM_EMPTY_RESPONSE',
      'The model produced only reasoning and no promo text — it likely ran out of output budget. Try again.',
    );
  }

  const result: GenerateResult = {
    text: text.trim(),
    model: resolvedModel,
    inputTokens,
    outputTokens,
    latencyMs: Date.now() - startedAt,
  };
  logResponse(result);
  return result;
}
