import { Link } from 'react-router-dom';
import type { ShowDTO } from '@scriptcraft/shared';

export function ShowList({ shows }: { shows: ShowDTO[] }): React.JSX.Element {
  if (shows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        No shows yet. Create your first one to get started.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {shows.map((show) => (
        <li key={show.id}>
          <Link
            to={`/shows/${show.id}`}
            className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{show.title}</p>
                {show.description && (
                  <p className="mt-0.5 truncate text-sm text-slate-500">{show.description}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-1.5">
                {show.genre && <Tag>{show.genre}</Tag>}
                {show.language && <Tag>{show.language}</Tag>}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Tag({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
      {children}
    </span>
  );
}
