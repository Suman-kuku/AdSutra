import type { SkillFileSummaryDTO } from '@scriptcraft/shared';
/** One skill file and every version of it, newest first. */
export interface SkillFileGroup {
    slug: string;
    /** The version shown on the group's own row, and picked when it is chosen. */
    active: SkillFileSummaryDTO;
    versions: SkillFileSummaryDTO[];
}
/**
 * A row as drawn: either a skill file, or one version nested under it. The
 * list is flattened this way so arrow keys can walk exactly what is on screen
 * — stepping into an expanded group's versions and over a collapsed one's.
 */
export type PickerRow = {
    kind: 'group';
    group: SkillFileGroup;
} | {
    kind: 'version';
    group: SkillFileGroup;
    file: SkillFileSummaryDTO;
};
/**
 * State behind the composer's `@` dropdown.
 *
 * Kept out of `Composer` so the composer only has to forward key presses; the
 * grouping, expansion and highlight all live here, and `SkillFilePicker` just
 * draws `rows`.
 */
export declare function useSkillFilePicker(query: string | null): {
    rows: PickerRow[];
    highlighted: number;
    isOpen: boolean;
    setHighlighted: (index: number) => void;
    moveHighlight: (delta: number) => void;
    toggleExpanded: (slug: string) => void;
    setExpanded: (slug: string, open: boolean) => void;
    isExpanded: (slug: string) => boolean;
    /** The skill file version at `index`, or null when the row is not pickable. */
    fileAt: (index: number) => SkillFileSummaryDTO | null;
};
//# sourceMappingURL=useSkillFilePicker.d.ts.map