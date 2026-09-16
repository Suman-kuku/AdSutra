import { useEffect, useMemo, useState } from 'react';
import type { SavedPromoDTO } from '@scriptcraft/shared';

interface Props {
  /** Content of the most recent promo-bearing message, if any exists yet. */
  latestPromo: string | null;
  /** Every saved promo version in this thread, oldest first. */
  savedPromos: SavedPromoDTO[];
  /** Id of the promo the last Save produced, so the panel can jump to its tab. */
  justSavedPromoId: string | null;
  streamingText: string;
  isGenerating: boolean;
  /** Whether there's an unsaved draft worth committing to `promos`. */
  canSave: boolean;
  isSaving: boolean;
  /** Version number from the most recent successful save, for the confirmation note. */
  savedVersion: number | null;
  onSave: () => void;
  /** Permanently deletes one saved version. The caller confirms first. */
  onDeleteVersion: (promoId: string) => void;
  /** The version currently being deleted, so its chip can show progress. */
  deletingVersionId: string | null;
}

/** One promo and its version history — what a single saved tab represents. */
interface Lineage {
  rootId: string;
  label: string;
  versions: SavedPromoDTO[];
}

const DRAFT_TAB = 'draft';

/**
 * Groups the flat version rows into promos, ordered by when each promo was
 * first saved, with its versions ascending.
 *
 * Labels are numbered per skill file: several promos in a thread often come
 * from the same one, and the version number can't separate them (a promo
 * refined three times is "v3", not the third promo).
 */
function buildLineages(promos: SavedPromoDTO[]): Lineage[] {
  const byRoot = new Map<string, SavedPromoDTO[]>();
  for (const promo of promos) {
    const rootId = promo.rootPromoId;
    const bucket = byRoot.get(rootId);
    if (bucket) bucket.push(promo);
    else byRoot.set(rootId, [promo]);
  }

  const seen = new Map<string, number>();
  return [...byRoot.entries()].map(([rootId, versions]) => {
    const sorted = [...versions].sort((a, b) => a.version - b.version);
    const base = sorted[0]?.skillFileSlug ?? 'Promo';
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return { rootId, label: `${base} ${n}`, versions: sorted };
  });
}

export function PromoPanel({
  latestPromo,
  savedPromos,
  justSavedPromoId,
  streamingText,
  isGenerating,
  canSave,
  isSaving,
  savedVersion,
  onSave,
  onDeleteVersion,
  deletingVersionId,
}: Props): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const [selectedRoot, setSelectedRoot] = useState<string>(DRAFT_TAB);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const lineages = useMemo(() => buildLineages(savedPromos), [savedPromos]);

  // Jump to a freshly saved promo, but only once the refetched list actually
  // carries it — selecting an id that isn't there yet would flash the draft.
  useEffect(() => {
    if (!justSavedPromoId) return;
    const target = savedPromos.find((p) => p.id === justSavedPromoId);
    if (!target) return;
    setSelectedRoot(target.rootPromoId);
    setSelectedVersionId(target.id);
  }, [justSavedPromoId, savedPromos]);

  // A tab can vanish when the thread is archived or switched.
  const lineage = lineages.find((l) => l.rootId === selectedRoot) ?? null;
  const onDraft = selectedRoot === DRAFT_TAB || lineage === null;

  const shownVersion = lineage
    ? (lineage.versions.find((v) => v.id === selectedVersionId) ??
      lineage.versions[lineage.versions.length - 1] ??
      null)
    : null;

  const draftText = isGenerating && streamingText.length > 0 ? streamingText : latestPromo;
  const displayed = onDraft ? draftText : (shownVersion?.content ?? null);

  const selectLineage = (target: Lineage): void => {
    setSelectedRoot(target.rootId);
    setSelectedVersionId(target.versions[target.versions.length - 1]?.id ?? null);
  };

  const copy = (): void => {
    if (!displayed) return;
    void navigator.clipboard.writeText(displayed).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const tabClass = (active: boolean): string =>
    `shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition ${
      active
        ? 'bg-slate-900 text-white'
        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
    }`;

  const versionClass = (active: boolean): string =>
    `shrink-0 rounded px-2 py-0.5 text-xs font-medium transition ${
      active ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'
    }`;

  return (
    <section className="flex min-h-[32rem] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white lg:min-h-0 lg:flex-1">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
        <h2 className="text-sm font-semibold">Promo</h2>
        <div className="flex items-center gap-2">
          {savedVersion !== null && (onDraft || shownVersion?.id === justSavedPromoId) && (
            <span className="text-xs text-emerald-600">Saved as v{savedVersion}</span>
          )}
          <button
            type="button"
            onClick={copy}
            disabled={!displayed}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
            </svg>
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!onDraft || !canSave || isSaving}
            className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-slate-800 disabled:opacity-40"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      {lineages.length > 0 && (
        <div className="border-b border-slate-200 px-4 py-2">
          <div className="flex gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedRoot(DRAFT_TAB)}
              className={tabClass(onDraft)}
            >
              Draft
            </button>
            {lineages.map((item) => (
              <button
                key={item.rootId}
                type="button"
                onClick={() => selectLineage(item)}
                className={tabClass(!onDraft && item.rootId === selectedRoot)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {lineage && shownVersion && (
            <div className="mt-1.5 flex items-center gap-1 overflow-x-auto">
              <span className="shrink-0 pr-1 text-xs text-slate-400">Versions</span>
              {lineage.versions.map((version) => {
                const isDeleting = deletingVersionId === version.id;
                return (
                  // `group` so the delete affordance only appears on hover or
                  // keyboard focus — a permanent × on every chip invites the
                  // misclick this action cannot undo.
                  <span key={version.id} className="group flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => setSelectedVersionId(version.id)}
                      className={versionClass(version.id === shownVersion.id)}
                    >
                      v{version.version}
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => onDeleteVersion(version.id)}
                      title={`Delete v${version.version} permanently`}
                      aria-label={`Delete v${version.version} permanently`}
                      className="ml-0.5 rounded px-1 text-xs leading-none text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 focus-visible:outline-none group-hover:opacity-100 disabled:opacity-100"
                    >
                      {isDeleting ? '…' : '×'}
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {displayed ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">
            {displayed}
          </p>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="max-w-xs text-center text-sm text-slate-400">
              Your generated promo will appear here.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
