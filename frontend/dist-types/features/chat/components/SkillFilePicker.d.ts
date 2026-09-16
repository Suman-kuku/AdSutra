import type { SkillFileSummaryDTO } from '@scriptcraft/shared';
import type { PickerRow } from '../hooks/useSkillFilePicker';
interface Props {
    rows: PickerRow[];
    highlighted: number;
    isExpanded: (slug: string) => boolean;
    onHighlight: (index: number) => void;
    onToggleExpanded: (slug: string) => void;
    onPick: (file: SkillFileSummaryDTO) => void;
}
/**
 * The `@` dropdown, drawn from the flattened rows `useSkillFilePicker` builds.
 * Purely presentational — it holds no state of its own, so the composer's key
 * handling and the mouse both drive the same highlight.
 *
 * Versions are grouped under their skill file rather than listed flat: three
 * revisions of one file otherwise look like three unrelated files, which is
 * exactly the confusion the grouping exists to remove.
 */
export declare function SkillFilePicker({ rows, highlighted, isExpanded, onHighlight, onToggleExpanded, onPick, }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=SkillFilePicker.d.ts.map