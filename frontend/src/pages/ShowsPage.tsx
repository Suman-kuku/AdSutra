import { useState } from 'react';
import { CreateShowForm, ShowList, useShows } from '../features/shows';
import { useAuth } from '../features/authentication';

export function ShowsPage(): React.JSX.Element {
  const { person } = useAuth();
  const { data: shows, isLoading, isError, error } = useShows();
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Shows</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {person?.role === 'admin' ? 'All shows across the team' : 'Shows you own'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreating((open) => !open)}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          {isCreating ? 'Cancel' : 'New show'}
        </button>
      </div>

      {isCreating && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-medium">Create a show</h2>
          <CreateShowForm onCreated={() => setIsCreating(false)} />
        </section>
      )}

      {isLoading && <p className="text-sm text-slate-500">Loading shows…</p>}

      {isError && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error.message}
        </p>
      )}

      {shows && <ShowList shows={shows} />}
    </div>
  );
}
