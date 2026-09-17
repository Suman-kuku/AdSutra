import { useState } from 'react';
import { EpisodeList, EpisodeUploadForm, useEpisodes } from '../../episodes';
import { useShow } from '../hooks/useShows';
import { formatDate } from '../../../utils/format';

/**
 * The right pane of the shows page: one show's details and its episodes.
 *
 * Takes an id rather than reading the route itself, so the page owns the
 * "which show" question and this stays a plain presentational unit.
 */
export function ShowDetailPanel({ showId }: { showId: string }): React.JSX.Element {
  const { data: show, isLoading, isError, error } = useShow(showId);
  const episodes = useEpisodes(showId);
  const [isUploading, setIsUploading] = useState(false);

  const nextNumber = (episodes.data ?? []).reduce((max, e) => Math.max(max, e.episodeNumber), 0) + 1;

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;

  if (isError) {
    return (
      <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
        {error.message}
      </p>
    );
  }

  if (!show) return <p className="text-sm text-slate-500">Show not found.</p>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{show.title}</h1>
        <p className="mt-1 text-sm text-slate-500">Created on {formatDate(show.createdAt)}</p>
        {show.description && <p className="mt-2 text-sm text-slate-600">{show.description}</p>}
      </header>

      <dl className="grid grid-cols-1 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white p-5 text-sm shadow-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Stat label="Genre" value={show.genre} />
        <Stat label="Language" value={show.language} />
        {/* The episode list is already loaded here, so it is the fresher count
            — `show.episodeCount` can lag by one right after an upload. */}
        <Stat
          label="Total episodes"
          value={String(episodes.data?.length ?? show.episodeCount)}
        />
      </dl>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold">
            Episodes {episodes.data && `(${episodes.data.length})`}
          </h2>
          <button
            type="button"
            onClick={() => setIsUploading((open) => !open)}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            {isUploading ? 'Cancel' : 'Upload script'}
          </button>
        </div>

        {isUploading && (
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <EpisodeUploadForm
              showId={showId}
              suggestedNumber={nextNumber}
              onUploaded={() => setIsUploading(false)}
            />
          </div>
        )}

        {episodes.isLoading && <p className="text-sm text-slate-500">Loading episodes…</p>}

        {episodes.isError && (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
            {episodes.error.message}
          </p>
        )}

        {episodes.data && <EpisodeList episodes={episodes.data} showId={showId} />}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | null }): React.JSX.Element {
  return (
    <div className="py-3 first:pt-0 sm:px-5 sm:py-0 sm:first:pl-0 sm:last:pr-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-900">{value ?? '—'}</dd>
    </div>
  );
}
