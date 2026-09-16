import type { SkillFileVersionDTO } from '@scriptcraft/shared';
interface Props {
    content: string;
    onChange: (content: string) => void;
    /** True while a chat turn is writing into this panel. */
    isStreaming: boolean;
    /** Every version of this file, newest first. */
    versions: SkillFileVersionDTO[];
    /** The version currently loaded into the editor. */
    selectedVersion: number;
    onSelectVersion: (version: number) => void;
    /** Whether the text differs from the loaded version. */
    isDirty: boolean;
    /** Set when the text came from a chat turn rather than being typed. */
    fromChat: boolean;
    /** The version a new-version save would create. */
    nextVersion: number;
    isSavingInPlace: boolean;
    onSaveInPlace: () => void;
    onSaveAsNewVersion: () => void;
    onRevert: () => void;
    /** Confirmation or failure line for the last save. */
    savedNote: string | null;
    saveError: string | null;
}
/**
 * The `.md`, editable by hand, and where a chat rewrite lands.
 *
 * Two save paths, because they mean different things:
 *
 * - **Save** overwrites the version currently loaded. No new row. Use it for a
 *   typo or a wording fix, where a version of its own would be noise.
 * - **Save as new version** appends a row and retires the previous one, and is
 *   what any change worth comparing should use — `promos.skill_file_version`
 *   snapshots which version produced each promo, so a version edited in place
 *   no longer matches the promos attributed to it.
 *
 * Nothing here touches the database until one of those is clicked. Streaming
 * into this panel changes only what is on screen.
 */
export declare function SkillFileContent({ content, onChange, isStreaming, versions, selectedVersion, onSelectVersion, isDirty, fromChat, nextVersion, isSavingInPlace, onSaveInPlace, onSaveAsNewVersion, onRevert, savedNote, saveError, }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=SkillFileContent.d.ts.map