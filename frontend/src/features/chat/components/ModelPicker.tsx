import { useEffect, useRef, useState } from 'react';
import { MODEL_DISPLAY, SELECTABLE_MODELS, type SelectableModelId } from '@scriptcraft/shared';

interface Props {
  value: SelectableModelId;
  disabled: boolean;
  onChange: (model: SelectableModelId) => void;
}

/**
 * Picks which model generates promos in this chat. Applies to every turn —
 * generate, refine, and questions alike — but never to intent classification,
 * which always runs on the backend's `CLASSIFIER_MODEL`.
 *
 * A custom popover rather than a `<select>` so each model can carry a one-line
 * hint; native option elements can't be styled to show one. It sits in the
 * composer at the bottom of the page, so the list opens upward.
 */
export function ModelPicker({ value, disabled, onChange }: Props): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on an outside click or Escape — the popover has no backdrop of its own.
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event: MouseEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Model used to generate promos"
        className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="max-w-[9rem] truncate font-medium">{MODEL_DISPLAY[value].label}</span>
        <svg className="h-3 w-3 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute bottom-full left-0 z-20 mb-2 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {SELECTABLE_MODELS.map((model) => (
            <li key={model.id}>
              <button
                type="button"
                role="option"
                aria-selected={model.id === value}
                onClick={() => {
                  onChange(model.id);
                  setOpen(false);
                }}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left transition hover:bg-slate-50 ${
                  model.id === value ? 'bg-slate-50' : ''
                }`}
              >
                <span className="mt-0.5 w-3 shrink-0 text-xs text-indigo-600">
                  {model.id === value ? '✓' : ''}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-900">{model.label}</span>
                  <span className="block text-xs text-slate-500">{model.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
