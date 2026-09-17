import type { Enums, PersonAdminDTO } from '@scriptcraft/shared';
interface Props {
    people: PersonAdminDTO[];
    /** The signed-in admin — their own row cannot be edited or removed. */
    currentUserId: string;
    savingRoleFor: string | null;
    onRoleChange: (person: PersonAdminDTO, role: Enums<'user_role'>) => void;
    onRemove: (person: PersonAdminDTO) => void;
}
export declare function PeopleTable({ people, currentUserId, savingRoleFor, onRoleChange, onRemove, }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=PeopleTable.d.ts.map