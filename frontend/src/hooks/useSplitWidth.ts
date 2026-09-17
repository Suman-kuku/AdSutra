import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Below this the panes stack vertically, so a horizontal split has nothing to
 * divide. Matches Tailwind's `lg`.
 */
const WIDE_QUERY = '(min-width: 1024px)';

/**
 * Neither pane may be dragged away entirely: past these the narrower one stops
 * being usable — the composer's buttons collide, or the promo wraps to one
 * word per line.
 */
const MIN_PERCENT = 25;
const MAX_PERCENT = 70;

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
export function useSplitWidth(storageKey: string, defaultPercent: number): SplitWidth {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isWide, setIsWide] = useState(() => window.matchMedia(WIDE_QUERY).matches);
  const [isDragging, setIsDragging] = useState(false);
  const [percent, setPercent] = useState(() => {
    try {
      const stored = Number(localStorage.getItem(storageKey));
      if (stored >= MIN_PERCENT && stored <= MAX_PERCENT) return stored;
    } catch {
      // Private window or blocked site data — the default is fine.
    }
    return defaultPercent;
  });

  useEffect(() => {
    const query = window.matchMedia(WIDE_QUERY);
    const onChange = (event: MediaQueryListEvent): void => setIsWide(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const commit = useCallback(
    (next: number) => {
      setPercent(next);
      try {
        localStorage.setItem(storageKey, String(next));
      } catch {
        // Not worth failing a drag over.
      }
    },
    [storageKey],
  );

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    // Capture on the handle so the drag survives the pointer outrunning it —
    // without this, a fast drag drops as soon as the cursor leaves the divider.
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return undefined;

    const onMove = (event: PointerEvent): void => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return;
      const raw = ((event.clientX - rect.left) / rect.width) * 100;
      setPercent(Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, raw)));
    };
    const onUp = (): void => setIsDragging(false);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [isDragging]);

  // Persist once the drag ends rather than on every move — a pointermove fires
  // per frame, and localStorage writes are synchronous.
  useEffect(() => {
    if (isDragging) return;
    try {
      localStorage.setItem(storageKey, String(percent));
    } catch {
      // See above.
    }
  }, [isDragging, percent, storageKey]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      const step = event.shiftKey ? 10 : 2;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        commit(Math.max(MIN_PERCENT, percent - step));
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        commit(Math.min(MAX_PERCENT, percent + step));
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        commit(defaultPercent);
      }
    },
    [commit, percent, defaultPercent],
  );

  return {
    containerRef,
    leftPercent: isWide ? percent : null,
    isDragging,
    handleProps: { onPointerDown, onDoubleClick: () => commit(defaultPercent), onKeyDown },
  };
}
