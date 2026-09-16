import type { SkillFileSummaryDTO } from '@scriptcraft/shared';
/**
 * The library, one row per slug with its versions folded inside.
 *
 * Flat rather than grouped by category: the per-category rule in CLAUDE.md
 * section 9 is about *ranking* in the chat picker, where herding matters. This
 * page is a browsable list, so the category rides along as a chip instead.
 */
export declare function SkillFileList({ files, emptyHint, }: {
    files: SkillFileSummaryDTO[];
    /** Shown when a search matched nothing, as opposed to an empty library. */
    emptyHint?: string;
}): React.JSX.Element;
//# sourceMappingURL=SkillFileList.d.ts.map