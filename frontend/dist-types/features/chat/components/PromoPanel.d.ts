import type { SavedPromoDTO } from '@scriptcraft/shared';
interface Props {
    /** Content of the most recent promo-bearing message, if any exists yet. */
    latestPromo: string | null;
    /** Every saved promo version in this thread, oldest first. */
    savedPromos: SavedPromoDTO[];
    /** Id of the promo the last Save produced, so the panel can jump to its tab. */
    justSavedPromoId: string | null;
    streamingText: string;
    isGenerating: boolean;
    /** Whether there's an unsaved draft worth committing to `promos`. */
    canSave: boolean;
    isSaving: boolean;
    /** Version number from the most recent successful save, for the confirmation note. */
    savedVersion: number | null;
    onSave: () => void;
    /** Permanently deletes one saved version. The caller confirms first. */
    onDeleteVersion: (promoId: string) => void;
    /** The version currently being deleted, so its chip can show progress. */
    deletingVersionId: string | null;
}
export declare function PromoPanel({ latestPromo, savedPromos, justSavedPromoId, streamingText, isGenerating, canSave, isSaving, savedVersion, onSave, onDeleteVersion, deletingVersionId, }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=PromoPanel.d.ts.map