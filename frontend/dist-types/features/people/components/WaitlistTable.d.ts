import type { PersonAdminDTO } from '@scriptcraft/shared';
interface Props {
    people: PersonAdminDTO[];
    /** `pending` offers Approve and Reject; `denied` only offers Approve back. */
    mode: 'pending' | 'denied';
    busyFor: string | null;
    onApprove: (person: PersonAdminDTO) => void;
    onDeny: (person: PersonAdminDTO) => void;
}
export declare function WaitlistTable({ people, mode, busyFor, onApprove, onDeny, }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=WaitlistTable.d.ts.map