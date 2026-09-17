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
        title={`Model: ${MODEL_DISPLAY[value].label}`}
        aria-label={`Model: ${MODEL_DISPLAY[value].label}. Change model`}
        className={`mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 ${
          open ? 'bg-slate-100 text-slate-600' : 'text-slate-400'
        }`}
      >
        {/* A chip glyph, not the model name: the name is long, changes with the
            selection, and most turns never touch it. It lives in the popover. */}
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <rect x="7" y="7" width="10" height="10" rx="2" strokeLinejoin="round" />
          <path
            strokeLinecap="round"
            d="M10 3v3M14 3v3M10 18v3M14 18v3M3 10h3M3 14h3M18 10h3M18 14h3"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-20 mb-2 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {/* The trigger is an icon, so the list has to say what it is choosing.
              Outside the listbox: a non-option child would confuse a screen
              reader reading the options out. */}
          <p className="px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Model
          </p>
          <ul role="listbox">
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
        </div>
      )}
    </div>
  );
}
