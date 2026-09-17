import type { PersonAdminDTO } from '@scriptcraft/shared';
interface Props {
    people: PersonAdminDTO[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
}
/**
 * Searchable multi-select over the people who have access. Selected people show
 * as removable chips, so the current membership is readable without opening the
 * list — which is the thing you check before saving.
 */
export declare function PeoplePicker({ people, selectedIds, onChange }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=PeoplePicker.d.ts.map