import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { SkillFileDetailDTO } from '@scriptcraft/shared';
import { formatBytes, formatDate } from '../../../utils/format';

/**
 * The skill file's identity, collapsed into one row at the top of the chat —
 * the counterpart of the episode chat's `EpisodeBar`, and for the same reason:
 * which file you are editing matters constantly, its metadata does not.
 */
export function SkillFileBar({ file }: { file: SkillFileDetailDTO }): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="shrink-0 border-b border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-2.5 px-4 py-2 text-left transition hover:bg-slate-50"
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-slate-100 text-slate-400">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5" />
          </svg>
        </span>

        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-medium text-slate-900">{file.name}</span>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            v{file.version}
          </span>
          <span className="truncate font-mono text-xs text-slate-400">
            {file.slug} · {file.category}
          </span>
        </span>

        <svg
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="space-y-3 border-t border-slate-100 px-4 py-3">
          {file.description && <p className="text-xs text-slate-600">{file.description}</p>}

          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
            <Detail label="Language" value={file.language ?? '—'} />
            <Detail
              label="Duration"
              value={file.defaultDurationSec === null ? '—' : `${file.defaultDurationSec}s`}
            />
            <Detail label="Size" value={formatBytes(file.sizeBytes)} />
            <Detail label="Created" value={formatDate(file.createdAt)} />
            <Detail label="Active" value={file.isActive ? 'yes' : 'retired'} />
          </dl>

          {file.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {file.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {file.changelog && (
            <p className="text-xs text-slate-500">
              <span className="font-medium text-slate-600">Changelog:</span> {file.changelog}
            </p>
          )}

          {/* The page header is gone, so these are the only way back. */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <Link
              to={`/skill-files/${file.slug}`}
              className="text-slate-500 transition hover:text-slate-900"
            >
              ← Back to this skill file
            </Link>
            <Link to="/skill-files" className="text-slate-500 transition hover:text-slate-900">
              All skill files
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div>
      <dt className="font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-slate-700">{value}</dd>
    </div>
  );
}
