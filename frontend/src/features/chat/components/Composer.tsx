import { useRef, useState } from 'react';
import type { GenerateRequestInput, SelectableModelId, SkillFileDTO } from '@scriptcraft/shared';
import { AutoTextarea } from '../../../components/ui/AutoTextarea';
import { RefineChips } from './RefineChips';
import { ModelPicker } from './ModelPicker';
import { SkillFilePicker } from './SkillFilePicker';
import { SkillFileVersionPicker } from './SkillFileVersionPicker';
import { useSkillFilePicker } from '../hooks/useSkillFilePicker';

interface Props {
  disabled: boolean;
  isGenerating: boolean;
  /** Whether this thread already has an unsaved draft — gates refine chips and Regenerate. */
  hasDraft: boolean;
  /** The skill file already in play for this thread, for Regenerate. */
  activeSkillFileId: string | null;
  /** Which model generates every turn. Owned by ChatPanel, which sends it. */
  model: SelectableModelId;
  onModelChange: (model: SelectableModelId) => void;
  onSend: (body: GenerateRequestInput) => void;
  onCancel: () => void;
}

/** Matches a trailing `@query` the caret is sitting in. */
const MENTION_PATTERN = /@([\w-]*)$/;

/**
 * The one composer for every turn — CREATE, EDIT, and QUESTION all go through
 * `onSend`; the backend router decides which. `@mention` attaches a skill
 * file to *this* turn only: it is cleared after sending so a plain follow-up
 * message never accidentally resends it and forces a new CREATE.
 */
export function Composer({
  disabled,
  isGenerating,
  hasDraft,
  activeSkillFileId,
  model,
  onModelChange,
  onSend,
  onCancel,
}: Props): React.JSX.Element {
  const [text, setText] = useState('');
  const [selected, setSelected] = useState<SkillFileDTO | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Groups every version under its skill file. A promo can be generated from
  // any version, not only the current one — the prompt that produced a past
  // winner is often a retired one.
  const picker = useSkillFilePicker(mentionQuery);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const next = event.target.value;
    setText(next);

    const match = MENTION_PATTERN.exec(next.slice(0, event.target.selectionStart));
    setMentionQuery(match ? (match[1] ?? '') : null);
  };

  const choose = (file: SkillFileDTO): void => {
    setSelected(file);
    // Swap the half-typed @mention for the file's slug.
    setText((prev) => prev.replace(MENTION_PATTERN, `@${file.slug} `));
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const submit = (): void => {
    if (isGenerating) return;
    const message = text.replace(/@[\w-]+/g, '').trim();
    if (message.length === 0) return;

    onSend({ message, skillFileId: selected?.id });
    setText('');
    setSelected(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (picker.isOpen) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        picker.moveHighlight(1);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        picker.moveHighlight(-1);
        return;
      }
      // Right/left open and close the highlighted file's versions. Only
      // swallowed when there is something to open — otherwise they stay
      // ordinary caret movement inside the textarea.
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        const row = picker.rows[picker.highlighted];
        if (row && row.group.versions.length > 1) {
          event.preventDefault();
          picker.setExpanded(row.group.slug, event.key === 'ArrowRight');
          return;
        }
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        const file = picker.fileAt(picker.highlighted);
        if (file) {
          event.preventDefault();
          choose(file);
          return;
        }
      }
      if (event.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const canSend = text.replace(/@[\w-]+/g, '').trim().length > 0;

  return (
    <div className="relative border-t border-slate-200 bg-white">
      {hasDraft && !isGenerating && (
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <RefineChips
            disabled={disabled}
            onPick={(instruction) => onSend({ message: instruction, forcedIntent: 'EDIT' })}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onSend({
                message: 'Regenerate the promo from scratch.',
                forcedIntent: 'CREATE',
                skillFileId: activeSkillFileId ?? undefined,
              })
            }
            className="mr-3 mt-2 shrink-0 rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
          >
            Regenerate
          </button>
        </div>
      )}

      <div className="p-3">
        {picker.isOpen && (
          <SkillFilePicker
            rows={picker.rows}
            highlighted={picker.highlighted}
            isExpanded={picker.isExpanded}
            onHighlight={picker.setHighlighted}
            onToggleExpanded={picker.toggleExpanded}
            onPick={choose}
          />
        )}

        {selected && (
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="flex items-center gap-0.5 rounded-full bg-indigo-50 py-0.5 pl-2.5 pr-1 font-medium text-indigo-700">
              {selected.slug}
              <span aria-hidden="true">·</span>
              <SkillFileVersionPicker
                slug={selected.slug}
                value={selected}
                disabled={disabled || isGenerating}
                onChange={setSelected}
              />
            </span>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-slate-400 transition hover:text-slate-700"
            >
              clear
            </button>
            {/* Generating from a retired version is deliberate but easy to do by
                accident, so it is called out rather than left to the chip. */}
            {!selected.isActive && (
              <span className="text-amber-700">
                Using v{selected.version} — not the active version.
              </span>
            )}
          </div>
        )}

        {/* `items-end` and a softer radius, not a pill: once the textarea grows
            past one line a `rounded-full` box turns into a tall lozenge and the
            buttons drift to the vertical middle, away from the caret. */}
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white py-1.5 pl-2.5 pr-1.5">
          <ModelPicker value={model} disabled={disabled || isGenerating} onChange={onModelChange} />

          <AutoTextarea
            ref={inputRef}
            minRows={1}
            maxRows={8}
            value={text}
            disabled={disabled}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={
              hasDraft
                ? 'Refine this promo, ask a question, or type @ to generate a fresh one…'
                : 'Type @ to pick a skill file, then say what you want — or just ask a question…'
            }
            className="flex-1 bg-transparent py-1 text-sm leading-relaxed outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
          />

          {isGenerating ? (
            <button
              type="button"
              onClick={onCancel}
              title="Stop"
              aria-label="Stop"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-800"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="1.5" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canSend || disabled}
              title="Send"
              aria-label="Send"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:opacity-40"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.4 20.6l17.5-8.2a.6.6 0 0 0 0-1.08L3.4 3.1a.6.6 0 0 0-.85.67l1.7 7.03 10.5 1.2-10.5 1.2-1.7 7.03a.6.6 0 0 0 .85.67z" />
              </svg>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
