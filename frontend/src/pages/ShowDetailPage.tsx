import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useShow } from '../features/shows';
import { EpisodeList, EpisodeUploadForm, useEpisodes } from '../features/episodes';

export function ShowDetailPage(): React.JSX.Element {
  const { id = '' } = useParams<{ id: string }>();
  const { data: show, isLoading, isError, error } = useShow(id);
  const episodes = useEpisodes(id);
  const [isUploading, setIsUploading] = useState(false);

  const nextNumber = (episodes.data ?? []).reduce((max, e) => Math.max(max, e.episodeNumber), 0) + 1;

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-block text-sm text-slate-500 hover:text-slate-900">
        ← Shows
      </Link>

      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}

      {isError && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error.message}
        </p>
      )}

      {show && (
        <>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{show.title}</h1>
            {show.description && <p className="mt-1 text-sm text-slate-600">{show.description}</p>}
          </div>

          <dl className="grid grid-cols-3 gap-4 rounded-lg border border-slate-200 bg-white p-5 text-sm shadow-sm">
            <Detail label="Genre" value={show.genre} />
            <Detail label="Language" value={show.language} />
            <Detail label="Created" value={new Date(show.createdAt).toLocaleDateString()} />
          </dl>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold">Episodes</h2>
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
                  showId={id}
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

            {episodes.data && <EpisodeList episodes={episodes.data} showId={id} />}
          </section>
        </>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }): React.JSX.Element {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-slate-900">{value ?? '—'}</dd>
    </div>
  );
}
