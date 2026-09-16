import { useState } from 'react';
import type { AttachedPromo, PromoVerdict, SkillFilePromoDTO } from '@scriptcraft/shared';
import { MAX_ATTACHED_PROMOS } from '@scriptcraft/shared';
import { AutoTextarea } from '../../../components/ui/AutoTextarea';
import { useSkillFilePromos } from '../hooks/useSkillChat';

interface Props {
  slug: string;
  onAttach: (promos: AttachedPromo[]) => void;
  onClose: () => void;
}

const VERDICTS: { value: PromoVerdict; label: string; style: string }[] = [
  { value: 'worked', label: 'Worked', style: 'bg-emerald-600 text-white' },
  { value: 'did_not_work', label: "Didn't work", style: 'bg-red-600 text-white' },
  { value: 'unclear', label: 'Unclear', style: 'bg-slate-600 text-white' },
];

interface Marked {
  verdict: PromoVerdict;
  why: string;
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
export function AttachPromosModal({ slug, onAttach, onClose }: Props): React.JSX.Element {
  const promos = useSkillFilePromos(slug, true);
  const [marked, setMarked] = useState<Map<string, Marked>>(new Map());
  const [limitHit, setLimitHit] = useState(false);

  const toggle = (promo: SkillFilePromoDTO): void => {
    setMarked((prev) => {
      const next = new Map(prev);
      if (next.has(promo.id)) {
        next.delete(promo.id);
        setLimitHit(false);
        return next;
      }
      if (next.size >= MAX_ATTACHED_PROMOS) {
        setLimitHit(true);
        return prev;
      }
      next.set(promo.id, { verdict: 'worked', why: '' });
      return next;
    });
  };

  const update = (promoId: string, patch: Partial<Marked>): void => {
    setMarked((prev) => {
      const current = prev.get(promoId);
      if (!current) return prev;
      const next = new Map(prev);
      next.set(promoId, { ...current, ...patch });
      return next;
    });
  };

  const handleAttach = (): void => {
    const rows = promos.data ?? [];
    const attached: AttachedPromo[] = [];
    for (const promo of rows) {
      const entry = marked.get(promo.id);
      if (!entry) continue;
      attached.push({
        promoId: promo.id,
        version: promo.version,
        skillFileVersion: promo.skillFileVersion,
        content: promo.content,
        verdict: entry.verdict,
        ...(entry.why.trim() ? { why: entry.why.trim() } : {}),
      });
    }
    onAttach(attached);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <header className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold">Attach promos made from this skill file</h2>
          <p className="mt-1 text-xs text-slate-500">
            Tick the ones you want to discuss and say how each performed. Up to{' '}
            {MAX_ATTACHED_PROMOS} per turn.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Batches stay in the conversation — you don’t need to re-attach these next time.
          </p>
        </header>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {promos.isLoading && <p className="text-sm text-slate-500">Loading promos…</p>}

          {promos.isError && (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
              {promos.error.message}
            </p>
          )}

          {promos.data?.length === 0 && (
            <p className="p-4 text-center text-sm text-slate-500">
              No promos have been saved from this skill file yet.
            </p>
          )}

          {promos.data?.map((promo) => {
            const entry = marked.get(promo.id);
            const episode =
              promo.episodeNumber !== null
                ? `Ep ${promo.episodeNumber}${promo.episodeTitle ? ` · ${promo.episodeTitle}` : ''}`
                : 'Episode unknown';

            return (
              <div
                key={promo.id}
                className={`rounded-lg border p-3 transition ${
                  entry ? 'border-indigo-300 bg-indigo-50/40' : 'border-slate-200'
                }`}
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={Boolean(entry)}
                    onChange={() => toggle(promo)}
                    className="mt-1 h-4 w-4 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono">v{promo.version}</span>
                      <span>·</span>
                      <span className="truncate">{episode}</span>
                      {promo.skillFileVersion !== null && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">
                          made with v{promo.skillFileVersion}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block line-clamp-3 whitespace-pre-wrap text-sm text-slate-700">
                      {promo.content}
                    </span>
                  </span>
                </label>

                {entry && (
                  <div className="mt-3 space-y-2 pl-7">
                    <div className="flex flex-wrap gap-1.5">
                      {VERDICTS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => update(promo.id, { verdict: option.value })}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                            entry.verdict === option.value
                              ? option.style
                              : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <AutoTextarea
                      maxRows={4}
                      value={entry.why}
                      onChange={(e) => update(promo.id, { why: e.target.value })}
                      placeholder="Why? One line is enough, but write as much as you need."
                      className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm leading-relaxed outline-none focus:border-indigo-400"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
          <p className="text-xs text-slate-500">
            {limitHit
              ? `Send this batch first, then attach more — ${MAX_ATTACHED_PROMOS} is the limit per turn.`
              : `${marked.size} of ${MAX_ATTACHED_PROMOS} selected`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAttach}
              disabled={marked.size === 0}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-40"
            >
              Attach {marked.size > 0 ? marked.size : ''}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
