import type { Tables } from '@scriptcraft/shared';
import type { LlmMessage } from '../../client.js';
import { REFINE_HISTORY_LIMIT, resolveScriptContext } from '../../context-window.js';
import { systemPrompt } from '../../prompt-builder.js';

type SkillFileRow = Tables<'skill_files'>;
type EpisodeRow = Tables<'episodes'>;
type MessageRow = Tables<'messages'>;

/**
 * EDIT: script digest (never the full script) plus the promo being changed
 * and only the tail of the transcript. See CLAUDE.md section 9.
 */
export function buildEditPrompt(params: {
  skillFile: SkillFileRow;
  episode: EpisodeRow;
  currentPromo: string;
  history: MessageRow[];
  userInstruction: string;
}): { messages: LlmMessage[] } {
  const digest = resolveScriptContext(params.episode);
  const recent = params.history.slice(-REFINE_HISTORY_LIMIT);

  const messages: LlmMessage[] = [
    { role: 'system', content: systemPrompt(params.skillFile, params.episode) },
    {
      role: 'user',
      content: ['Episode script (abridged for context):', '', '<script>', digest, '</script>'].join(
        '\n',
      ),
    },
  ];

  for (const message of recent) {
    if (message.role === 'system') continue;
    messages.push({ role: message.role, content: message.content });
  }

  messages.push({
    role: 'user',
    content: [
      'This is the current promo:',
      '',
      '<promo>',
      params.currentPromo,
      '</promo>',
      '',
      params.userInstruction,
      '',
      'Return only the revised promo copy.',
    ].join('\n'),
  });

  return { messages };
}
