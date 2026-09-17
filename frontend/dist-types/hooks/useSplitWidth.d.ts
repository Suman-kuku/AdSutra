interface SplitWidth {
    /** Attach to the flex row that holds both panes. */
    containerRef: React.RefObject<HTMLDivElement>;
    /** Width of the first pane, or null while the layout is stacked. */
    leftPercent: number | null;
    isDragging: boolean;
    /** Spread onto the drag handle. */
    handleProps: {
        onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
        onDoubleClick: () => void;
        onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
    };
}
/**
 * A draggable divider between two side-by-side panes.
 *
 * The split is remembered per `storageKey` because it is a workspace
 * preference, not part of any document — someone who widens the promo pane
 * wants it wide tomorrow too. A failed read just falls back to the default;
 * `localStorage` throws in a private window rather than returning null.
 */
export declare function useSplitWidth(storageKey: string, defaultPercent: number): SplitWidth;
export {};
//# sourceMappingURL=useSplitWidth.d.ts.map