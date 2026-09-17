import type { PersonAdminDTO } from '@scriptcraft/shared';
import { formatDate } from '../../../utils/format';
import { PersonIdentity } from './PersonIdentity';

interface Props {
  people: PersonAdminDTO[];
  /** `pending` offers Approve and Reject; `denied` only offers Approve back. */
  mode: 'pending' | 'denied';
  busyFor: string | null;
  onApprove: (person: PersonAdminDTO) => void;
  onDeny: (person: PersonAdminDTO) => void;
}

export function WaitlistTable({
  people,
  mode,
  busyFor,
  onApprove,
  onDeny,
}: Props): React.JSX.Element {
  return (
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
              {mode === 'pending' ? 'Requested' : 'Joined'}
            </th>
            <th scope="col" className="px-5 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {people.map((person) => {
            const isBusy = busyFor === person.id;

            return (
              <tr key={person.id} className="border-b border-slate-100 last:border-0">
                <td className="px-5 py-3">
                  <PersonIdentity person={person} />
                </td>
                <td className="px-5 py-3 text-slate-500">{person.email}</td>
                <td className="px-5 py-3 text-slate-500">{formatDate(person.createdAt)}</td>

                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onApprove(person)}
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      {mode === 'pending' ? 'Approve' : 'Give access back'}
                    </button>

                    {mode === 'pending' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onDeny(person)}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
