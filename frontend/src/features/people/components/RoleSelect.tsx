import type { Enums } from '@scriptcraft/shared';

const ROLES: Enums<'user_role'>[] = ['admin', 'creator'];

interface Props {
  value: Enums<'user_role'>;
  /** The signed-in admin's own row: a self role change would lock them out. */
  disabled: boolean;
  isSaving: boolean;
  onChange: (role: Enums<'user_role'>) => void;
}

export function RoleSelect({ value, disabled, isSaving, onChange }: Props): React.JSX.Element {
  return (
    <select
      value={value}
      disabled={disabled || isSaving}
      aria-label="Role"
      title={disabled ? 'You cannot change your own role.' : undefined}
      onChange={(event) => onChange(event.target.value as Enums<'user_role'>)}
      className="w-40 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm capitalize outline-none transition hover:border-slate-300 focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {ROLES.map((role) => (
        <option key={role} value={role} className="capitalize">
          {role}
        </option>
      ))}
    </select>
  );
}
