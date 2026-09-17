import { useState } from 'react';
import type { TeamDTO } from '@scriptcraft/shared';
import { usePeople } from '../../people';
import { useCreateTeam, useDeleteTeam, useTeams, useUpdateTeam } from '../hooks/useTeams';
import { DeleteTeamModal } from './DeleteTeamModal';
import { TeamForm } from './TeamForm';
import { TeamList } from './TeamList';

/** Admin-managed groups of people. A team grants nothing on its own — yet. */
export function TeamsTab(): React.JSX.Element {
  const { data: teams, isLoading, isError, error } = useTeams();
  // Only people with access can be put on a team, so the picker reads the same
  // list the Active tab shows.
  const { data: people } = usePeople('approved');

  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState<TeamDTO | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<TeamDTO | null>(null);

  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();

  const closeForm = (): void => {
    setIsCreating(false);
    setEditing(null);
    createTeam.reset();
    updateTeam.reset();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-500">
          Groups of people, for organising who works together.
        </p>

        {!isCreating && !editing && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="ml-auto rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
          >
            + New team
          </button>
        )}
      </div>

      {isCreating && (
        <TeamForm
          people={people ?? []}
          isSaving={createTeam.isPending}
          error={createTeam.isError ? createTeam.error.message : null}
          onCancel={closeForm}
          onSubmit={(values) => createTeam.mutate(values, { onSuccess: closeForm })}
        />
      )}

      {editing && (
        <TeamForm
          key={editing.id}
          team={editing}
          people={people ?? []}
          isSaving={updateTeam.isPending}
          error={updateTeam.isError ? updateTeam.error.message : null}
          onCancel={closeForm}
          onSubmit={(values) =>
            updateTeam.mutate(
              { id: editing.id, input: { name: values.name, memberIds: values.memberIds } },
              { onSuccess: closeForm },
            )
          }
        />
      )}

      {isLoading && <p className="text-sm text-slate-500">Loading teams…</p>}

      {isError && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error.message}
        </p>
      )}

      {teams &&
        (teams.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
            No teams yet.
          </p>
        ) : (
          <TeamList
            teams={teams}
            onEdit={(team) => {
              setIsCreating(false);
              setEditing(team);
            }}
            onDelete={setPendingDeletion}
          />
        ))}

      {pendingDeletion && (
        <DeleteTeamModal
          team={pendingDeletion}
          isDeleting={deleteTeam.isPending}
          error={deleteTeam.isError ? deleteTeam.error.message : null}
          onCancel={() => {
            deleteTeam.reset();
            setPendingDeletion(null);
          }}
          onConfirm={() =>
            deleteTeam.mutate(pendingDeletion.id, {
              onSuccess: () => setPendingDeletion(null),
            })
          }
        />
      )}
    </div>
  );
}
