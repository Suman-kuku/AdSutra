import type { TeamDTO } from '@scriptcraft/shared';
import { Modal } from '../../../components/ui/Modal';

interface Props {
  team: TeamDTO;
  isDeleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteTeamModal({
  team,
  isDeleting,
  error,
  onCancel,
  onConfirm,
}: Props): React.JSX.Element {
  return (
    <Modal title="Delete team" onClose={onCancel}>
      <p className="text-sm text-slate-700">
        Delete <span className="font-medium">{team.name}</span>?
      </p>
      <p className="mt-2 text-sm text-slate-500">
        The group is removed. The {team.members.length}{' '}
        {team.members.length === 1 ? 'person' : 'people'} on it keep their access and everything
        they have made.
      </p>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isDeleting}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {isDeleting ? 'Deleting…' : 'Delete team'}
        </button>
      </div>
    </Modal>
  );
}
