interface Props {
    isDragging: boolean;
    /** Current width of the left pane, announced to assistive tech. */
    valueNow: number;
    handleProps: {
        onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
        onDoubleClick: () => void;
        onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
    };
}
/**
 * The drag divider between two panes. Hidden below `lg`, where the panes stack.
 *
 * It is the *only* line between the panels — they drop their facing borders —
 * so the seam reads as one rule rather than three stacked hairlines.
 *
 * The visible element is 1px wide, which is unhittable, so an invisible strip
 * overhangs it on both sides. It is a child rather than padding on the handle
 * itself: padding would widen the line's own box and reopen the gap.
 */
export declare function SplitHandle({ isDragging, valueNow, handleProps }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=SplitHandle.d.ts.map