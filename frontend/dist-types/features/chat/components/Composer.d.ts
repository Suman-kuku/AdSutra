import type { GenerateRequestInput, SelectableModelId } from '@scriptcraft/shared';
interface Props {
    disabled: boolean;
    isGenerating: boolean;
    /** Whether this thread already has an unsaved draft — gates refine chips and Regenerate. */
    hasDraft: boolean;
    /** The skill file already in play for this thread, for Regenerate. */
    activeSkillFileId: string | null;
    /** Which model generates every turn. Owned by ChatPanel, which sends it. */
    model: SelectableModelId;
    onModelChange: (model: SelectableModelId) => void;
    onSend: (body: GenerateRequestInput) => void;
    onCancel: () => void;
}
/**
 * The one composer for every turn — CREATE, EDIT, and QUESTION all go through
 * `onSend`; the backend router decides which. `@mention` attaches a skill
 * file to *this* turn only: it is cleared after sending so a plain follow-up
 * message never accidentally resends it and forces a new CREATE.
 */
export declare function Composer({ disabled, isGenerating, hasDraft, activeSkillFileId, model, onModelChange, onSend, onCancel, }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=Composer.d.ts.map