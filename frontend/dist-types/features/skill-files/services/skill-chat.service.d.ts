import type { PublishRequest, UpdateVersionRequest, SkillChatRequest, SkillChatStateDTO, SkillFileDetailDTO, SkillFilePromoDTO } from '@scriptcraft/shared';
import { type SseHandlers } from '../../../services/sse.client';
/** The open thread on this skill file and its transcript. `conversation` is null until the first turn. */
export declare function fetchSkillChat(slug: string): Promise<SkillChatStateDTO>;
/** Promos made from any version of this skill file — the attach picker's list. */
export declare function fetchSkillFilePromos(slug: string): Promise<SkillFilePromoDTO[]>;
/** "Clear chat" — archives the thread. Nothing is erased. */
export declare function clearSkillChat(slug: string): Promise<null>;
/** One version's full `.md`, so the panel can load a retired version. */
export declare function fetchSkillFileVersion(slug: string, version: number): Promise<SkillFileDetailDTO>;
/** Edit in place — overwrites this version, creates no new row. */
export declare function updateSkillFileVersion(slug: string, version: number, input: UpdateVersionRequest): Promise<SkillFileDetailDTO>;
/** Save as new version — commits the content panel's text as one new row. */
export declare function publishSkillFile(slug: string, input: PublishRequest): Promise<SkillFileDetailDTO>;
/** One streamed skill chat turn. Same frames as the episode chat. */
export declare function streamSkillChat(slug: string, body: SkillChatRequest, handlers: SseHandlers, signal?: AbortSignal): Promise<void>;
//# sourceMappingURL=skill-chat.service.d.ts.map