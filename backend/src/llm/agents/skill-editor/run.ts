import type { Intent, SkillAgentContext, StreamChunk } from '@scriptcraft/shared';
import type { Db } from '../../../config/supabase.js';
import { streamAsChunks } from '../stream-bridge.js';
import { buildSkillEditPrompt, buildSkillQuestionPrompt } from './prompt.js';

/**
 * The skill file chat's one executor. Handles both of its intents, because
 * they differ only in the prompt — there is no second model call, no script,
 * and no promo draft in play.
 *
 * Writes nothing to `skill_files`. An EDIT turn's revised `.md` is streamed
 * into `messages.content` and into the content panel, and stays a proposal
 * until the user clicks Save (`POST /skill-files/:slug/publish`). CLAUDE.md
 * section 12: chat never publishes on its own.
 */
export async function* run(
  ctx: SkillAgentContext<Db> & { intent: Extract<Intent, 'EDIT' | 'QUESTION'> },
): AsyncGenerator<StreamChunk> {
  const { messages } =
    ctx.intent === 'EDIT'
      ? buildSkillEditPrompt({
          skillFile: ctx.skillFile,
          currentContent: ctx.currentContent,
          history: ctx.history,
          attachedPromos: ctx.attachedPromos,
          userInstruction: ctx.userInstruction,
        })
      : buildSkillQuestionPrompt({
          skillFile: ctx.skillFile,
          currentContent: ctx.currentContent,
          history: ctx.history,
          userInstruction: ctx.userInstruction,
        });

  const gen = streamAsChunks({
    messages,
    temperature: ctx.skillFile.temperature ?? undefined,
    // Same precedence as the episode chat: the user's pick, then the file's
    // own model, then `env.LITELLM_MODEL` inside the client.
    model: ctx.model ?? ctx.skillFile.model ?? undefined,
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
