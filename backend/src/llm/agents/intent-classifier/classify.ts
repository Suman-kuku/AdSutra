import type { ClassifierResult, Intent } from '@scriptcraft/shared';
import { classifierOutputSchema } from '@scriptcraft/shared';
import { env } from '../../../config/env.js';
import { streamCompletion } from '../../client.js';
import { buildClassifierPrompt, buildSkillChatClassifierPrompt } from './prompt.js';

export interface ClassifyParams {
  message: string;
  allowedIntents: Intent[];
  currentPromoExcerpt?: string | null;
  /**
   * Which chat this turn came from. Defaults to the episode chat. The skill
   * file chat swaps the prompt, not the classifier (CLAUDE.md section 12).
   */
  domain?: 'promo' | 'skill_file';
  /** Only read when `domain` is 'skill_file'. */
  skillFileName?: string;
}

/**
 * Generous for a "just say one word" task because `CLASSIFIER_MODEL` is
 * commonly a reasoning model (see `client.ts`'s comment on
 * `DEFAULT_MAX_TOKENS`) — it can burn most of a small budget on hidden
 * chain-of-thought before emitting a single visible character, which is what
 * was producing empty/truncated JSON here.
 */
const CLASSIFIER_MAX_TOKENS = 500;

function fallback(allowedIntents: Intent[], reason: string): ClassifierResult {
  return { intent: allowedIntents[0] ?? 'QUESTION', confidence: 0, reason };
}

/**
 * Models occasionally wrap the JSON in prose or a code fence despite
 * instructions not to ("Sure, here you go: ```json\n{...}\n```") — pulling
 * out the first `{...}` block handles that without needing a stricter (and
 * more fragile) prompt.
 */
function tryParse(text: string): unknown | null {
  const match = /\{[\s\S]*\}/.exec(text);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/**
 * Non-streaming by design: nothing about this call is shown to the user, so
 * there is no reason to forward deltas. `temperature: 0` keeps it deterministic
 * — this runs on every turn the deterministic preconditions don't already
 * resolve.
 *
 * Never throws: a classifier that returns garbage degrades to the same
 * low-confidence fallback `routeMessage` already applies for a low-confidence
 * *answer* (confidence: 0 here), rather than failing the whole turn.
 */
export async function classifyIntent(params: ClassifyParams): Promise<ClassifierResult> {
  const messages =
    params.domain === 'skill_file'
      ? buildSkillChatClassifierPrompt({
          message: params.message,
          allowedIntents: params.allowedIntents,
          skillFileName: params.skillFileName ?? 'this skill file',
        })
      : buildClassifierPrompt(params);

  const result = await streamCompletion(
    { messages, model: env.CLASSIFIER_MODEL, temperature: 0, maxTokens: CLASSIFIER_MAX_TOKENS },
    () => {
      // Discarded — the classifier's output is JSON metadata, never chat content.
    },
  );

  const candidate = tryParse(result.text);
  if (candidate === null) {
    console.log(`[classifier] ✗ unparseable output, falling back: ${JSON.stringify(result.text)}`);
    return fallback(params.allowedIntents, 'Classifier output was not parseable JSON.');
  }

  const output = classifierOutputSchema.safeParse(candidate);
  if (!output.success) {
    console.log(`[classifier] ✗ output failed schema, falling back: ${JSON.stringify(result.text)}`);
    return fallback(params.allowedIntents, 'Classifier output did not match the expected shape.');
  }

  if (!params.allowedIntents.includes(output.data.intent)) {
    return { ...output.data, intent: params.allowedIntents[0] ?? 'QUESTION' };
  }

  return output.data;
}
