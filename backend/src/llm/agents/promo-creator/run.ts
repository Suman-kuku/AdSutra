import type { AgentContext, StreamChunk } from '@scriptcraft/shared';
import type { Db } from '../../../config/supabase.js';
import { AppError } from '../../../middleware/errorHandler.js';
import { streamAsChunks } from '../stream-bridge.js';
import { buildCreatePrompt } from './prompt.js';

/**
 * Writes no `promos` row — the result is a draft living only in this turn's
 * `messages.content` until the user saves it via
 * `POST /conversations/:id/save-promo`.
 */
export async function* run(ctx: AgentContext<Db>): AsyncGenerator<StreamChunk> {
  if (!ctx.skillFile) {
    throw AppError.badRequest('A skill file is required to create a promo.', 'SKILL_FILE_REQUIRED');
  }
  const skillFile = ctx.skillFile;

  const { messages } = buildCreatePrompt({
    skillFile,
    episode: ctx.episode,
    userInstruction: ctx.userInstruction,
  });

  const gen = streamAsChunks({
    messages,
    temperature: skillFile.temperature ?? undefined,
    // The user's pick in the chat wins over the skill file's baked-in default,
    // which in turn wins over `env.LITELLM_MODEL` (applied inside the client).
    model: ctx.model ?? skillFile.model ?? undefined,
    signal: ctx.signal,
  });

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
