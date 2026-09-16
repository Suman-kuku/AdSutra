import { useState } from 'react';
import type { EpisodeDTO } from '@scriptcraft/shared';
import { fetchScriptFileUrl } from '../services/episode.service';

function formatBytes(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Compact file card for the episode header — the only script-related view left on this page. */
export function ScriptFileCard({ episode }: { episode: EpisodeDTO }): React.JSX.Element {
  const [fileError, setFileError] = useState<string | null>(null);

  // The signed URL is short-lived, so it is minted on click rather than on render.
  const openOriginal = (): void => {
    setFileError(null);
    void fetchScriptFileUrl(episode.id)
      .then(({ url }) => window.open(url, '_blank', 'noopener,noreferrer'))
      .catch((err: unknown) =>
        setFileError(err instanceof Error ? err.message : 'Could not open the file.'),
      );
  };

  return (
    <div className="shrink-0">
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded bg-red-50 text-xs font-semibold text-red-600">
          PDF
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{episode.scriptFilename ?? '—'}</p>
          <p className="text-xs text-slate-500">
            {episode.pageCount !== null && `${episode.pageCount} pages · `}
            {formatBytes(episode.fileSize)}
          </p>
        </div>
        <button
          type="button"
          onClick={openOriginal}
          title="Open the original file"
          aria-label="Open the original file"
          className="ml-2 shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          View
        </button>
      </div>
      {fileError && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {fileError}
        </p>
      )}
    </div>
  );
}
