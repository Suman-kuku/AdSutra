import type { PersonAdminDTO } from '@scriptcraft/shared';

/** Avatar + name, shared by the Active table and the waitlist. */
export function PersonIdentity({
  person,
  suffix,
}: {
  person: PersonAdminDTO;
  suffix?: string;
}): React.JSX.Element {
  const label = (person.name ?? person.email).trim();

  return (
    <div className="flex items-center gap-3">
      {person.avatarUrl ? (
        <img src={person.avatarUrl} alt="" className="h-7 w-7 rounded-full" />
      ) : (
        <span
          aria-hidden
          className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600"
        >
          {label.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="font-medium text-slate-900">
        {person.name ?? '—'}
        {suffix && <span className="ml-2 text-xs text-slate-400">{suffix}</span>}
      </span>
    </div>
  );
}
