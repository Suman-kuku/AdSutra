import type { StreamChunk } from '@scriptcraft/shared';
import { streamCompletion, type GenerateOptions, type GenerateResult } from '../client.js';

/**
 * Bridges `streamCompletion`'s callback style into an async generator of
 * `{type:'token'}` chunks, so every agent can just `yield*` its model call.
 * The generator's return value is the final `GenerateResult` (model, usage,
 * latency) — read it off `gen.next()`'s `done` result once iteration ends.
 *
 * No queueing library needed: a one-slot "waiter" is enough because
 * `streamCompletion` only ever calls back from its own read loop, one delta
 * at a time — there is never more than one pending waiter to wake.
 */
export async function* streamAsChunks(
  options: GenerateOptions,
): AsyncGenerator<Extract<StreamChunk, { type: 'token' }>, GenerateResult, void> {
  type Settled = { ok: true; result: GenerateResult } | { ok: false; error: unknown };

  // A container, not a bare `let`, so narrowing survives being written from
  // the `.then`/`.catch` closures below rather than collapsing to `never`.
  const state: { settled: Settled | null } = { settled: null };
  const queue: string[] = [];
  let waiter: (() => void) | null = null;

  const wake = (): void => {
    waiter?.();
    waiter = null;
  };

  const completion = streamCompletion(options, (text) => {
    queue.push(text);
    wake();
  })
    .then((result) => {
      state.settled = { ok: true, result };
      wake();
    })
    .catch((error: unknown) => {
      state.settled = { ok: false, error };
      wake();
    });

  try {
    for (;;) {
      if (queue.length > 0) {
        yield { type: 'token', text: queue.shift() as string };
        continue;
      }
      const outcome = state.settled;
      if (outcome) {
        if (!outcome.ok) throw outcome.error;
        return outcome.result;
      }
      await new Promise<void>((resolve) => {
        waiter = resolve;
      });
    }
  } finally {
    // Ensure the underlying fetch settles even if the caller stops iterating early.
    await completion.catch(() => undefined);
  }
}
