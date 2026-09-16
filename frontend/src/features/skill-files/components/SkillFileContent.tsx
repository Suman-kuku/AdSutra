import type { SkillFileVersionDTO } from '@scriptcraft/shared';

interface Props {
  content: string;
  onChange: (content: string) => void;
  /** True while a chat turn is writing into this panel. */
  isStreaming: boolean;
  /** Every version of this file, newest first. */
  versions: SkillFileVersionDTO[];
  /** The version currently loaded into the editor. */
  selectedVersion: number;
  onSelectVersion: (version: number) => void;
  /** Whether the text differs from the loaded version. */
  isDirty: boolean;
  /** Set when the text came from a chat turn rather than being typed. */
  fromChat: boolean;
  /** The version a new-version save would create. */
  nextVersion: number;
  isSavingInPlace: boolean;
  onSaveInPlace: () => void;
  onSaveAsNewVersion: () => void;
  onRevert: () => void;
  /** Confirmation or failure line for the last save. */
  savedNote: string | null;
  saveError: string | null;
}

/**
 * Past this the file has usually accumulated one narrow rule per past failure
 * and output quality drops. CLAUDE.md section 12 — the agent is told the same
 * number, so the two warnings agree.
 */
const BLOAT_WORD_LIMIT = 800;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * The `.md`, editable by hand, and where a chat rewrite lands.
 *
 * Two save paths, because they mean different things:
 *
 * - **Save** overwrites the version currently loaded. No new row. Use it for a
 *   typo or a wording fix, where a version of its own would be noise.
 * - **Save as new version** appends a row and retires the previous one, and is
 *   what any change worth comparing should use — `promos.skill_file_version`
 *   snapshots which version produced each promo, so a version edited in place
 *   no longer matches the promos attributed to it.
 *
 * Nothing here touches the database until one of those is clicked. Streaming
 * into this panel changes only what is on screen.
 */
export function SkillFileContent({
  content,
  onChange,
  isStreaming,
  versions,
  selectedVersion,
  onSelectVersion,
  isDirty,
  fromChat,
  nextVersion,
  isSavingInPlace,
  onSaveInPlace,
  onSaveAsNewVersion,
  onRevert,
  savedNote,
  saveError,
}: Props): React.JSX.Element {
  const words = wordCount(content);
  const isBloated = words > BLOAT_WORD_LIMIT;
  const loaded = versions.find((version) => version.version === selectedVersion) ?? null;
  const isRetired = loaded !== null && !loaded.isActive;

  return (
    <section className="flex min-h-[32rem] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white lg:min-h-0 lg:w-[45%]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-sm font-semibold">Skill File Content</h2>

          <select
            value={selectedVersion}
            disabled={isStreaming}
            onChange={(event) => onSelectVersion(Number(event.target.value))}
            aria-label="Which version to edit"
            className="rounded-md border border-slate-200 px-1.5 py-0.5 font-mono text-xs text-slate-700 outline-none disabled:opacity-40"
          >
            {versions.map((version) => (
              <option key={version.id} value={version.version}>
                v{version.version}
                {version.isActive ? ' · latest' : ''}
              </option>
            ))}
          </select>

          {isDirty && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              {fromChat ? 'Proposed' : 'Edited'} — not saved
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isDirty && (
            <button
              type="button"
              onClick={onRevert}
              disabled={isStreaming}
              className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Revert
            </button>
          )}
          <button
            type="button"
            onClick={onSaveInPlace}
            disabled={!isDirty || isStreaming || isSavingInPlace}
            title={`Overwrites v${selectedVersion}. No new version is created.`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          >
            {isSavingInPlace ? 'Saving…' : `Save v${selectedVersion}`}
          </button>
          <button
            type="button"
            onClick={onSaveAsNewVersion}
            disabled={!isDirty || isStreaming}
            title={`Appends v${nextVersion} and keeps v${selectedVersion} on the record.`}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800 disabled:opacity-40"
          >
            Save as v{nextVersion}
          </button>
        </div>
      </header>

      {isRetired && (
        <p className="border-b border-amber-100 bg-amber-50 px-4 py-1.5 text-xs text-amber-800">
          v{selectedVersion} is a retired version. Saving it in place will not change which version
          the chat uses by default.
        </p>
      )}

      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        readOnly={isStreaming}
        spellCheck={false}
        className="flex-1 resize-none bg-slate-50/50 p-4 font-mono text-xs leading-relaxed text-slate-800 outline-none read-only:text-slate-500"
        aria-label="Skill file markdown"
      />

      {saveError && (
        <p className="mx-3 mb-2 rounded-md bg-red-50 p-2.5 text-sm text-red-700" role="alert">
          {saveError}
        </p>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-2 text-xs">
        <span className={isBloated ? 'font-medium text-amber-700' : 'text-slate-400'}>
          {words} words
          {isBloated && ` — over ${BLOAT_WORD_LIMIT}. Cut something before adding more.`}
        </span>
        {savedNote && <span className="font-medium text-emerald-700">{savedNote}</span>}
        {isStreaming && <span className="text-slate-400">Writing…</span>}
      </footer>
    </section>
  );
}
