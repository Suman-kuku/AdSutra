import type {
  PublishRequest,
  UpdateVersionRequest,
  SkillChatRequest,
  SkillChatStateDTO,
  SkillFileDetailDTO,
  SkillFilePromoDTO,
} from '@scriptcraft/shared';
import { apiFetch } from '../../../services/api.client';
import { streamSSE, type SseHandlers } from '../../../services/sse.client';

/** The open thread on this skill file and its transcript. `conversation` is null until the first turn. */
export function fetchSkillChat(slug: string): Promise<SkillChatStateDTO> {
  return apiFetch<SkillChatStateDTO>(`/skill-files/${slug}/chat`);
}

/** Promos made from any version of this skill file — the attach picker's list. */
export function fetchSkillFilePromos(slug: string): Promise<SkillFilePromoDTO[]> {
  return apiFetch<SkillFilePromoDTO[]>(`/skill-files/${slug}/promos`);
}

/** "Clear chat" — archives the thread. Nothing is erased. */
export function clearSkillChat(slug: string): Promise<null> {
  return apiFetch<null>(`/skill-files/${slug}/chat/clear`, { method: 'POST' });
}

/** One version's full `.md`, so the panel can load a retired version. */
export function fetchSkillFileVersion(
  slug: string,
  version: number,
): Promise<SkillFileDetailDTO> {
  return apiFetch<SkillFileDetailDTO>(`/skill-files/${slug}/versions/${version}`);
}

/** Edit in place — overwrites this version, creates no new row. */
export function updateSkillFileVersion(
  slug: string,
  version: number,
  input: UpdateVersionRequest,
): Promise<SkillFileDetailDTO> {
  return apiFetch<SkillFileDetailDTO>(`/skill-files/${slug}/versions/${version}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

/** Save as new version — commits the content panel's text as one new row. */
export function publishSkillFile(slug: string, input: PublishRequest): Promise<SkillFileDetailDTO> {
  return apiFetch<SkillFileDetailDTO>(`/skill-files/${slug}/publish`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** One streamed skill chat turn. Same frames as the episode chat. */
export function streamSkillChat(
  slug: string,
  body: SkillChatRequest,
  handlers: SseHandlers,
  signal?: AbortSignal,
): Promise<void> {
  return streamSSE(`/api/skill-files/${slug}/chat`, body, handlers, signal);
}
