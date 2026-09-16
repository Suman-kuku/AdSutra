import type { AgentContext, StreamChunk } from '@scriptcraft/shared';
import type { Db } from '../../../config/supabase.js';
import { streamAsChunks } from '../stream-bridge.js';
import { buildQuestionPrompt } from './prompt.js';

/** Answers in prose. Writes no `promos` row. */
export async function* run(ctx: AgentContext<Db>): AsyncGenerator<StreamChunk> {
  const { messages } = buildQuestionPrompt({
    episode: ctx.episode,
    currentPromo: ctx.currentDraft?.content ?? null,
    history: ctx.history,
    userInstruction: ctx.userInstruction,
  });

  // No skill file on a QUESTION turn, so it is the user's pick or the default.
  const gen = streamAsChunks({ messages, model: ctx.model ?? undefined, signal: ctx.signal });

  let step = await gen.next();
  while (!step.done) {
    yield step.value;
    step = await gen.next();
  }
  const result = step.value;

  yield {
    type: 'usage',
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    latencyMs: result.latencyMs,
  };
}
