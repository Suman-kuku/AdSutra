import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CreateShowForm, ShowDetailPanel, ShowList, useShows } from '../features/shows';

/**
 * The landing page: shows on the left, the selected show's episodes on the
 * right. Serves both `/` (nothing selected) and `/shows/:id`.
 *
 * Both panes scroll on their own — a single page scroll would drag the rail
 * out of view while reading a long episode list.
 */
export function ShowsPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { data: shows, isLoading, isError, error } = useShows();
  const [isCreating, setIsCreating] = useState(false);
  const [query, setQuery] = useState('');

  // Filtered here rather than server-side: the list is small enough that a
  // round trip per keystroke would be slower than it is worth.
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle || !shows) return shows;
    return shows.filter((show) => show.title.toLowerCase().includes(needle));
  }, [shows, query]);

  return (
    // `lg:h-full` matches how the other full-height pages sit inside the
    // shell's scroll container. Below `lg` the panes stack and the page
    // scrolls as one, which is the only thing that fits a phone.
    <div className="flex flex-col gap-6 lg:h-full lg:min-h-0 lg:flex-row">
      <aside className="flex shrink-0 flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:w-80">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold tracking-tight">Shows</h1>
          <button
            type="button"
            onClick={() => setIsCreating((open) => !open)}
            className="rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
          >
            {isCreating ? 'Cancel' : '+ New show'}
          </button>
        </div>

        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search shows…"
          aria-label="Search shows"
          className="mt-3 w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
        />

        {isCreating && (
          <div className="mt-3 rounded-lg border border-slate-200 p-3">
            <CreateShowForm onCreated={() => setIsCreating(false)} />
          </div>
        )}

        <div className="mt-3 min-h-0 flex-1 lg:overflow-y-auto">
          {isLoading && <p className="text-sm text-slate-500">Loading shows…</p>}

          {isError && (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
              {error.message}
            </p>
          )}

          {visible && visible.length === 0 && query.trim() ? (
            <p className="p-3 text-sm text-slate-500">No show matches “{query.trim()}”.</p>
          ) : (
            visible && <ShowList shows={visible} />
          )}
        </div>
      </aside>

      <section className="min-h-0 flex-1 rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:overflow-y-auto">
        {id ? (
          <ShowDetailPanel key={id} showId={id} />
        ) : (
          <p className="flex h-full items-center justify-center text-center text-sm text-slate-400">
            Pick a show on the left to see its episodes.
          </p>
        )}
      </section>
    </div>
  );
}
