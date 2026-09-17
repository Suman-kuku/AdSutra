import { useParams } from 'react-router-dom';
import { useEpisode } from '../features/episodes';
import { ChatPanel } from '../features/chat';

/**
 * The chat page is two panels and nothing else. The episode's identity used to
 * sit in a page header above them; it now rides at the top of the chat panel
 * as a collapsible bar, which buys the transcript the vertical space back.
 */
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

  return <ChatPanel episode={episode} />;
}
