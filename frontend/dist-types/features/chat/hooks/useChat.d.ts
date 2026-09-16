import type { ConversationDTO, GenerateRequestInput, Intent, MessageDTO, RouteSource, SavedPromoDTO, SelectableModelId } from '@scriptcraft/shared';
export declare const chatKeys: {
    conversations: (episodeId: string) => readonly ["conversations", {
        readonly episodeId: string;
    }];
    messages: (conversationId: string) => readonly ["conversations", string, "messages"];
    promos: (episodeId: string) => readonly ["episodes", string, "promos"];
};
export declare function useConversations(episodeId: string): import("@tanstack/react-query").UseQueryResult<ConversationDTO[], Error>;
export declare function useMessages(conversationId: string | null): import("@tanstack/react-query").UseQueryResult<MessageDTO[], Error>;
/**
 * Promos already committed to `promos` for this episode — not the live draft.
 * Episode-scoped so they survive archiving a conversation.
 */
export declare function useSavedPromos(episodeId: string): import("@tanstack/react-query").UseQueryResult<SavedPromoDTO[], Error>;
/**
 * The model every turn in the chat is generated with, remembered across
 * sessions. A preference of the person, not of the episode, so it is stored
 * under one key rather than per conversation.
 *
 * Reads are guarded: a private window or blocked site data makes
 * `localStorage` throw, and a value written before a model was retired would
 * no longer be selectable — both fall back to the default.
 */
export declare function useSelectedModel(): {
    model: SelectableModelId;
    setModel: (model: SelectableModelId) => void;
};
export interface IntentInfo {
    intent: Intent;
    confidence?: number;
    source: RouteSource;
}
/**
 * Drives one streamed turn against the single `/generate` endpoint — CREATE,
 * EDIT, and QUESTION all flow through here, since the router (not the
 * frontend) decides which one a turn is. The partial text lives in local
 * state rather than the query cache — it changes on every token and would
 * thrash every consumer.
 */
export declare function useGenerateTurn(episodeId: string): {
    send: (conversationId: string, body: GenerateRequestInput) => Promise<void>;
    cancel: () => void;
    streamingText: string;
    isGenerating: boolean;
    intentInfo: IntentInfo | null;
    error: string | null;
    pendingMessage: string | null;
};
/**
 * Permanently deletes one saved promo version. The promo list is episode-scoped
 * and owned by the server, so success just refetches it rather than trying to
 * splice the row out locally — deleting a version can also orphan later ones.
 */
export declare function useDeletePromo(episodeId: string): {
    remove: (promoId: string) => Promise<void>;
    deletingId: string | null;
    error: string | null;
};
/**
 * Commits the chat's current draft to `promos`. Nothing before this point has
 * written to that table — every generate/refine turn is a draft living only
 * in `messages.content` until the user explicitly saves it.
 */
export declare function useSavePromo(episodeId: string): {
    save: (conversationId: string) => Promise<SavedPromoDTO>;
    isSaving: boolean;
    saved: SavedPromoDTO | null;
    error: string | null;
};
//# sourceMappingURL=useChat.d.ts.map