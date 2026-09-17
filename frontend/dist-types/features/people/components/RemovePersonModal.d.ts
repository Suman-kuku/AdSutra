import type { PersonAdminDTO } from '@scriptcraft/shared';
interface Props {
    person: PersonAdminDTO;
    isRemoving: boolean;
    error: string | null;
    onCancel: () => void;
    onConfirm: () => void;
}
/** Removal is one click from a table row, so it asks first. */
export declare function RemovePersonModal({ person, isRemoving, error, onCancel, onConfirm, }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=RemovePersonModal.d.ts.map