import type { AttachedPromo, MessageDTO, SelectableModelId } from '@scriptcraft/shared';
import type { PendingMessage, SkillIntentInfo } from '../hooks/useSkillChat';
interface Props {
    skillFileName: string;
    messages: MessageDTO[];
    /** The prose half of the turn currently streaming. */
    streamingSummary: string;
    isGenerating: boolean;
    intentInfo: SkillIntentInfo | null;
    error: string | null;
    /** Attached but not yet sent — cleared once the turn goes out. */
    pending: AttachedPromo[];
    /** The turn in flight, shown before the server's copy comes back. */
    pendingMessage: PendingMessage | null;
    model: SelectableModelId;
    isClearing: boolean;
    onModelChange: (model: SelectableModelId) => void;
    onOpenAttach: () => void;
    onClearPending: () => void;
    onSend: (message: string) => void;
    onCancel: () => void;
    onClear: () => void;
}
/**
 * The left panel: ask what the file does, ask for a rewrite, or attach a batch
 * of promos with what worked and what didn't.
 *
 * Only the prose half of an EDIT turn is shown here — the revised `.md` goes
 * to the content panel on the right, because pasting a whole file into a chat
 * bubble makes both unreadable.
 */
export declare function SkillFileChat({ skillFileName, messages, streamingSummary, isGenerating, intentInfo, error, pending, pendingMessage, model, isClearing, onModelChange, onOpenAttach, onClearPending, onSend, onCancel, onClear, }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=SkillFileChat.d.ts.map