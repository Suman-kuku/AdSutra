import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { AttachedPromo, MessageDTO, SkillChatRequest } from '@scriptcraft/shared';
import { splitSkillEditorOutput } from '@scriptcraft/shared';
import { useSelectedModel } from '../features/chat/hooks/useChat';
import { SplitHandle } from '../components/ui/SplitHandle';
import { useSplitWidth } from '../hooks/useSplitWidth';
import {
  AttachPromosModal,
  SaveVersionModal,
  SkillFileChat,
  SkillFileContent,
  useClearSkillChat,
  usePublishSkillFile,
  useSkillChat,
  useSkillChatTurn,
  useSkillFile,
  useSkillFileVersion,
  useSkillFileVersions,
  useUpdateSkillFileVersion,
} from '../features/skill-files';

/**
 * Default split. Under half to the chat: the right pane holds a whole `.md`
 * in a monospace column, which wraps badly when it is the narrower of the two.
 */
const DEFAULT_CHAT_PERCENT = 42;

/**
 * The most recent revised `.md` proposed in this thread, if any.
 *
 * Reloading the page must not silently drop an unsaved proposal: the chat is
 * append-only and the file text is right there in the transcript, so the panel
 * is restored from it rather than snapping back to the saved version.
 */
function latestProposedSkillFile(messages: MessageDTO[]): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (!message || message.role !== 'assistant' || message.error) continue;
    const { skillFile } = splitSkillEditorOutput(message.content);
    if (skillFile && skillFile.trim().length > 0) return skillFile;
  }
  return null;
}

/**
 * Two panels: chat on the left, the editable `.md` on the right.
 *
 * Any version can be loaded into the editor, not only the active one, and
 * there are two ways to save it — overwrite that version, or append a new one.
 * See `SkillFileContent` for which to reach for.
 */
export function SkillFileChatPage(): React.JSX.Element {
  const { slug = '' } = useParams<{ slug: string }>();
  const file = useSkillFile(slug);
  const versions = useSkillFileVersions(slug);
  const chat = useSkillChat(slug);
  const turn = useSkillChatTurn(slug);
  const publish = usePublishSkillFile(slug);
  const updateInPlace = useUpdateSkillFileVersion(slug);
  const clearChat = useClearSkillChat(slug);
  const { model, setModel } = useSelectedModel();
  const split = useSplitWidth('skill-chat:splitPercent', DEFAULT_CHAT_PERCENT);

  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const loaded = useSkillFileVersion(slug, selectedVersion);

  const [content, setContent] = useState<string | null>(null);
  const [fromChat, setFromChat] = useState(false);
  const [pending, setPending] = useState<AttachedPromo[]>([]);
  const [attachOpen, setAttachOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  /** Which version's text is sitting in the editor, so switching reloads but saving doesn't. */
  const loadedIdRef = useRef<string | null>(null);
  /** An unsaved chat proposal is restored once, on first load — never on a later switch. */
  const restoredRef = useRef(false);

  // Default to whichever version is active.
  useEffect(() => {
    if (selectedVersion === null && file.data) setSelectedVersion(file.data.version);
  }, [selectedVersion, file.data]);

  useEffect(() => {
    const detail = loaded.data;
    if (!detail || loadedIdRef.current === detail.id) return;
    // Hold off on the very first fill until the transcript has had its chance
    // to hand back an unsaved proposal.
    if (!restoredRef.current && chat.isPending) return;

    loadedIdRef.current = detail.id;

    if (!restoredRef.current) {
      restoredRef.current = true;
      const proposed = chat.data ? latestProposedSkillFile(chat.data.messages) : null;
      if (proposed) {
        setContent(proposed);
        setFromChat(true);
        return;
      }
    }

    setContent(detail.rawMd);
    setFromChat(false);
  }, [loaded.data, chat.data, chat.isPending]);

  // The panel replaces its contents with whatever is streaming in. A partial
  // `<skillfile>` section parses fine, so it fills in progressively.
  useEffect(() => {
    if (!turn.isGenerating) return;
    const { skillFile } = splitSkillEditorOutput(turn.streamingText);
    if (skillFile === null) return;
    setContent(skillFile);
    setFromChat(true);
  }, [turn.streamingText, turn.isGenerating]);

  const handleSend = (message: string): void => {
    setSavedNote(null);
    // The turn is about whatever the editor is showing — that version, and its
    // current text including unsaved edits. Without both, a question about v2
    // gets answered against the active version.
    const body: SkillChatRequest = {
      message,
      model,
      ...(selectedVersion !== null ? { version: selectedVersion } : {}),
      ...(content !== null ? { content } : {}),
      ...(pending.length > 0 ? { attachedPromos: pending } : {}),
    };
    setPending([]);
    void turn.send(body);
  };

  /** Overwrites the loaded version. No new row — see `SkillFileContent`. */
  const handleSaveInPlace = (): void => {
    if (content === null || selectedVersion === null) return;
    setSavedNote(null);
    updateInPlace.mutate(
      { version: selectedVersion, input: { content } },
      {
        onSuccess: (saved) => {
          loadedIdRef.current = saved.id;
          setContent(saved.rawMd);
          setFromChat(false);
          setSavedNote(`Saved v${saved.version} in place`);
        },
      },
    );
  };

  const handleSaveAsNewVersion = (changelog: string): void => {
    if (content === null) return;
    publish.mutate(
      { content, changelog },
      {
        onSuccess: (saved) => {
          loadedIdRef.current = saved.id;
          setSelectedVersion(saved.version);
          setContent(saved.rawMd);
          setFromChat(false);
          setSaveOpen(false);
          setSavedNote(`Saved as v${saved.version}`);
        },
      },
    );
  };

  /** Archives the thread and starts fresh. Nothing is erased — admins keep the transcript. */
  const handleClearChat = (): void => {
    const confirmed = window.confirm(
      'Clear this chat? The transcript is kept on record, and the file itself is not affected.',
    );
    if (!confirmed) return;
    turn.cancel();
    clearChat.mutate();
  };

  const handleRevert = (): void => {
    if (!loaded.data) return;
    setContent(loaded.data.rawMd);
    setFromChat(false);
    setSavedNote(null);
  };

  const handleSelectVersion = (version: number): void => {
    setSavedNote(null);
    setSelectedVersion(version);
  };

  const streamingSummary = splitSkillEditorOutput(turn.streamingText).summary;
  const rows = versions.data ?? [];
  const highestVersion = rows.reduce((max, row) => Math.max(max, row.version), 0);
  const isDirty = loaded.data !== undefined && content !== null && content !== loaded.data.rawMd;

  return (
    // No page header: the file's identity rides at the top of the chat panel,
    // the same way the episode chat carries its episode.
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      {file.isError && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {file.error.message}
        </p>
      )}

      {file.data && content !== null && selectedVersion !== null && (
        <div
          ref={split.containerRef}
          className={`flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row lg:gap-0 ${
            split.isDragging ? 'select-none' : ''
          }`}
        >
          <SkillFileChat
            file={file.data}
            widthPercent={split.leftPercent}
            skillFileName={file.data.name}
            messages={chat.data?.messages ?? []}
            streamingSummary={streamingSummary}
            isGenerating={turn.isGenerating}
            intentInfo={turn.intentInfo}
            error={turn.error ?? clearChat.error?.message ?? null}
            pending={pending}
            pendingMessage={turn.pendingMessage}
            model={model}
            isClearing={clearChat.isPending}
            onModelChange={setModel}
            onOpenAttach={() => setAttachOpen(true)}
            onClearPending={() => setPending([])}
            onSend={handleSend}
            onCancel={turn.cancel}
            onClear={handleClearChat}
          />

          <SplitHandle
            isDragging={split.isDragging}
            valueNow={split.leftPercent ?? DEFAULT_CHAT_PERCENT}
            handleProps={split.handleProps}
          />

          <SkillFileContent
            content={content}
            onChange={(next) => {
              setContent(next);
              setFromChat(false);
              setSavedNote(null);
            }}
            isStreaming={turn.isGenerating}
            versions={rows}
            selectedVersion={selectedVersion}
            onSelectVersion={handleSelectVersion}
            isDirty={isDirty}
            fromChat={fromChat}
            nextVersion={highestVersion + 1}
            isSavingInPlace={updateInPlace.isPending}
            onSaveInPlace={handleSaveInPlace}
            onSaveAsNewVersion={() => setSaveOpen(true)}
            onRevert={handleRevert}
            savedNote={savedNote}
            saveError={updateInPlace.error?.message ?? null}
          />
        </div>
      )}

      {attachOpen && (
        <AttachPromosModal
          slug={slug}
          onAttach={(promos) => {
            setPending(promos);
            setAttachOpen(false);
          }}
          onClose={() => setAttachOpen(false)}
        />
      )}

      {saveOpen && (
        <SaveVersionModal
          nextVersion={highestVersion + 1}
          isSaving={publish.isPending}
          error={publish.error?.message ?? null}
          onSave={handleSaveAsNewVersion}
          onClose={() => setSaveOpen(false)}
        />
      )}
    </div>
  );
}
