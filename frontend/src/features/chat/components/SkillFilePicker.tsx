import type { SkillFileSummaryDTO } from '@scriptcraft/shared';
import type { PickerRow } from '../hooks/useSkillFilePicker';

interface Props {
  rows: PickerRow[];
  highlighted: number;
  isExpanded: (slug: string) => boolean;
  onHighlight: (index: number) => void;
  onToggleExpanded: (slug: string) => void;
  onPick: (file: SkillFileSummaryDTO) => void;
}

/**
 * The `@` dropdown, drawn from the flattened rows `useSkillFilePicker` builds.
 * Purely presentational — it holds no state of its own, so the composer's key
 * handling and the mouse both drive the same highlight.
 *
 * Versions are grouped under their skill file rather than listed flat: three
 * revisions of one file otherwise look like three unrelated files, which is
 * exactly the confusion the grouping exists to remove.
 */
export function SkillFilePicker({
  rows,
  highlighted,
  isExpanded,
  onHighlight,
  onToggleExpanded,
  onPick,
}: Props): React.JSX.Element {
  return (
    <ul className="absolute bottom-full left-3 right-3 z-10 mb-2 max-h-80 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
      {rows.map((row, index) => {
        const active = index === highlighted;

        if (row.kind === 'group') {
          const { group } = row;
          const many = group.versions.length > 1;
          const open = isExpanded(group.slug);

          return (
            <li key={`group:${group.slug}`} className={many && open ? 'bg-slate-50/60' : ''}>
              <div
                className={`flex items-start gap-1 px-1.5 ${active ? 'bg-slate-100' : ''}`}
                onMouseEnter={() => onHighlight(index)}
              >
                {many ? (
                  <button
                    type="button"
                    // Mouse down inside the dropdown would blur the textarea and
                    // close the whole thing before the click lands.
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onToggleExpanded(group.slug);
                    }}
                    aria-label={open ? `Hide versions of ${group.slug}` : `Show versions of ${group.slug}`}
                    aria-expanded={open}
                    className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                  >
                    <svg
                      className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                ) : (
                  <span className="w-6 shrink-0" aria-hidden="true" />
                )}

                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onPick(group.active);
                  }}
                  className="flex min-w-0 flex-1 items-start gap-3 py-1.5 pr-2 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-slate-900">
                        {group.slug}
                      </span>
                      <VersionBadge version={group.active.version} />
                      {group.active.isActive && <LatestBadge />}
                    </span>
                    {group.active.description && (
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {group.active.description}
                      </span>
                    )}
                  </span>
                  <CategoryChip category={group.active.category} />
                </button>
              </div>
            </li>
          );
        }

        const { file, group } = row;
        const isLast = file.version === group.versions[group.versions.length - 1]?.version;

        return (
          <li key={file.id} className="bg-slate-50/60">
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                onPick(file);
              }}
              onMouseEnter={() => onHighlight(index)}
              className={`flex w-full items-start gap-2 py-1.5 pl-3 pr-2 text-left ${
                active ? 'bg-slate-100' : ''
              }`}
            >
              {/* Timeline rail, so a nested row reads as a version of the file
                  above it rather than as a file in its own right. */}
              <span className="relative flex w-5 shrink-0 justify-center self-stretch" aria-hidden="true">
                <span
                  className={`z-10 mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
                    file.isActive
                      ? 'bg-indigo-600 ring-2 ring-indigo-200'
                      : 'border border-slate-300 bg-white'
                  }`}
                />
                {!isLast && <span className="absolute top-4 h-full w-px bg-slate-200" />}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-slate-800">{file.slug}</span>
                  <VersionBadge version={file.version} />
                  {file.isActive && <LatestBadge />}
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {file.changelog ?? file.description ?? 'No changelog'}
                </span>
              </span>
              <CategoryChip category={file.category} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function VersionBadge({ version }: { version: number }): React.JSX.Element {
  return (
    <span className="shrink-0 rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[11px] text-indigo-700">
      v{version}
    </span>
  );
}

function LatestBadge(): React.JSX.Element {
  return (
    <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
      Latest
    </span>
  );
}

function CategoryChip({ category }: { category: string }): React.JSX.Element {
  return (
    <span className="mt-0.5 shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-500">
      {category}
    </span>
  );
}
