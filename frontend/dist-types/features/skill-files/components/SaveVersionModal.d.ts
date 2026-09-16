interface Props {
    /** The version this Save will create, for the confirmation line. */
    nextVersion: number;
    isSaving: boolean;
    error: string | null;
    onSave: (changelog: string) => void;
    onClose: () => void;
}
/**
 * Save asks for a changelog line before it publishes.
 *
 * The mockup had no such field. Without it, "why does v3 say this?" is
 * unanswerable six months later — the row is all that survives, and the chat
 * that produced it may have been cleared.
 */
export declare function SaveVersionModal({ nextVersion, isSaving, error, onSave, onClose, }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=SaveVersionModal.d.ts.map