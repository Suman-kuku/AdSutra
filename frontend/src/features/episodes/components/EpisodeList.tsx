import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="w-12 px-4 py-2.5 font-medium">
                #
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Title
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                File
              </th>
              <th scope="col" className="w-28 px-4 py-2.5 font-medium">
                Status
              </th>
              <th scope="col" className="w-24 px-4 py-2.5 text-right font-medium">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {episodes.map((episode) => {
              const isDeleting = deleteEpisode.isPending && deleteEpisode.variables === episode.id;

              return (
                // The whole row navigates. A `<Link>` cannot wrap `<tr>`
                // without breaking table layout, so the handler sits on the
                // row and Delete stops the event from reaching it.
                <tr
                  key={episode.id}
                  onClick={() => void navigate(`/episodes/${episode.id}`)}
                  className="cursor-pointer transition hover:bg-slate-50"
                >
                  <td className="px-4 py-3 tabular-nums text-slate-400">
                    {episode.episodeNumber}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {episode.title ?? 'Untitled episode'}
                  </td>
                  <td className="px-4 py-3">
                    {episode.scriptFilename ? (
                      <>
                        <span className="text-indigo-600">{episode.scriptFilename}</span>
                        {episode.pageCount !== null && (
                          <span className="block text-xs text-slate-500">
                            {episode.pageCount} {episode.pageCount === 1 ? 'page' : 'pages'}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={episode.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDelete(episode);
                      }}
                      disabled={isDeleting}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    >
                      {isDeleting ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
