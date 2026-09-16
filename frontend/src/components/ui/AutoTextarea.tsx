import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';

interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Height before anything is typed. */
  minRows?: number;
  /** Grows to this, then scrolls inside itself. */
  maxRows?: number;
}

/** Used when `line-height` computes to `normal`, which parses as NaN. */
const FALLBACK_LINE_HEIGHT = 20;

/**
 * A textarea that grows with what is typed and starts scrolling at `maxRows`.
 *
 * A single-line input hides everything but the tail of a long value, which is
 * the wrong trade for fields people write sentences into — the "why" on an
 * attached promo, a changelog line, a chat message. Capping the growth keeps a
 * long message from pushing the rest of the panel off screen.
 */
export const AutoTextarea = forwardRef<HTMLTextAreaElement, Props>(function AutoTextarea(
  { minRows = 1, maxRows = 8, value, onChange, style, ...rest },
  ref,
) {
  const innerRef = useRef<HTMLTextAreaElement>(null);

  // The parent still needs the real element — `Composer` focuses it after
  // picking a skill file.
  useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement, []);

  const resize = useCallback((): void => {
    const el = innerRef.current;
    if (!el) return;

    // `scrollHeight` only ever grows while an explicit height is set, so it has
    // to be cleared first or the box can never shrink back down.
    el.style.height = 'auto';

    const styles = window.getComputedStyle(el);
    const lineHeight = Number.parseFloat(styles.lineHeight) || FALLBACK_LINE_HEIGHT;
    const padding =
      Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
    // Tailwind's preflight sets `box-sizing: border-box`, so the height we set
    // includes borders while `scrollHeight` does not.
    const borders =
      Number.parseFloat(styles.borderTopWidth) + Number.parseFloat(styles.borderBottomWidth);

    const maxHeight = lineHeight * maxRows + padding + borders;
    const wanted = el.scrollHeight + borders;

    el.style.height = `${Math.min(wanted, maxHeight)}px`;
    el.style.overflowY = wanted > maxHeight ? 'auto' : 'hidden';
  }, [maxRows]);

  // Covers programmatic changes too — clearing the box after sending a message
  // has to shrink it back, and that never goes through `onChange`.
  useEffect(resize, [resize, value]);

  return (
    <textarea
      {...rest}
      ref={innerRef}
      rows={minRows}
      value={value}
      onChange={(event) => {
        resize();
        onChange?.(event);
      }}
      style={{ resize: 'none', ...style }}
    />
  );
});
