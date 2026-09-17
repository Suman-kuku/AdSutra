import type { TeamDTO } from '@scriptcraft/shared';
interface Props {
    team: TeamDTO;
    isDeleting: boolean;
    error: string | null;
    onCancel: () => void;
    onConfirm: () => void;
}
export declare function DeleteTeamModal({ team, isDeleting, error, onCancel, onConfirm, }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=DeleteTeamModal.d.ts.map