import type { PersonAdminDTO } from '@scriptcraft/shared';
import { Modal } from '../../../components/ui/Modal';

interface Props {
  person: PersonAdminDTO;
  isRemoving: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Removal is one click from a table row, so it asks first. */
export function RemovePersonModal({
  person,
  isRemoving,
  error,
  onCancel,
  onConfirm,
}: Props): React.JSX.Element {
  return (
    <Modal title="Remove access" onClose={onCancel}>
      <p className="text-sm text-slate-700">
        <span className="font-medium">{person.name ?? person.email}</span> will not be able to sign
        in again.
      </p>
      <p className="mt-2 text-sm text-slate-500">
        Nothing is deleted — their shows, promos and chat history stay exactly as they are. You can
        give access back later.
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
          disabled={isRemoving}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {isRemoving ? 'Removing…' : 'Remove access'}
        </button>
      </div>
    </Modal>
  );
}
