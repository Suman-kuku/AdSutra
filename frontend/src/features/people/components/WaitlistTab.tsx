import { useState } from 'react';
import { useApprovePerson, useDenyPerson, usePeople } from '../hooks/usePeople';
import { WaitlistTable } from './WaitlistTable';

/**
 * Access requests. A row lands here the first time someone signs in with a
 * company Google account — the sign-in creates their profile but not their
 * access, so this list is the gate.
 *
 * "Denied" is the same list for people who were rejected or removed later, and
 * approving one gives access straight back.
 */
export function WaitlistTab(): React.JSX.Element {
  const [showDenied, setShowDenied] = useState(false);
  const status = showDenied ? 'denied' : 'pending';

  const { data: people, isLoading, isError, error } = usePeople(status);
  const approve = useApprovePerson();
  const deny = useDenyPerson();

  const busyFor = approve.isPending
    ? approve.variables
    : deny.isPending
      ? deny.variables
      : null;
  const actionError = approve.error?.message ?? deny.error?.message ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-500">
          {showDenied
            ? 'People who were rejected or had their access removed.'
            : 'People who signed in and are waiting for access.'}
        </p>

        <label className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={showDenied}
            onChange={(event) => setShowDenied(event.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300"
          />
          Show denied
        </label>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading requests…</p>}

      {isError && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error.message}
        </p>
      )}

      {actionError && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {actionError}
        </p>
      )}

      {people &&
        (people.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
            {showDenied ? 'Nobody has been denied access.' : 'No one is waiting for access.'}
          </p>
        ) : (
          <WaitlistTable
            people={people}
            mode={showDenied ? 'denied' : 'pending'}
            busyFor={busyFor}
            onApprove={(person) => approve.mutate(person.id)}
            onDeny={(person) => deny.mutate(person.id)}
          />
        ))}
    </div>
  );
}
