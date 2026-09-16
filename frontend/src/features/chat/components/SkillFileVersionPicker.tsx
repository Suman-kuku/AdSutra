import { useEffect, useRef, useState } from 'react';
import type { SkillFileDTO } from '@scriptcraft/shared';
import { useSkillFileVersions } from '../../skill-files';

interface Props {
  /** Which lineage to list. Every version of this slug is offered. */
  slug: string;
  /** The version currently attached to this turn. */
  value: SkillFileDTO;
  disabled: boolean;
  onChange: (file: SkillFileDTO) => void;
}

/**
 * Picks which *version* of a skill file generates this turn.
 *
 * `@` attaches the active version, which is what you want almost every time —
 * this is the escape hatch for the rest: regenerating a promo with the prompt
 * that actually produced last month's winner, or checking whether a revision
 * really helped before trusting it.
 *
 * Every version's row id is a valid `skillFileId`, so nothing downstream needs
 * to know an old one was used: the `promos` trigger snapshots
 * `skill_file_version` from whichever row was sent, which is what makes a
 * v1-vs-v2 comparison possible later.
 */
export function SkillFileVersionPicker({
  slug,
  value,
  disabled,
  onChange,
}: Props): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const versions = useSkillFileVersions(slug);

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

  const rows = versions.data ?? [];
  // A lineage with one version has nothing to choose between.
  const hasChoice = rows.length > 1;

  return (
    <span ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        disabled={disabled || !hasChoice}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={hasChoice ? 'Generate with a different version' : 'Only one version exists'}
        className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[11px] transition hover:bg-indigo-100 disabled:cursor-default disabled:hover:bg-transparent"
      >
        v{value.version}
        {hasChoice && (
          <svg
            className="h-2.5 w-2.5 opacity-60"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        )}
      </button>

      {open && hasChoice && (
        <ul
          role="listbox"
          className="absolute bottom-full left-0 z-20 mb-1.5 max-h-64 w-72 overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-left shadow-lg"
        >
          {rows.map((version) => (
            <li key={version.id}>
              <button
                type="button"
                role="option"
                aria-selected={version.id === value.id}
                onClick={() => {
                  onChange(version);
                  setOpen(false);
                }}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left transition hover:bg-slate-50 ${
                  version.id === value.id ? 'bg-slate-50' : ''
                }`}
              >
                <span className="mt-0.5 w-3 shrink-0 text-xs text-indigo-600">
                  {version.id === value.id ? '✓' : ''}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-medium text-slate-900">
                      v{version.version}
                    </span>
                    {version.isActive && (
                      <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                        active
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-normal text-slate-500">
                    {version.changelog ?? 'No changelog'}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}
