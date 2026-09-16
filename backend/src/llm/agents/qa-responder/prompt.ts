import type { Tables } from '@scriptcraft/shared';
import type { LlmMessage } from '../../client.js';
import { REFINE_HISTORY_LIMIT, resolveScriptContext } from '../../context-window.js';

type EpisodeRow = Tables<'episodes'>;
type MessageRow = Tables<'messages'>;

/** QUESTION: script digest plus the last few turns — never the full script, never a promo write. */
export function buildQuestionPrompt(params: {
  episode: EpisodeRow;
  currentPromo: string | null;
  history: MessageRow[];
  userInstruction: string;
}): { messages: LlmMessage[] } {
  const digest = resolveScriptContext(params.episode);
  const recent = params.history.slice(-REFINE_HISTORY_LIMIT);

  const system = [
    `You are answering a question about episode ${params.episode.episode_number}${
      params.episode.title ? ` ("${params.episode.title}")` : ''
    } and, if one exists, the promo being written for it.`,
    'Answer in prose. Do not write or rewrite promo copy — that happens elsewhere.',
  ].join('\n');

  const messages: LlmMessage[] = [
    { role: 'system', content: system },
    {
      role: 'user',
      content: ['Episode script (abridged for context):', '', '<script>', digest, '</script>'].join(
        '\n',
      ),
    },
  ];

  if (params.currentPromo) {
    messages.push({
      role: 'user',
      content: ['The current promo:', '', '<promo>', params.currentPromo, '</promo>'].join('\n'),
    });
  }

  for (const message of recent) {
    if (message.role === 'system') continue;
    messages.push({ role: message.role, content: message.content });
  }

  messages.push({ role: 'user', content: params.userInstruction });

  return { messages };
}
