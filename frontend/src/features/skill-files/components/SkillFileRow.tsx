import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SkillFileSummaryDTO } from '@scriptcraft/shared';
import { formatBytes, formatDate, formatTime } from '../../../utils/format';
import { useSkillFileVersions } from '../hooks/useSkillFiles';

/**
 * Icon tint, picked from the category so the same category always looks the
 * same across the list. Cosmetic only — nothing reads meaning out of it.
 */
const TINTS = [
  'bg-blue-50 text-blue-600',
  'bg-emerald-50 text-emerald-600',
  'bg-violet-50 text-violet-600',
  'bg-amber-50 text-amber-600',
  'bg-rose-50 text-rose-600',
  'bg-cyan-50 text-cyan-600',
];

function tintFor(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i += 1) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  return TINTS[hash % TINTS.length] ?? TINTS[0] ?? '';
}

export function SkillFileRow({ file }: { file: SkillFileSummaryDTO }): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  // Version history is only fetched once a row is opened — the list can be long
  // and most rows are never expanded.
  const versions = useSkillFileVersions(file.slug, expanded);

  return (
    <li className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-4 p-4">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tintFor(file.category)}`}
          aria-hidden="true"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14 3v4a1 1 0 001 1h4M15 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V7l-4-4z"
            />
          </svg>
        </span>

        <div className="min-w-0 flex-1">
          <Link
            to={`/skill-files/${file.slug}`}
            className="font-medium text-slate-900 transition hover:text-indigo-700"
          >
            {file.slug}
          </Link>
          {file.description && (
            <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{file.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-slate-600">
              {file.category}
            </span>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
              {file.versionCount} version{file.versionCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <dl className="hidden shrink-0 items-start gap-6 border-l border-slate-100 pl-6 text-sm md:flex">
          <Stat icon="calendar" value={formatDate(file.createdAt)} label="Last updated" />
          <Stat icon="file" value={formatBytes(file.sizeBytes)} label="Latest size" />
          <Stat icon="chart" value={String(file.totalUses)} label="Total uses" />
        </dl>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Hide versions' : 'Show versions'}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
          >
            <svg
              className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            </svg>
          </button>

          <RowMenu slug={file.slug} />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-sm font-medium text-slate-700">
              Versions ({file.versionCount})
            </h4>
            <Link
              to={`/skill-files/${file.slug}/chat`}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <span aria-hidden="true">+</span> New version
            </Link>
          </div>

          {versions.isLoading && <p className="text-sm text-slate-500">Loading versions…</p>}

          {versions.data && (
            <ol className="space-y-2">
              {versions.data.map((version, index) => (
                <li key={version.id} className="relative flex items-start gap-3">
                  {/* Timeline rail: a dot per version, joined to the next one. */}
                  <span className="relative flex w-3 shrink-0 justify-center pt-5" aria-hidden="true">
                    <span
                      className={`z-10 h-2.5 w-2.5 rounded-full ${
                        version.isActive ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    />
                    {index < versions.data.length - 1 && (
                      <span className="absolute top-7 h-full w-px bg-slate-200" />
                    )}
                  </span>

                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                    <span className="shrink-0 rounded bg-indigo-50 px-2 py-0.5 font-mono text-xs font-medium text-indigo-700">
                      v{version.version}
                    </span>
                    {version.isActive && (
                      <span className="shrink-0 rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        Latest
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-600">
                      {version.changelog ?? 'No changelog'}
                    </span>

                    <span className="shrink-0 text-right text-xs text-slate-500">
                      <span className="block">{formatDate(version.createdAt)}</span>
                      <span className="block text-slate-400">{formatTime(version.createdAt)}</span>
                    </span>
                    <span className="hidden w-16 shrink-0 text-right text-xs text-slate-500 sm:block">
                      {formatBytes(version.sizeBytes)}
                    </span>
                    <span className="hidden w-16 shrink-0 text-right text-xs text-slate-500 sm:block">
                      {version.uses} use{version.uses === 1 ? '' : 's'}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </li>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: 'calendar' | 'file' | 'chart';
  value: string;
  label: string;
}): React.JSX.Element {
  const paths: Record<typeof icon, string> = {
    calendar: 'M8 2v3M16 2v3M3.5 9h17M4 5h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z',
    file: 'M14 3v4a1 1 0 001 1h4M15 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V7l-4-4z',
    chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  };

  return (
    <div className="flex items-start gap-2">
      <svg
        className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={paths[icon]} />
      </svg>
      <div>
        <dt className="sr-only">{label}</dt>
        <dd className="whitespace-nowrap text-sm text-slate-900">{value}</dd>
        <p className="whitespace-nowrap text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}

/** The ⋮ menu. Only actions that already have an endpoint behind them. */
function RowMenu({ slug }: { slug: string }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const copySlug = (): void => {
    void navigator.clipboard.writeText(slug).then(
      () => {
        setCopied(true);
        setOpen(false);
        window.setTimeout(() => setCopied(false), 1500);
      },
      () => undefined,
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>

      {copied && (
        <span className="absolute right-0 top-9 z-20 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white">
          Slug copied
        </span>
      )}

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-20 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          <Link
            to={`/skill-files/${slug}/chat`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Open chat &amp; edit
          </Link>
          <Link
            to={`/skill-files/${slug}`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            View details
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={copySlug}
            className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Copy slug
          </button>
        </div>
      )}
    </div>
  );
}
