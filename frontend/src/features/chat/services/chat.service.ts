import type {
  ConversationDTO,
  CreateConversationInput,
  GenerateRequestInput,
  MessageDTO,
  SavedPromoDTO,
} from '@scriptcraft/shared';
import { apiFetch } from '../../../services/api.client';
import { streamSSE, type SseHandlers } from '../../../services/sse.client';

export function fetchConversations(episodeId: string): Promise<ConversationDTO[]> {
  return apiFetch<ConversationDTO[]>(`/conversations?episodeId=${encodeURIComponent(episodeId)}`);
}

export function createConversation(input: CreateConversationInput): Promise<ConversationDTO> {
  return apiFetch<ConversationDTO>('/conversations', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function fetchMessages(conversationId: string): Promise<MessageDTO[]> {
  return apiFetch<MessageDTO[]>(`/conversations/${conversationId}/messages`);
}

/**
 * Every promo version saved against this episode. Episode-scoped so archiving a
 * conversation doesn't hide the promos saved from it.
 */
export function listPromos(episodeId: string): Promise<SavedPromoDTO[]> {
  return apiFetch<SavedPromoDTO[]>(`/episodes/${episodeId}/promos`);
}

/** Commits the chat's current draft (nothing is in `promos` before this). */
export function savePromo(conversationId: string): Promise<SavedPromoDTO> {
  return apiFetch<SavedPromoDTO>(`/conversations/${conversationId}/save-promo`, {
    method: 'POST',
  });
}

/**
 * Permanently deletes one saved promo version. No undo — unlike archiving a
 * conversation, the row is really gone.
 */
export function deletePromo(promoId: string): Promise<null> {
  return apiFetch<null>(`/promos/${promoId}`, { method: 'DELETE' });
}

/** "Deletes" this conversation's history — actually archives it. Saved promos are untouched. */
export function archiveConversation(conversationId: string): Promise<ConversationDTO> {
  return apiFetch<ConversationDTO>(`/conversations/${conversationId}/archive`, {
    method: 'POST',
  });
}

/**
 * Posts to the one SSE chat-write endpoint and dispatches the frames. The
 * reader itself lives in `services/sse.client.ts` — the skill file chat
 * streams the same frames from a different URL.
 */
export function streamGenerate(
  conversationId: string,
  body: GenerateRequestInput,
  handlers: SseHandlers,
  signal?: AbortSignal,
): Promise<void> {
  return streamSSE(`/api/conversations/${conversationId}/generate`, body, handlers, signal);
}
