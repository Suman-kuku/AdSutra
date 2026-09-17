import type { Enums, PersonAdminDTO } from '@scriptcraft/shared';
import { PersonIdentity } from './PersonIdentity';
import { RoleSelect } from './RoleSelect';

interface Props {
  people: PersonAdminDTO[];
  /** The signed-in admin — their own row cannot be edited or removed. */
  currentUserId: string;
  savingRoleFor: string | null;
  onRoleChange: (person: PersonAdminDTO, role: Enums<'user_role'>) => void;
  onRemove: (person: PersonAdminDTO) => void;
}

export function PeopleTable({
  people,
  currentUserId,
  savingRoleFor,
  onRoleChange,
  onRemove,
}: Props): React.JSX.Element {
  return (
    // The table keeps its own horizontal scroll so the page body never scrolls
    // sideways on a narrow screen.
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-400">
            <th scope="col" className="px-5 py-3 font-medium">
              Name
            </th>
            <th scope="col" className="px-5 py-3 font-medium">
              Email
            </th>
            <th scope="col" className="px-5 py-3 font-medium">
              Role
            </th>
            <th scope="col" className="px-5 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {people.map((person) => {
            const isSelf = person.id === currentUserId;

            return (
              <tr key={person.id} className="border-b border-slate-100 last:border-0">
                <td className="px-5 py-3">
                  <PersonIdentity person={person} suffix={isSelf ? 'you' : undefined} />
                </td>

                <td className="px-5 py-3 text-slate-500">{person.email}</td>

                <td className="px-5 py-3">
                  <RoleSelect
                    value={person.role}
                    disabled={isSelf}
                    isSaving={savingRoleFor === person.id}
                    onChange={(role) => onRoleChange(person, role)}
                  />
                </td>

                <td className="px-5 py-3 text-right">
                  <button
                    type="button"
                    disabled={isSelf}
                    onClick={() => onRemove(person)}
                    title={isSelf ? 'You cannot remove your own access.' : undefined}
                    className="rounded-md px-2 py-1 text-slate-500 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
