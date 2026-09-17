import { useState } from 'react';
import type { PersonAdminDTO, TeamDTO } from '@scriptcraft/shared';
import { PeoplePicker } from './PeoplePicker';

interface Props {
  people: PersonAdminDTO[];
  /** Set when editing an existing team; absent when creating one. */
  team?: TeamDTO;
  isSaving: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (values: { name: string; memberIds: string[] }) => void;
}

/** The create-and-edit card: a name, the members, save or cancel. */
export function TeamForm({
  people,
  team,
  isSaving,
  error,
  onCancel,
  onSubmit,
}: Props): React.JSX.Element {
  const [name, setName] = useState(team?.name ?? '');
  const [memberIds, setMemberIds] = useState<string[]>(
    team?.members.map((member) => member.id) ?? [],
  );

  const canSave = name.trim().length > 0 && !isSaving;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSave) return;
        onSubmit({ name: name.trim(), memberIds });
      }}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <label className="block text-[11px] uppercase tracking-wider text-slate-400" htmlFor="team-name">
        Team name
      </label>
      <input
        id="team-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="e.g. Scaling Pod"
        className="mt-1.5 w-full max-w-sm rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
      />

      <p className="mt-4 text-[11px] uppercase tracking-wider text-slate-400">Members</p>
      <div className="mt-1.5">
        <PeoplePicker people={people} selectedIds={memberIds} onChange={setMemberIds} />
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="mt-5 flex items-center gap-2">
        <button
          type="submit"
          disabled={!canSave}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : team ? 'Save changes' : 'Create team'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
