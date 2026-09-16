import type { AttachedPromo, Intent, UpdateVersionRequest, RouteSource, SkillChatRequest, SkillChatStateDTO, SkillFileDetailDTO, SkillFilePromoDTO } from '@scriptcraft/shared';
export declare const skillChatKeys: {
    chat: (slug: string) => readonly ["skill-files", string, "chat"];
    promos: (slug: string) => readonly ["skill-files", string, "promos"];
};
export declare function useSkillChat(slug: string): import("@tanstack/react-query").UseQueryResult<SkillChatStateDTO, Error>;
/** Loaded only when the attach picker opens — most turns never need this list. */
export declare function useSkillFilePromos(slug: string, enabled: boolean): import("@tanstack/react-query").UseQueryResult<SkillFilePromoDTO[], Error>;
/** A turn's own message, shown immediately rather than after the reply lands. */
export interface PendingMessage {
    text: string;
    attachedPromos: AttachedPromo[];
}
export interface SkillIntentInfo {
    intent: Intent;
    confidence?: number;
    source: RouteSource;
}
/**
 * Drives one streamed skill chat turn. The partial text lives in local state
 * rather than the query cache — it changes on every token.
 *
 * The caller splits `streamingText` into the prose summary and the revised
 * `.md` with `splitSkillEditorOutput`; this hook stays agnostic about what the
 * text means.
 */
export declare function useSkillChatTurn(slug: string): {
    send: (body: SkillChatRequest) => Promise<void>;
    cancel: () => void;
    clearStream: () => void;
    streamingText: string;
    isGenerating: boolean;
    intentInfo: SkillIntentInfo | null;
    error: string | null;
    pendingMessage: PendingMessage | null;
};
/** One version's full `.md` — what the content panel loads when you switch version. */
export declare function useSkillFileVersion(slug: string, version: number | null): import("@tanstack/react-query").UseQueryResult<SkillFileDetailDTO, Error>;
/**
 * Edit in place. Creates no version, so promos already made with this version
 * keep pointing at it while its text changes underneath them — deliberate, and
 * why "Save as new version" exists alongside it.
 */
export declare function useUpdateSkillFileVersion(slug: string): import("@tanstack/react-query").UseMutationResult<SkillFileDetailDTO, Error, {
    version: number;
    input: UpdateVersionRequest;
}, unknown>;
/**
 * Save. One new version per click — there is no autosave, because every save
 * is a version and autosaving would produce v14 by lunchtime.
 */
export declare function usePublishSkillFile(slug: string): import("@tanstack/react-query").UseMutationResult<SkillFileDetailDTO, Error, {
    content: string;
    changelog: string;
}, unknown>;
/** "Clear chat" — archives the thread, erases nothing. */
export declare function useClearSkillChat(slug: string): import("@tanstack/react-query").UseMutationResult<null, Error, void, unknown>;
//# sourceMappingURL=useSkillChat.d.ts.map