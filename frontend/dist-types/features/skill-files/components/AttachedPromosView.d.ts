/** What the view needs, whichever side it came from. */
export interface DisplayPromo {
    /** e.g. `v1` — the skill file version that produced it. */
    madeWith: string | null;
    /** `WORKED` / `DID NOT WORK` / `UNCLEAR`. */
    verdict: string;
    why: string | null;
    content: string;
}
/**
 * The attached batch, exactly as it was sent to the model but readable.
 *
 * Collapsed by default: two full promos inline would bury the conversation.
 * But nothing is summarised away behind the toggle — the verdicts, the whys
 * and the promo texts are all there, because they are all part of the message
 * the user sent and hiding them makes the transcript a worse record than the
 * prompt was.
 */
export declare function AttachedPromosView({ promos }: {
    promos: DisplayPromo[];
}): React.JSX.Element;
//# sourceMappingURL=AttachedPromosView.d.ts.map