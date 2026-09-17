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
export function SplitHandle({ isDragging, valueNow, handleProps }: Props): React.JSX.Element {
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label="Resize panels"
      aria-valuenow={Math.round(valueNow)}
      aria-valuemin={0}
      aria-valuemax={100}
      title="Drag to resize · double-click to reset"
      {...handleProps}
      className={`relative hidden w-px shrink-0 cursor-col-resize touch-none transition-colors hover:bg-indigo-400 focus-visible:bg-indigo-500 focus-visible:outline-none lg:block ${
        isDragging ? 'bg-indigo-500' : 'bg-slate-200'
      }`}
    >
      <span className="absolute inset-y-0 -left-1.5 -right-1.5 z-10" />
    </div>
  );
}
