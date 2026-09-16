import { useCallback, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AttachedPromo,
  Intent,
  PublishRequest,
  UpdateVersionRequest,
  RouteSource,
  SkillChatRequest,
  SkillChatStateDTO,
  SkillFileDetailDTO,
  SkillFilePromoDTO,
} from '@scriptcraft/shared';
import * as skillChatService from '../services/skill-chat.service';
import { skillFileKeys } from './useSkillFiles';

export const skillChatKeys = {
  chat: (slug: string) => ['skill-files', slug, 'chat'] as const,
  promos: (slug: string) => ['skill-files', slug, 'promos'] as const,
};

export function useSkillChat(slug: string) {
  return useQuery<SkillChatStateDTO>({
    queryKey: skillChatKeys.chat(slug),
    queryFn: () => skillChatService.fetchSkillChat(slug),
    enabled: slug.length > 0,
  });
}

/** Loaded only when the attach picker opens — most turns never need this list. */
export function useSkillFilePromos(slug: string, enabled: boolean) {
  return useQuery<SkillFilePromoDTO[]>({
    queryKey: skillChatKeys.promos(slug),
    queryFn: () => skillChatService.fetchSkillFilePromos(slug),
    enabled: enabled && slug.length > 0,
  });
}

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
export function useSkillChatTurn(slug: string) {
  const queryClient = useQueryClient();
  const [streamingText, setStreamingText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [intentInfo, setIntentInfo] = useState<SkillIntentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<PendingMessage | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsGenerating(false);
    setStreamingText('');
  }, []);

  const send = useCallback(
    async (body: SkillChatRequest): Promise<void> => {
      const abort = new AbortController();
      abortRef.current = abort;

      setIsGenerating(true);
      setError(null);
      setStreamingText('');
      setIntentInfo(null);
      // Shown straight away. The server has the canonical copy a moment later,
      // but waiting for it leaves the user staring at an empty composer.
      setPendingMessage({ text: body.message, attachedPromos: body.attachedPromos ?? [] });

      try {
        await skillChatService.streamSkillChat(
          slug,
          body,
          {
            onIntent: (event) =>
              setIntentInfo({
                intent: event.intent,
                ...(event.confidence === undefined ? {} : { confidence: event.confidence }),
                source: event.source,
              }),
            onToken: (text) => setStreamingText((prev) => prev + text),
            onUsage: () => {
              // Token/latency readout isn't surfaced in this panel.
            },
            onDone: () => undefined,
            onError: (message) => setError(message),
          },
          abort.signal,
        );
      } catch (err) {
        if (!abort.signal.aborted) {
          setError(err instanceof Error ? err.message : 'The chat failed.');
        }
      } finally {
        setIsGenerating(false);
        abortRef.current = null;
        // The server owns the canonical transcript; re-read it rather than
        // splicing the finished turn in locally. Awaited before the pending
        // copy is dropped — clearing first would blink the message out and
        // back in as the refetch lands.
        await queryClient.invalidateQueries({ queryKey: skillChatKeys.chat(slug) });
        setPendingMessage(null);
      }
    },
    [queryClient, slug],
  );

  /** Drops the finished stream once its text has been read out of the transcript. */
  const clearStream = useCallback(() => setStreamingText(''), []);

  return {
    send,
    cancel,
    clearStream,
    streamingText,
    isGenerating,
    intentInfo,
    error,
    pendingMessage,
  };
}

/** One version's full `.md` — what the content panel loads when you switch version. */
export function useSkillFileVersion(slug: string, version: number | null) {
  return useQuery<SkillFileDetailDTO>({
    queryKey: [...skillFileKeys.versions(slug), version] as const,
    queryFn: () => skillChatService.fetchSkillFileVersion(slug, version ?? 0),
    enabled: slug.length > 0 && version !== null,
  });
}

/**
 * Edit in place. Creates no version, so promos already made with this version
 * keep pointing at it while its text changes underneath them — deliberate, and
 * why "Save as new version" exists alongside it.
 */
export function useUpdateSkillFileVersion(slug: string) {
  const queryClient = useQueryClient();
  return useMutation<SkillFileDetailDTO, Error, { version: number; input: UpdateVersionRequest }>({
    mutationFn: ({ version, input }) =>
      skillChatService.updateSkillFileVersion(slug, version, input),
    onSuccess: () => {
      // Size, changelog and the prompt body all change, so every view of this
      // slug is stale.
      void queryClient.invalidateQueries({ queryKey: skillFileKeys.all });
    },
  });
}

/**
 * Save. One new version per click — there is no autosave, because every save
 * is a version and autosaving would produce v14 by lunchtime.
 */
export function usePublishSkillFile(slug: string) {
  const queryClient = useQueryClient();
  return useMutation<SkillFileDetailDTO, Error, PublishRequest>({
    mutationFn: (input) => skillChatService.publishSkillFile(slug, input),
    onSuccess: () => {
      // A new version retires the previous one, so the list, the detail and the
      // version history are all stale.
      void queryClient.invalidateQueries({ queryKey: skillFileKeys.all });
    },
  });
}

/** "Clear chat" — archives the thread, erases nothing. */
export function useClearSkillChat(slug: string) {
  const queryClient = useQueryClient();
  return useMutation<null, Error, void>({
    mutationFn: () => skillChatService.clearSkillChat(slug),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: skillChatKeys.chat(slug) });
    },
  });
}
