import type { SkillFileDTO } from '@scriptcraft/shared';
interface Props {
    /** Which lineage to list. Every version of this slug is offered. */
    slug: string;
    /** The version currently attached to this turn. */
    value: SkillFileDTO;
    disabled: boolean;
    onChange: (file: SkillFileDTO) => void;
}
/**
 * Picks which *version* of a skill file generates this turn.
 *
 * `@` attaches the active version, which is what you want almost every time —
 * this is the escape hatch for the rest: regenerating a promo with the prompt
 * that actually produced last month's winner, or checking whether a revision
 * really helped before trusting it.
 *
 * Every version's row id is a valid `skillFileId`, so nothing downstream needs
 * to know an old one was used: the `promos` trigger snapshots
 * `skill_file_version` from whichever row was sent, which is what makes a
 * v1-vs-v2 comparison possible later.
 */
export declare function SkillFileVersionPicker({ slug, value, disabled, onChange, }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=SkillFileVersionPicker.d.ts.map