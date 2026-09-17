import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { EpisodeDTO } from '@scriptcraft/shared';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { formatBytes } from '../../../utils/format';
import { fetchScriptFileUrl } from '../services/episode.service';

/**
 * The episode's identity, collapsed into one row at the top of the chat.
 *
 * It replaces the page header this screen used to carry: which episode you are
 * in matters constantly, but the file size and the original PDF matter once,
 * so only the first line is always on screen and the rest is behind the
 * chevron.
 */
export function EpisodeBar({ episode }: { episode: EpisodeDTO }): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Short-lived URL, so it is minted on click rather than on render.
  const openOriginal = (): void => {
    setFileError(null);
    void fetchScriptFileUrl(episode.id)
      .then(({ url }) => window.open(url, '_blank', 'noopener,noreferrer'))
      .catch((err: unknown) =>
        setFileError(err instanceof Error ? err.message : 'Could not open the file.'),
      );
  };

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

        {/* One line, not two: the filename trails the title rather than
            stacking under it, which halves the row's height. */}
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-medium text-slate-900">
            Episode {episode.episodeNumber}: {episode.title ?? 'Untitled'}
          </span>
          <StatusBadge status={episode.status} />
          <span className="truncate text-xs text-slate-400">
            {episode.scriptFilename ?? 'No script file'}
            {episode.pageCount !== null &&
              ` · ${episode.pageCount} ${episode.pageCount === 1 ? 'page' : 'pages'}`}
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
          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
            <Detail label="File size" value={formatBytes(episode.fileSize ?? 0)} />
            <Detail label="Pages" value={episode.pageCount === null ? '—' : String(episode.pageCount)} />
            <Detail label="Status" value={episode.status} />
          </dl>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openOriginal}
              disabled={!episode.scriptPath}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            >
              View original
            </button>
            {/* The page header is gone, so this is the only way back to the
                show — the topbar only reaches the shows list. */}
            <Link
              to={`/shows/${episode.showId}`}
              className="text-xs text-slate-500 transition hover:text-slate-900"
            >
              ← Back to show
            </Link>
          </div>

          {fileError && (
            <p className="text-xs text-red-600" role="alert">
              {fileError}
            </p>
          )}

          {episode.parseError && (
            <p className="rounded-md bg-red-50 p-2.5 text-xs text-red-700" role="alert">
              {episode.parseError}
            </p>
          )}
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
