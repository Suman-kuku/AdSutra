import type { Tables } from '@scriptcraft/shared';
import type { LlmMessage } from '../../client.js';
import { scriptForFirstGeneration } from '../../context-window.js';
import { systemPrompt } from '../../prompt-builder.js';

type SkillFileRow = Tables<'skill_files'>;
type EpisodeRow = Tables<'episodes'>;

/** CREATE: the full script goes in — this is the one intent that gets it. */
export function buildCreatePrompt(params: {
  skillFile: SkillFileRow;
  episode: EpisodeRow;
  userInstruction: string;
}): { messages: LlmMessage[]; scriptTruncated: boolean } {
  const { text, truncated } = scriptForFirstGeneration(params.episode.extracted_text ?? '');

  return {
    scriptTruncated: truncated,
    messages: [
      { role: 'system', content: systemPrompt(params.skillFile, params.episode) },
      {
        role: 'user',
        content: [
          'Here is the episode script.',
          '',
          '<script>',
          text,
          '</script>',
          truncated ? '\n(The script was truncated to fit the context window.)' : '',
          '',
          params.userInstruction,
        ]
          .filter(Boolean)
          .join('\n'),
      },
    ],
  };
}
