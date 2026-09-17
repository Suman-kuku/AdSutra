import type { Enums } from '@scriptcraft/shared';
interface Props {
    value: Enums<'user_role'>;
    /** The signed-in admin's own row: a self role change would lock them out. */
    disabled: boolean;
    isSaving: boolean;
    onChange: (role: Enums<'user_role'>) => void;
}
export declare function RoleSelect({ value, disabled, isSaving, onChange }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=RoleSelect.d.ts.map