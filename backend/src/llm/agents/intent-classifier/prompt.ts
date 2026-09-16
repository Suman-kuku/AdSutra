import type { Intent } from '@scriptcraft/shared';
import type { LlmMessage } from '../../client.js';

export interface ClassifierPromptParams {
  message: string;
  allowedIntents: Intent[];
  /** A snippet of the promo currently in play, if any — helps distinguish EDIT from QUESTION. */
  currentPromoExcerpt?: string | null;
}

const INTENT_DESCRIPTIONS: Record<Intent, string> = {
  CREATE: 'the user wants a brand new promo generated from scratch from the episode script',
  EDIT:
    'the user wants the EXISTING promo changed in any way: shorter/longer, different focus, ' +
    'more/less of something, a different tone or mood (e.g. "make it more dramatic", "more mysterious"), ' +
    'or a different narration/delivery style or format (e.g. "make it narration style", ' +
    '"in first person", "like a movie trailer voiceover", "make it punchier")',
  QUESTION: 'the user is asking a question and wants a prose answer, not new or changed promo copy',
};

/** Same three labels, read against the skill file rather than a promo. */
const SKILL_FILE_INTENT_DESCRIPTIONS: Record<Intent, string> = {
  CREATE: 'not applicable in this chat',
  EDIT:
    'the user wants the skill file itself changed: add, remove or reword a rule, ' +
    'change its tone or structure, tighten it, or revise it in light of promo results ' +
    '(e.g. "make it more punchy", "add a rule about opening with a question", "drop the bit about taglines")',
  QUESTION:
    'the user is asking about the skill file and wants a prose answer, with no change to the file ' +
    '(e.g. "what does this do?", "why does it say never merge sections?", "which promos used this?")',
};

/**
 * The skill file chat's variant. Same classifier, same JSON contract, same
 * model — only the definitions differ, so there is one classifier to maintain
 * rather than two.
 */
export function buildSkillChatClassifierPrompt(params: {
  message: string;
  allowedIntents: Intent[];
  skillFileName: string;
}): LlmMessage[] {
  const labels = params.allowedIntents
    .map((intent) => `- "${intent}": ${SKILL_FILE_INTENT_DESCRIPTIONS[intent]}`)
    .join('\n');

  const system = [
    'You classify one chat message about a reusable prompt file (a "skill file")',
    'that defines a style of promo. The user is editing or asking about that file,',
    'not writing a promo.',
    '',
    'Allowed intents:',
    labels,
    '',
    'If the message asks for any change to the file, however small, it is EDIT.',
    'If it only asks about the file, it is QUESTION.',
    '',
    'Respond with ONLY a JSON object of this exact shape, no other text, no markdown fences:',
    '{"intent": "<one of the allowed intents>", "confidence": <0 to 1>, "reason": "<one short sentence>"}',
  ].join('\n');

  return [
    { role: 'system', content: system },
    {
      role: 'user',
      content: `The skill file is called "${params.skillFileName}".\n\nMessage to classify: "${params.message}"`,
    },
  ];
}

/**
 * JSON-only, single-turn classification. Kept deliberately small — this runs
 * on every ambiguous turn, so it must stay cheap.
 */
export function buildClassifierPrompt(params: ClassifierPromptParams): LlmMessage[] {
  const labels = params.allowedIntents
    .map((intent) => `- "${intent}": ${INTENT_DESCRIPTIONS[intent]}`)
    .join('\n');

  const disambiguation = params.allowedIntents.includes('EDIT')
    ? '\nA promo already exists in this conversation. Any request to change its wording, ' +
      'tone, style, format, length, or focus is EDIT, never CREATE — CREATE only applies to ' +
      'generating a brand-new promo (typically via an explicit @skill-file mention).'
    : '';

  const system = [
    'You classify one chat message from a promo-writing tool into exactly one intent.',
    '',
    'Allowed intents:',
    labels,
    disambiguation,
    '',
    'Respond with ONLY a JSON object of this exact shape, no other text, no markdown fences:',
    '{"intent": "<one of the allowed intents>", "confidence": <0 to 1>, "reason": "<one short sentence>"}',
  ]
    .filter(Boolean)
    .join('\n');

  const context = params.currentPromoExcerpt
    ? `The promo currently in the conversation starts with: "${params.currentPromoExcerpt.slice(0, 200)}"\n\n`
    : '';

  return [
    { role: 'system', content: system },
    { role: 'user', content: `${context}Message to classify: "${params.message}"` },
  ];
}
