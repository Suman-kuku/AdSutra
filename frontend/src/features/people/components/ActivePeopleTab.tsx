import { useMemo, useState } from 'react';
import type { Enums, PersonAdminDTO } from '@scriptcraft/shared';
import { useAuth } from '../../authentication';
import { useDenyPerson, usePeople, useUpdatePersonRole } from '../hooks/usePeople';
import { PeopleTable } from './PeopleTable';
import { RemovePersonModal } from './RemovePersonModal';

type RoleFilter = 'all' | Enums<'user_role'>;

/** Everyone who can sign in, with their role and the action that takes it away. */
export function ActivePeopleTab(): React.JSX.Element {
  const { person: currentUser } = useAuth();
  const { data: people, isLoading, isError, error } = usePeople('approved');

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [pendingRemoval, setPendingRemoval] = useState<PersonAdminDTO | null>(null);

  const updateRole = useUpdatePersonRole();
  const removePerson = useDenyPerson();

  // Filtered in the browser: the whole team is a few dozen rows, so a request
  // per keystroke would be slower than it is worth.
  const visible = useMemo(() => {
    if (!people) return [];
    const needle = query.trim().toLowerCase();

    return people.filter((row) => {
      if (roleFilter !== 'all' && row.role !== roleFilter) return false;
      if (!needle) return true;
      return (
        (row.name ?? '').toLowerCase().includes(needle) ||
        row.email.toLowerCase().includes(needle) ||
        row.role.includes(needle)
      );
    });
  }, [people, query, roleFilter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search people by name, email or role"
          aria-label="Search people"
          className="w-full max-w-sm rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
        />

        <select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
          aria-label="Filter by role"
          className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-400"
        >
          <option value="all">All roles</option>
          <option value="admin">Admin</option>
          <option value="creator">Creator</option>
        </select>

        {people && (
          <span className="ml-auto text-xs uppercase tracking-wider text-slate-400">
            {visible.length} of {people.length} people
          </span>
        )}
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading people…</p>}

      {isError && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error.message}
        </p>
      )}

      {updateRole.isError && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {updateRole.error.message}
        </p>
      )}

      {people && visible.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
          No one matches this search.
        </p>
      ) : (
        people && (
          <PeopleTable
            people={visible}
            currentUserId={currentUser?.id ?? ''}
            savingRoleFor={updateRole.isPending ? updateRole.variables.id : null}
            onRoleChange={(target, role) => updateRole.mutate({ id: target.id, role })}
            onRemove={setPendingRemoval}
          />
        )
      )}

      {pendingRemoval && (
        <RemovePersonModal
          person={pendingRemoval}
          isRemoving={removePerson.isPending}
          error={removePerson.isError ? removePerson.error.message : null}
          onCancel={() => {
            removePerson.reset();
            setPendingRemoval(null);
          }}
          onConfirm={() =>
            removePerson.mutate(pendingRemoval.id, {
              onSuccess: () => setPendingRemoval(null),
            })
          }
        />
      )}
    </div>
  );
}
