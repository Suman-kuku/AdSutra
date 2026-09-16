interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    /** Height before anything is typed. */
    minRows?: number;
    /** Grows to this, then scrolls inside itself. */
    maxRows?: number;
}
/**
 * A textarea that grows with what is typed and starts scrolling at `maxRows`.
 *
 * A single-line input hides everything but the tail of a long value, which is
 * the wrong trade for fields people write sentences into — the "why" on an
 * attached promo, a changelog line, a chat message. Capping the growth keeps a
 * long message from pushing the rest of the panel off screen.
 */
export declare const AutoTextarea: import("react").ForwardRefExoticComponent<Props & import("react").RefAttributes<HTMLTextAreaElement>>;
export {};
//# sourceMappingURL=AutoTextarea.d.ts.map