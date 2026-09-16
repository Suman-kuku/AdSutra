import { useState } from 'react';

/** What the view needs, whichever side it came from. */
export interface DisplayPromo {
  /** e.g. `v1` — the skill file version that produced it. */
  madeWith: string | null;
  /** `WORKED` / `DID NOT WORK` / `UNCLEAR`. */
  verdict: string;
  why: string | null;
  content: string;
}

const VERDICT_STYLE: Record<string, string> = {
  WORKED: 'bg-emerald-100 text-emerald-700',
  'DID NOT WORK': 'bg-red-100 text-red-700',
  UNCLEAR: 'bg-slate-200 text-slate-700',
};

/**
 * The attached batch, exactly as it was sent to the model but readable.
 *
 * Collapsed by default: two full promos inline would bury the conversation.
 * But nothing is summarised away behind the toggle — the verdicts, the whys
 * and the promo texts are all there, because they are all part of the message
 * the user sent and hiding them makes the transcript a worse record than the
 * prompt was.
 */
export function AttachedPromosView({ promos }: { promos: DisplayPromo[] }): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-1.5">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex items-center gap-1 text-[11px] font-medium text-indigo-700 transition hover:text-indigo-900"
      >
        📎 {promos.length} promo{promos.length === 1 ? '' : 's'} attached
        <svg
          className={`h-2.5 w-2.5 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul className="mt-1.5 space-y-1.5">
          {promos.map((promo, index) => (
            <li
              key={index}
              className="rounded-lg border border-indigo-100 bg-white/70 p-2 text-left"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    VERDICT_STYLE[promo.verdict] ?? VERDICT_STYLE['UNCLEAR'] ?? ''
                  }`}
                >
                  {promo.verdict}
                </span>
                {promo.madeWith && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                    made with {promo.madeWith}
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs text-slate-600">
                <span className="text-slate-400">Why: </span>
                {promo.why ?? <span className="italic text-slate-400">not given</span>}
              </p>

              <p className="mt-1 whitespace-pre-wrap border-t border-slate-100 pt-1 text-xs text-slate-700">
                {promo.content}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
