import type { SkillFileSummaryDTO } from '@scriptcraft/shared';
import { SkillFileRow } from './SkillFileRow';

/**
 * The library, one row per slug with its versions folded inside.
 *
 * Flat rather than grouped by category: the per-category rule in CLAUDE.md
 * section 9 is about *ranking* in the chat picker, where herding matters. This
 * page is a browsable list, so the category rides along as a chip instead.
 */
export function SkillFileList({
  files,
  emptyHint,
}: {
  files: SkillFileSummaryDTO[];
  /** Shown when a search matched nothing, as opposed to an empty library. */
  emptyHint?: string;
}): React.JSX.Element {
  if (files.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        {emptyHint ?? 'No skill files yet. Upload one above.'}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {files.map((file) => (
        <SkillFileRow key={file.id} file={file} />
      ))}
    </ul>
  );
}
