import type { AttachedPromo } from '@scriptcraft/shared';
interface Props {
    slug: string;
    onAttach: (promos: AttachedPromo[]) => void;
    onClose: () => void;
}
/**
 * Picks a batch of promos made from this skill file and records, per promo,
 * whether it worked and why.
 *
 * In phase A the verdicts are typed here by hand — the reporting feature that
 * will fill them in automatically is build step 11, and waiting for it would
 * stall the thing that matters most. Phase B (step 13) replaces this form with
 * data read from `promo_performance`.
 */
export declare function AttachPromosModal({ slug, onAttach, onClose }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=AttachPromosModal.d.ts.map