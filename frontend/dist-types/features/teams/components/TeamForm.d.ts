import type { PersonAdminDTO, TeamDTO } from '@scriptcraft/shared';
interface Props {
    people: PersonAdminDTO[];
    /** Set when editing an existing team; absent when creating one. */
    team?: TeamDTO;
    isSaving: boolean;
    error: string | null;
    onCancel: () => void;
    onSubmit: (values: {
        name: string;
        memberIds: string[];
    }) => void;
}
/** The create-and-edit card: a name, the members, save or cancel. */
export declare function TeamForm({ people, team, isSaving, error, onCancel, onSubmit, }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=TeamForm.d.ts.map