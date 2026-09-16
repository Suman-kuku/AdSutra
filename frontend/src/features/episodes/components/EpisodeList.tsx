import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { EpisodeDTO } from '@scriptcraft/shared';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { useDeleteEpisode } from '../hooks/useEpisodes';

export function EpisodeList({
  episodes,
  showId,
}: {
  episodes: EpisodeDTO[];
  showId: string;
}): React.JSX.Element {
  const deleteEpisode = useDeleteEpisode(showId);
  const [error, setError] = useState<string | null>(null);

  if (episodes.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        No episodes yet. Upload a script to add one.
      </p>
    );
  }

  const handleDelete = (episode: EpisodeDTO): void => {
    const label = episode.title ?? episode.scriptFilename ?? `episode ${episode.episodeNumber}`;
    const confirmed = window.confirm(
      `Delete "${label}"? This permanently deletes its script, every conversation and chat ` +
        'message on it, every promo generated from it, and any performance reports on those ' +
        'promos. This cannot be undone.',
    );
    if (!confirmed) return;

    setError(null);
    deleteEpisode.mutate(episode.id, { onError: (err) => setError(err.message) });
  };

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-md bg-red-50 p-2.5 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {episodes.map((episode) => {
          const isDeleting = deleteEpisode.isPending && deleteEpisode.variables === episode.id;

          return (
            <li key={episode.id} className="flex items-center gap-3 p-4 transition hover:bg-slate-50">
              <Link to={`/episodes/${episode.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="w-10 shrink-0 text-sm font-medium tabular-nums text-slate-400">
                  {episode.episodeNumber}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {episode.title ?? episode.scriptFilename ?? 'Untitled episode'}
                  </p>
                  {episode.scriptFilename && episode.title && (
                    <p className="truncate text-xs text-slate-500">{episode.scriptFilename}</p>
                  )}
                </div>
                <StatusBadge status={episode.status} />
              </Link>
              <button
                type="button"
                onClick={() => handleDelete(episode)}
                disabled={isDeleting}
                className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
