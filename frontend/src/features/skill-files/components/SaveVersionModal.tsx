import { useState } from 'react';
import { AutoTextarea } from '../../../components/ui/AutoTextarea';

interface Props {
  /** The version this Save will create, for the confirmation line. */
  nextVersion: number;
  isSaving: boolean;
  error: string | null;
  onSave: (changelog: string) => void;
  onClose: () => void;
}

/**
 * Save asks for a changelog line before it publishes.
 *
 * The mockup had no such field. Without it, "why does v3 say this?" is
 * unanswerable six months later — the row is all that survives, and the chat
 * that produced it may have been cleared.
 */
export function SaveVersionModal({
  nextVersion,
  isSaving,
  error,
  onSave,
  onClose,
}: Props): React.JSX.Element {
  const [changelog, setChangelog] = useState('');
  const trimmed = changelog.trim();

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (!trimmed || isSaving) return;
    onSave(trimmed);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl"
      >
        <div className="px-5 py-4">
          <h2 className="text-sm font-semibold">Save as v{nextVersion}</h2>
          <p className="mt-1 text-xs text-slate-500">
            This publishes a new version. The current one is kept and can be restored later.
          </p>

          <label htmlFor="changelog" className="mt-4 block text-xs font-medium text-slate-600">
            What changed?
          </label>
          <AutoTextarea
            id="changelog"
            maxRows={4}
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
            // A textarea would otherwise swallow Enter, and this field used to
            // submit on it — keep that, and leave Shift+Enter for a newline.
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSubmit(event);
              }
            }}
            placeholder="e.g. Added an opening-question rule, dropped the tagline rule"
            maxLength={2000}
            autoFocus
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm leading-relaxed outline-none focus:border-indigo-400"
          />

          {error && (
            <p className="mt-3 rounded-md bg-red-50 p-2.5 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!trimmed || isSaving}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-40"
          >
            {isSaving ? 'Saving…' : `Save v${nextVersion}`}
          </button>
        </footer>
      </form>
    </div>
  );
}
