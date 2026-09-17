import { useState } from 'react';
import type { EpisodeDTO, GenerateRequestInput, MessageDTO } from '@scriptcraft/shared';
import { EpisodeBar } from '../../episodes';
import { SplitHandle } from '../../../components/ui/SplitHandle';
import { useSplitWidth } from '../../../hooks/useSplitWidth';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import { PromoPanel } from './PromoPanel';
import { IntentBadge } from './IntentBadge';
import {
  useConversations,
  useDeletePromo,
  useGenerateTurn,
  useMessages,
  useSavedPromos,
  useSavePromo,
  useSelectedModel,
} from '../hooks/useChat';
import * as chatService from '../services/chat.service';

/**
 * Default split. Under half to the chat: its turns are short, while the promo
 * is a full script with timecodes and wraps badly in a narrow column.
 */
const DEFAULT_CHAT_PERCENT = 42;

/** The most recent assistant turn that produced promo copy, not a QA answer or a failed turn. */
function findLatestDraft(messages: MessageDTO[]): MessageDTO | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message && message.role === 'assistant' && message.skillFileId !== null && !message.error) {
      return message;
    }
  }
  return null;
}

/**
 * The promo chat for one episode. A conversation is created lazily on the
 * first turn, so opening an episode does not litter the database with empty
 * threads. Every turn — CREATE, EDIT, or QUESTION — goes through the same
 * `/generate` endpoint; the backend router decides which one it is.
 *
 * Nothing is written to `promos` by chat turns themselves: the draft lives in
 * the transcript until the user clicks Save.
 */
export function ChatPanel({ episode }: { episode: EpisodeDTO }): React.JSX.Element {
  const conversations = useConversations(episode.id);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [savedVersion, setSavedVersion] = useState<number | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const conversation = activeId
    ? (conversations.data?.find((c) => c.id === activeId) ?? null)
    : (conversations.data?.[0] ?? null);
  const conversationId = conversation?.id ?? null;
  const messages = useMessages(conversationId);
  const savedPromos = useSavedPromos(episode.id);
  const gen = useGenerateTurn(episode.id);
  const save = useSavePromo(episode.id);
  const deletePromo = useDeletePromo(episode.id);
  const { model, setModel } = useSelectedModel();
  const split = useSplitWidth('chat:splitPercent', DEFAULT_CHAT_PERCENT);

  const notReady = episode.status !== 'ready';
  const draft = findLatestDraft(messages.data ?? []);
  const hasDraft = draft !== null;

  const handleSend = (body: GenerateRequestInput): void => {
    setStartError(null);
    setSavedVersion(null);

    void (async () => {
      try {
        let id = conversationId;
        if (!id) {
          const created = await chatService.createConversation({
            episodeId: episode.id,
            title: body.message.slice(0, 80),
            skillFileId: body.skillFileId,
          });
          id = created.id;
          setActiveId(id);
          await conversations.refetch();
        }
        await gen.send(id, { ...body, model });
      } catch (err) {
        setStartError(err instanceof Error ? err.message : 'Could not start the conversation.');
      }
    })();
  };

  /**
   * Permanently deletes one saved version. Unlike "Delete history", which only
   * archives, this really erases the row — so it asks first and names the
   * version, and the warning says plainly that it cannot be undone.
   */
  const handleDeleteVersion = (promoId: string): void => {
    const target = savedPromos.data?.find((p) => p.id === promoId);
    const label = target ? `v${target.version}` : 'this version';
    const confirmed = window.confirm(
      `Delete ${label} permanently? This cannot be undone. Other versions are kept.`,
    );
    if (!confirmed) return;

    setSavedVersion(null);
    void deletePromo.remove(promoId).catch(() => {
      // deletePromo.error already carries the message for display below.
    });
  };

  const handleSave = (): void => {
    if (!conversationId) return;
    void save
      .save(conversationId)
      .then((result) => setSavedVersion(result.version))
      .catch(() => {
        // save.error already carries the message for display below.
      });
  };

  /**
   * "Deletes" the conversation's history — actually archives it (CLAUDE.md
   * §6: `messages` has no delete policy). Any promo already saved from this
   * thread lives independently in `promos` and is untouched either way.
   */
  const handleDeleteHistory = (): void => {
    if (!conversationId) return;
    const confirmed = window.confirm(
      "Delete this conversation's history? Any promo you've already saved will not be affected.",
    );
    if (!confirmed) return;

    setIsArchiving(true);
    setArchiveError(null);
    gen.cancel();

    void (async () => {
      try {
        await chatService.archiveConversation(conversationId);
        await conversations.refetch();
        setActiveId(null);
        setSavedVersion(null);
      } catch (err) {
        setArchiveError(
          err instanceof Error ? err.message : "Could not delete this conversation's history.",
        );
      } finally {
        setIsArchiving(false);
      }
    })();
  };

  return (
    // This is now the page root, so it owns the full height the old page
    // wrapper used to provide.
    <div
      ref={split.containerRef}
      className={`flex flex-col gap-6 lg:h-full lg:min-h-0 lg:gap-0 lg:flex-row ${
        // While dragging, the pointer sweeps across both panes and would
        // otherwise select their text.
        split.isDragging ? 'select-none' : ''
      }`}
    >
      <section
        style={split.leftPercent === null ? undefined : { width: `${split.leftPercent}%` }}
        // Drops its right edge at `lg` so the drag handle supplies the only
        // line between the two panes.
        className="flex min-h-[32rem] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white lg:min-h-0 lg:min-w-0 lg:shrink-0 lg:rounded-r-none lg:border-r-0"
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
          <h2 className="text-sm font-semibold">Generate Promo</h2>
          <div className="flex items-center gap-2">
            {gen.intentInfo && (
              <IntentBadge
                intent={gen.intentInfo.intent}
                source={gen.intentInfo.source}
                confidence={gen.intentInfo.confidence}
              />
            )}
            {messages.data && messages.data.length > 0 && (
              <span className="text-xs text-slate-400">{messages.data.length} messages</span>
            )}
            {conversationId && (
              <button
                type="button"
                onClick={handleDeleteHistory}
                disabled={isArchiving}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
              >
                {isArchiving ? 'Deleting…' : 'Delete history'}
              </button>
            )}
          </div>
        </header>

        <EpisodeBar episode={episode} />

        {notReady ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="max-w-xs text-center text-sm text-slate-500">
              {episode.status === 'failed'
                ? 'This script could not be parsed, so there is nothing to generate from.'
                : 'Waiting for the script to finish parsing…'}
            </p>
          </div>
        ) : (
          <MessageList
            messages={messages.data ?? []}
            streamingText={gen.streamingText}
            isGenerating={gen.isGenerating}
            pendingMessage={gen.pendingMessage}
          />
        )}

        {(gen.error ?? startError ?? save.error ?? archiveError ?? deletePromo.error) && (
          <p className="mx-3 mb-2 rounded-md bg-red-50 p-2.5 text-sm text-red-700" role="alert">
            {gen.error ?? startError ?? save.error ?? archiveError ?? deletePromo.error}
          </p>
        )}

        <Composer
          disabled={notReady}
          isGenerating={gen.isGenerating}
          hasDraft={hasDraft}
          activeSkillFileId={conversation?.activeSkillFileId ?? null}
          model={model}
          onModelChange={setModel}
          onSend={handleSend}
          onCancel={gen.cancel}
        />
      </section>

      <SplitHandle
        isDragging={split.isDragging}
        valueNow={split.leftPercent ?? DEFAULT_CHAT_PERCENT}
        handleProps={split.handleProps}
      />

      <PromoPanel
        latestPromo={draft?.content ?? null}
        savedPromos={savedPromos.data ?? []}
        justSavedPromoId={save.saved?.id ?? null}
        // A QUESTION turn streams a prose answer, not promo copy — don't show it here.
        streamingText={gen.intentInfo?.intent === 'QUESTION' ? '' : gen.streamingText}
        isGenerating={gen.isGenerating}
        canSave={hasDraft && !gen.isGenerating}
        isSaving={save.isSaving}
        savedVersion={savedVersion}
        onSave={handleSave}
        onDeleteVersion={handleDeleteVersion}
        deletingVersionId={deletePromo.deletingId}
      />
    </div>
  );
}
