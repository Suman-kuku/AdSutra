import type { Enums } from '@scriptcraft/shared';

const STYLES: Record<Enums<'episode_status'>, string> = {
  uploaded: 'bg-slate-100 text-slate-600',
  parsing: 'bg-amber-100 text-amber-700',
  ready: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
};

export function StatusBadge({ status }: { status: Enums<'episode_status'> }): React.JSX.Element {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {status}
    </span>
  );
}
