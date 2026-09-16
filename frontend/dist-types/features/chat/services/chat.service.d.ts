import type { ConversationDTO, CreateConversationInput, GenerateRequestInput, MessageDTO, SavedPromoDTO } from '@scriptcraft/shared';
import { type SseHandlers } from '../../../services/sse.client';
export declare function fetchConversations(episodeId: string): Promise<ConversationDTO[]>;
export declare function createConversation(input: CreateConversationInput): Promise<ConversationDTO>;
export declare function fetchMessages(conversationId: string): Promise<MessageDTO[]>;
/**
 * Every promo version saved against this episode. Episode-scoped so archiving a
 * conversation doesn't hide the promos saved from it.
 */
export declare function listPromos(episodeId: string): Promise<SavedPromoDTO[]>;
/** Commits the chat's current draft (nothing is in `promos` before this). */
export declare function savePromo(conversationId: string): Promise<SavedPromoDTO>;
/**
 * Permanently deletes one saved promo version. No undo — unlike archiving a
 * conversation, the row is really gone.
 */
export declare function deletePromo(promoId: string): Promise<null>;
/** "Deletes" this conversation's history — actually archives it. Saved promos are untouched. */
export declare function archiveConversation(conversationId: string): Promise<ConversationDTO>;
/**
 * Posts to the one SSE chat-write endpoint and dispatches the frames. The
 * reader itself lives in `services/sse.client.ts` — the skill file chat
 * streams the same frames from a different URL.
 */
export declare function streamGenerate(conversationId: string, body: GenerateRequestInput, handlers: SseHandlers, signal?: AbortSignal): Promise<void>;
//# sourceMappingURL=chat.service.d.ts.map