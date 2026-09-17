import { useEffect, useRef, useState } from 'react';
import type {
  AttachedPromo,
  MessageDTO,
  SelectableModelId,
  SkillFileDetailDTO,
} from '@scriptcraft/shared';
import { parseAttachedPromos, splitAttachedBlock, splitSkillEditorOutput } from '@scriptcraft/shared';
import { AutoTextarea } from '../../../components/ui/AutoTextarea';
import { IntentBadge } from '../../chat/components/IntentBadge';
import { ModelPicker } from '../../chat/components/ModelPicker';
import { AttachedPromosView, type DisplayPromo } from './AttachedPromosView';
import { SkillFileBar } from './SkillFileBar';
import type { PendingMessage, SkillIntentInfo } from '../hooks/useSkillChat';

interface Props {
  /** The version being worked on — its identity bar sits above the transcript. */
  file: SkillFileDetailDTO;
  skillFileName: string;
  /** Width of this pane as a percentage, or null while the panes are stacked. */
  widthPercent: number | null;
  messages: MessageDTO[];
  /** The prose half of the turn currently streaming. */
  streamingSummary: string;
  isGenerating: boolean;
  intentInfo: SkillIntentInfo | null;
  error: string | null;
  /** Attached but not yet sent — cleared once the turn goes out. */
  pending: AttachedPromo[];
  /** The turn in flight, shown before the server's copy comes back. */
  pendingMessage: PendingMessage | null;
  model: SelectableModelId;
  isClearing: boolean;
  onModelChange: (model: SelectableModelId) => void;
  onOpenAttach: () => void;
  onClearPending: () => void;
  onSend: (message: string) => void;
  onCancel: () => void;
  onClear: () => void;
}

/** Within this many px of the bottom counts as "at the bottom". */
const BOTTOM_THRESHOLD = 96;

/**
 * The left panel: ask what the file does, ask for a rewrite, or attach a batch
 * of promos with what worked and what didn't.
 *
 * Only the prose half of an EDIT turn is shown here — the revised `.md` goes
 * to the content panel on the right, because pasting a whole file into a chat
 * bubble makes both unreadable.
 */
export function SkillFileChat({
  file,
  skillFileName,
  widthPercent,
  messages,
  streamingSummary,
  isGenerating,
  intentInfo,
  error,
  pending,
  pendingMessage,
  model,
  isClearing,
  onModelChange,
  onOpenAttach,
  onClearPending,
  onSend,
  onCancel,
  onClear,
}: Props): React.JSX.Element {
  const [text, setText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [stickToBottom, setStickToBottom] = useState(true);

  // Follow new content only while already at the bottom — someone scrolled up
  // to read an earlier turn should never get yanked back down.
  useEffect(() => {
    if (stickToBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, streamingSummary, pendingMessage, stickToBottom]);

  const handleScroll = (): void => {
    const el = containerRef.current;
    if (!el) return;
    setStickToBottom(el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD);
  };

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    const trimmed = text.trim();
    // An attached batch is itself a request, so it can go without typing.
    if ((!trimmed && pending.length === 0) || isGenerating) return;
    onSend(trimmed || 'Here are some results from this skill file. What should change?');
    setText('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  return (
    // Drops its right edge at `lg` so the drag handle is the only line
    // between the two panes.
    <section
      style={widthPercent === null ? undefined : { width: `${widthPercent}%` }}
      className="flex min-h-[32rem] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white lg:min-h-0 lg:min-w-0 lg:shrink-0 lg:rounded-r-none lg:border-r-0"
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
        <h2 className="text-sm font-semibold">Chat with Skill File</h2>
        <div className="flex items-center gap-2">
          {intentInfo && (
            <IntentBadge
              intent={intentInfo.intent}
              source={intentInfo.source}
              {...(intentInfo.confidence === undefined ? {} : { confidence: intentInfo.confidence })}
            />
          )}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              disabled={isClearing}
              className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
              title="Starts a fresh thread. Nothing is erased."
            >
              {isClearing ? 'Clearing…' : 'Clear chat'}
            </button>
          )}
        </div>
      </header>

      <SkillFileBar file={file} />

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 space-y-3 overflow-y-auto p-4"
      >
        {messages.length === 0 && !isGenerating && pendingMessage === null && (
          <div className="flex h-full items-center justify-center">
            <p className="max-w-xs text-center text-sm text-slate-500">
              Ask what <span className="font-medium text-slate-700">{skillFileName}</span> does, ask
              for a change, or attach promos made from it and say which worked.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <Bubble key={message.id} message={message} />
        ))}

        {pendingMessage && (
          <UserBubble
            text={pendingMessage.text}
            promos={pendingMessage.attachedPromos.map(toDisplayPromo)}
          />
        )}

        {isGenerating && (
          <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2.5">
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {streamingSummary.length > 0 ? streamingSummary : 'Reading the skill file…'}
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="mx-3 mb-2 rounded-md bg-red-50 p-2.5 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {pending.length > 0 && (
        <div className="mx-3 mb-2 flex items-center justify-between gap-2 rounded-md bg-indigo-50 px-3 py-2">
          <p className="text-xs text-indigo-800">
            {pending.length} promo{pending.length === 1 ? '' : 's'} attached to this turn
          </p>
          <button
            type="button"
            onClick={onClearPending}
            className="text-xs text-indigo-700 underline underline-offset-2"
          >
            Remove
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-3">
        <AutoTextarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          minRows={2}
          maxRows={8}
          placeholder="Ask about this skill file, or say what to change…"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm leading-relaxed outline-none focus:border-indigo-400"
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenAttach}
            disabled={isGenerating}
            title="Attach promos made from this skill file"
            className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
              />
            </svg>
            Attach promos
          </button>

          <ModelPicker value={model} disabled={isGenerating} onChange={onModelChange} />

          <div className="flex-1" />

          {isGenerating ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!text.trim() && pending.length === 0}
              className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-40"
            >
              Send
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

/** The verdict as the prompt spells it — the transcript shows what was sent. */
const VERDICT_TEXT: Record<AttachedPromo['verdict'], string> = {
  worked: 'WORKED',
  did_not_work: 'DID NOT WORK',
  unclear: 'UNCLEAR',
};

function toDisplayPromo(promo: AttachedPromo): DisplayPromo {
  return {
    madeWith:
      promo.skillFileVersion === null || promo.skillFileVersion === undefined
        ? null
        : `v${promo.skillFileVersion}`,
    verdict: VERDICT_TEXT[promo.verdict],
    why: promo.why ?? null,
    content: promo.content,
  };
}

/** One user turn. Shared by the in-flight copy and the stored one, so they match. */
function UserBubble({
  text,
  promos,
}: {
  text: string;
  promos: DisplayPromo[];
}): React.JSX.Element {
  return (
    <div className="flex justify-end">
      <div className="max-w-[90%] rounded-2xl rounded-br-sm bg-indigo-50 px-4 py-2.5">
        {promos.length > 0 && <AttachedPromosView promos={promos} />}
        <p className="whitespace-pre-wrap text-sm text-slate-800">{text}</p>
      </div>
    </div>
  );
}

function Bubble({ message }: { message: MessageDTO }): React.JSX.Element {
  if (message.role === 'user') {
    const { attachments, message: typed } = splitAttachedBlock(message.content);
    return <UserBubble text={typed} promos={attachments ? parseAttachedPromos(attachments) : []} />;
  }

  if (message.error) {
    return (
      <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-red-50 px-4 py-2.5">
        <p className="text-sm text-red-700">{message.error}</p>
      </div>
    );
  }

  const { summary, skillFile } = splitSkillEditorOutput(message.content);

  return (
    <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2.5">
      <p className="whitespace-pre-wrap text-sm text-slate-800">{summary}</p>
      {skillFile && (
        <p className="mt-1.5 text-[11px] text-slate-500">
          Revised file sent to the content panel →
        </p>
      )}
    </div>
  );
}
