import { Link, useParams } from 'react-router-dom';
import { ScriptFileCard, useEpisode } from '../features/episodes';
import { ChatPanel } from '../features/chat';
import { StatusBadge } from '../components/ui/StatusBadge';

export function EpisodeDetailPage(): React.JSX.Element {
  const { id = '' } = useParams<{ id: string }>();
  const { data: episode, isLoading, isError, error } = useEpisode(id);

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;

  if (isError) {
    return (
      <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
        {error.message}
      </p>
    );
  }

  if (!episode) return <></>;

  return (
    <div className="flex flex-col gap-6 lg:h-full lg:min-h-0">
      <div className="shrink-0 space-y-6">
        <Link
          to={`/shows/${episode.showId}`}
          className="inline-block text-sm text-slate-500 hover:text-slate-900"
        >
          ← Show
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">
                Episode {episode.episodeNumber}: {episode.title ?? 'Untitled'}
              </h1>
              <StatusBadge status={episode.status} />
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              {episode.pageCount !== null && `${episode.pageCount} pages · `}
              {episode.scriptFilename}
            </p>
          </div>

          <ScriptFileCard episode={episode} />
        </div>

        {episode.parseError && (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
            {episode.parseError}
          </p>
        )}
      </div>

      <ChatPanel episode={episode} />
    </div>
  );
}
