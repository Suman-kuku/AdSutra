import type { GenerateStreamEvent } from '@scriptcraft/shared';
import { ApiError } from './api.client';
import { supabase } from './supabase.client';

/**
 * The one `text/event-stream` reader. Both streaming endpoints — the episode
 * chat's `/generate` and the skill file chat's `/chat` — emit the same
 * `GenerateStreamEvent` frames, so they share this parser rather than each
 * keeping their own copy.
 *
 * `EventSource` can neither POST nor set an Authorization header, so this
 * reads the body off `fetch` and splits the frames by hand.
 */
export interface SseHandlers {
  onIntent: (event: Extract<GenerateStreamEvent, { type: 'intent' }>) => void;
  onToken: (text: string) => void;
  onUsage: (event: Extract<GenerateStreamEvent, { type: 'usage' }>) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

export async function streamSSE(
  url: string,
  body: unknown,
  handlers: SseHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  });

  // Failures before the stream opens come back as a normal JSON envelope.
  if (!response.ok || !response.body) {
    let message = `Request failed (${response.status}).`;
    try {
      const failure = (await response.json()) as { error?: { message?: string } };
      if (failure.error?.message) message = failure.error.message;
    } catch {
      // Keep the status-code message.
    }
    throw new ApiError(response.status, 'STREAM_FAILED', message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      const line = frame.split('\n').find((l) => l.startsWith('data:'));
      if (!line) continue;

      let event: GenerateStreamEvent;
      try {
        event = JSON.parse(line.slice(5).trim()) as GenerateStreamEvent;
      } catch {
        continue;
      }

      switch (event.type) {
        case 'intent':
          handlers.onIntent(event);
          break;
        case 'token':
          handlers.onToken(event.text);
          break;
        case 'usage':
          handlers.onUsage(event);
          break;
        case 'error':
          handlers.onError(event.message);
          break;
        case 'done':
          handlers.onDone();
          break;
      }
    }
  }
}
