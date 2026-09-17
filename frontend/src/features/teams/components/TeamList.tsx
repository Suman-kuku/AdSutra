import type { TeamDTO } from '@scriptcraft/shared';

interface Props {
  teams: TeamDTO[];
  onEdit: (team: TeamDTO) => void;
  onDelete: (team: TeamDTO) => void;
}

export function TeamList({ teams, onEdit, onDelete }: Props): React.JSX.Element {
  return (
    <ul className="flex flex-col gap-3">
      {teams.map((team) => (
        <li
          key={team.id}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-sm font-medium text-slate-900">{team.name}</h3>
            <span className="text-xs text-slate-400">
              {team.members.length} {team.members.length === 1 ? 'member' : 'members'}
            </span>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => onEdit(team)}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-700 transition hover:bg-slate-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(team)}
                className="rounded-md px-2 py-1 text-xs text-slate-500 transition hover:bg-red-50 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          </div>

          {team.members.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {team.members.map((member) => (
                <li
                  key={member.id}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
                >
                  {member.name ?? member.email}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-slate-400">No members yet.</p>
          )}
        </li>
      ))}
    </ul>
  );
}
