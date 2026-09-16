import { useEffect, useRef, useState } from 'react';
import type { MessageDTO, PersonDTO } from '@scriptcraft/shared';
import { useAuth } from '../../authentication';

interface Props {
  messages: MessageDTO[];
  streamingText: string;
  isGenerating: boolean;
  /** The turn in flight, rendered before the server's copy arrives. */
  pendingMessage: string | null;
}

/** Within this many px of the bottom counts as "at the bottom". */
const BOTTOM_THRESHOLD = 96;

export function MessageList({
  messages,
  streamingText,
  isGenerating,
  pendingMessage,
}: Props): React.JSX.Element {
  const { person } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [stickToBottom, setStickToBottom] = useState(true);

  const isNearBottom = (): boolean => {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD;
  };

  const handleScroll = (): void => {
    setStickToBottom(isNearBottom());
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth'): void => {
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' });
    setStickToBottom(true);
  };

  // Follow new content only while already at the bottom — a user scrolled up
  // to read older messages should never get yanked back down.
  useEffect(() => {
    if (stickToBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, streamingText, pendingMessage, stickToBottom]);

  if (messages.length === 0 && !isGenerating && pendingMessage === null) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="max-w-xs text-center text-sm text-slate-500">
          Pick a skill file with <span className="font-mono text-slate-700">@</span> and describe the
          promo you want. The episode script is already loaded.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full space-y-4 overflow-y-auto p-4"
      >
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} person={person} />
        ))}

        {pendingMessage !== null && (
          <div className="flex items-end justify-end gap-2">
            <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-indigo-50 px-4 py-2.5">
              <p className="text-sm text-slate-800">{pendingMessage}</p>
            </div>
            <UserAvatar person={person} />
          </div>
        )}

        {isGenerating && (
          <div className="flex items-end gap-2">
            <AssistantAvatar />
            <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2.5">
              <p className="text-sm text-slate-500">
                {streamingText.length > 0 ? 'Writing the promo…' : 'Reading the script…'}
              </p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {!stickToBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom()}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg transition hover:bg-slate-800"
        >
          ↓ New message
        </button>
      )}
    </div>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function initials(name: string | null, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0]?.[0], parts[1]?.[0]] : [parts[0]?.[0]];
  return letters.filter(Boolean).join('').toUpperCase();
}

function AssistantAvatar(): React.JSX.Element {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2.5c.6 2.4 1.2 3.9 2.1 4.9s2.5 1.5 4.9 2.1c-2.4.6-3.9 1.2-4.9 2.1s-1.5 2.5-2.1 4.9c-.6-2.4-1.2-3.9-2.1-4.9S7.4 10 5 9.4c2.4-.6 3.9-1.2 4.9-2.1S11.4 4.9 12 2.5z" />
      </svg>
    </div>
  );
}

function UserAvatar({ person }: { person: PersonDTO | null }): React.JSX.Element {
  if (person?.avatarUrl) {
    return <img src={person.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full" />;
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
      {person ? initials(person.name, person.email) : '?'}
    </div>
  );
}

function MessageBubble({
  message,
  person,
}: {
  message: MessageDTO;
  person: PersonDTO | null;
}): React.JSX.Element {
  const time = formatTime(message.createdAt);

  if (message.role === 'user') {
    return (
      <div className="flex items-end justify-end gap-2">
        <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-indigo-50 px-4 py-2.5">
          <p className="text-sm text-slate-800">{message.content}</p>
          <p className="mt-1 text-right text-[11px] text-slate-400">{time}</p>
        </div>
        <UserAvatar person={person} />
      </div>
    );
  }

  if (message.error) {
    return (
      <div className="flex items-end gap-2">
        <AssistantAvatar />
        <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-red-50 px-4 py-2.5">
          <p className="text-sm text-red-700">{message.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2">
      <AssistantAvatar />
      <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2.5">
        <p className="text-sm text-slate-800">
          {message.promoId
            ? "Here's the promo — see the panel on the right →"
            : message.content}
        </p>
        <p className="mt-1 text-right text-[11px] text-slate-400">{time}</p>
      </div>
    </div>
  );
}
