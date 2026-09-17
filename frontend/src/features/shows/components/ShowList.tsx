import { NavLink } from 'react-router-dom';
import type { ShowDTO } from '@scriptcraft/shared';
import { useAuth } from '../../authentication';
import { formatDate } from '../../../utils/format';

/**
 * The left rail of the shows page. Rows are links rather than buttons so a
 * show stays a URL — `/shows/:id` is shareable and survives a refresh, which
 * a selection held in component state would not.
 */
export function ShowList({ shows }: { shows: ShowDTO[] }): React.JSX.Element {
  const { person } = useAuth();

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
          <NavLink
            to={`/shows/${show.id}`}
            className={({ isActive }) =>
              `block rounded-lg border p-3 transition ${
                isActive
                  ? 'border-slate-300 bg-slate-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{show.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Created {formatDate(show.createdAt)}
                </p>
                {/* A teammate's show sits in the same list as your own, so it
                    says whose it is. Your own rows stay unlabelled. */}
                {show.ownerId !== person?.id && show.ownerName && (
                  <p className="mt-0.5 truncate text-xs text-slate-400">{show.ownerName}</p>
                )}
              </div>
              <p className="shrink-0 text-right text-xs text-slate-500">
                <span className="block text-sm font-medium text-slate-900">
                  {show.episodeCount}
                </span>
                {show.episodeCount === 1 ? 'episode' : 'episodes'}
              </p>
            </div>

            {(show.genre ?? show.language) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {show.genre && <Tag>{show.genre}</Tag>}
                {show.language && <Tag>{show.language}</Tag>}
              </div>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

function Tag({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      {children}
    </span>
  );
}
