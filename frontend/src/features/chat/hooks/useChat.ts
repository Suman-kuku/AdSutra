import { useCallback, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ConversationDTO,
  GenerateRequestInput,
  Intent,
  MessageDTO,
  RouteSource,
  SavedPromoDTO,
  SelectableModelId,
} from '@scriptcraft/shared';
import { DEFAULT_MODEL_ID, isSelectableModelId } from '@scriptcraft/shared';
import * as chatService from '../services/chat.service';

export const chatKeys = {
  conversations: (episodeId: string) => ['conversations', { episodeId }] as const,
  messages: (conversationId: string) => ['conversations', conversationId, 'messages'] as const,
  promos: (episodeId: string) => ['episodes', episodeId, 'promos'] as const,
};

export function useConversations(episodeId: string) {
  return useQuery<ConversationDTO[]>({
    queryKey: chatKeys.conversations(episodeId),
    queryFn: () => chatService.fetchConversations(episodeId),
    enabled: episodeId.length > 0,
  });
}

export function useMessages(conversationId: string | null) {
  return useQuery<MessageDTO[]>({
    queryKey: chatKeys.messages(conversationId ?? ''),
    queryFn: () => chatService.fetchMessages(conversationId ?? ''),
    enabled: Boolean(conversationId),
  });
}

/**
 * Promos already committed to `promos` for this episode — not the live draft.
 * Episode-scoped so they survive archiving a conversation.
 */
export function useSavedPromos(episodeId: string) {
  return useQuery<SavedPromoDTO[]>({
    queryKey: chatKeys.promos(episodeId),
    queryFn: () => chatService.listPromos(episodeId),
    enabled: episodeId.length > 0,
  });
}

/** Where the model choice is remembered between visits. */
const MODEL_STORAGE_KEY = 'scriptcraft.chat.model';

/**
 * The model every turn in the chat is generated with, remembered across
 * sessions. A preference of the person, not of the episode, so it is stored
 * under one key rather than per conversation.
 *
 * Reads are guarded: a private window or blocked site data makes
 * `localStorage` throw, and a value written before a model was retired would
 * no longer be selectable — both fall back to the default.
 */
export function useSelectedModel(): {
  model: SelectableModelId;
  setModel: (model: SelectableModelId) => void;
} {
  const [model, setModelState] = useState<SelectableModelId>(() => {
    try {
      const stored = window.localStorage.getItem(MODEL_STORAGE_KEY);
      if (stored !== null && isSelectableModelId(stored)) return stored;
    } catch {
      // Storage unavailable — the default is a fine answer.
    }
    return DEFAULT_MODEL_ID;
  });

  const setModel = useCallback((next: SelectableModelId): void => {
    setModelState(next);
    try {
      window.localStorage.setItem(MODEL_STORAGE_KEY, next);
    } catch {
      // Not remembering the choice is better than breaking the picker.
    }
  }, []);

  return { model, setModel };
}

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
export function useGenerateTurn(episodeId: string) {
  const queryClient = useQueryClient();
  const [streamingText, setStreamingText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [intentInfo, setIntentInfo] = useState<IntentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** This turn's own message, shown before the server's copy comes back. */
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsGenerating(false);
    setStreamingText('');
  }, []);

  const send = useCallback(
    async (conversationId: string, body: GenerateRequestInput): Promise<void> => {
      const abort = new AbortController();
      abortRef.current = abort;

      setIsGenerating(true);
      setError(null);
      setStreamingText('');
      setIntentInfo(null);
      // Straight onto the screen. The transcript only refetches once the whole
      // reply has streamed, which is far too long to leave a sent message
      // invisible.
      setPendingMessage(body.message);

      try {
        await chatService.streamGenerate(
          conversationId,
          body,
          {
            onIntent: (event) =>
              setIntentInfo({ intent: event.intent, confidence: event.confidence, source: event.source }),
            onToken: (text) => setStreamingText((prev) => prev + text),
            onUsage: () => {
              // Surfaced later (token/latency readout) — not needed for this feature.
            },
            onDone: () => setStreamingText(''),
            onError: (message) => setError(message),
          },
          abort.signal,
        );
      } catch (err) {
        if (!abort.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Generation failed.');
        }
      } finally {
        setIsGenerating(false);
        abortRef.current = null;
        // Re-read the transcript: the server owns the canonical messages. The
        // local copy is dropped only once that has landed — clearing first
        // would blink the message out and back in.
        await queryClient.invalidateQueries({ queryKey: chatKeys.messages(conversationId) });
        setPendingMessage(null);
        void queryClient.invalidateQueries({ queryKey: chatKeys.conversations(episodeId) });
      }
    },
    [episodeId, queryClient],
  );

  return { send, cancel, streamingText, isGenerating, intentInfo, error, pendingMessage };
}

/**
 * Permanently deletes one saved promo version. The promo list is episode-scoped
 * and owned by the server, so success just refetches it rather than trying to
 * splice the row out locally — deleting a version can also orphan later ones.
 */
export function useDeletePromo(episodeId: string): {
  remove: (promoId: string) => Promise<void>;
  deletingId: string | null;
  error: string | null;
} {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remove = useCallback(
    async (promoId: string): Promise<void> => {
      setDeletingId(promoId);
      setError(null);
      try {
        await chatService.deletePromo(promoId);
        await queryClient.invalidateQueries({ queryKey: chatKeys.promos(episodeId) });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete this version.');
        throw err;
      } finally {
        setDeletingId(null);
      }
    },
    [episodeId, queryClient],
  );

  return { remove, deletingId, error };
}

/**
 * Commits the chat's current draft to `promos`. Nothing before this point has
 * written to that table — every generate/refine turn is a draft living only
 * in `messages.content` until the user explicitly saves it.
 */
export function useSavePromo(episodeId: string) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState<SavedPromoDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(
    async (conversationId: string): Promise<SavedPromoDTO> => {
      setIsSaving(true);
      setError(null);
      try {
        const result = await chatService.savePromo(conversationId);
        setSaved(result);
        void queryClient.invalidateQueries({ queryKey: chatKeys.promos(episodeId) });
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not save the promo.';
        setError(message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [episodeId, queryClient],
  );

  return { save, isSaving, saved, error };
}
