import type { Tables } from '@scriptcraft/shared';

type SkillFileRow = Tables<'skill_files'>;
type EpisodeRow = Tables<'episodes'>;

/**
 * Shared assembly helper. The skill file's prompt body *is* the system
 * prompt — that is the whole point of the library, so it is never paraphrased
 * or wrapped in competing instructions. Used by both `promo-creator` and
 * `promo-editor`; `qa-responder` builds its own (it isn't writing promo copy).
 */
export function systemPrompt(skillFile: SkillFileRow, episode: EpisodeRow): string {
  const duration = skillFile.default_duration_sec
    ? `\nTarget length: about ${skillFile.default_duration_sec} seconds when read aloud.`
    : '';

  return [
    skillFile.prompt_body,
    '',
    '---',
    `You are writing a promo for episode ${episode.episode_number}${
      episode.title ? ` ("${episode.title}")` : ''
    }.${duration}`,
    'Return only the promo copy itself — no preamble, no explanation, no markdown fences.',
  ].join('\n');
}
