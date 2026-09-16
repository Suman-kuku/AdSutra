import { useMemo, useState } from 'react';
import type { SkillFileSummaryDTO } from '@scriptcraft/shared';
import { SkillFileList, SkillFileUpload, useSkillFiles } from '../features/skill-files';

type SortKey = 'name' | 'updated' | 'uses' | 'versions';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'updated', label: 'Last updated' },
  { value: 'uses', label: 'Total uses' },
  { value: 'versions', label: 'Versions' },
];

/** Search and sort are client-side: the library is small and it keeps typing instant. */
function applyFilters(
  files: SkillFileSummaryDTO[],
  search: string,
  sort: SortKey,
): SkillFileSummaryDTO[] {
  const query = search.trim().toLowerCase();
  const matched = query
    ? files.filter(
        (file) =>
          file.slug.toLowerCase().includes(query) ||
          file.name.toLowerCase().includes(query) ||
          file.category.toLowerCase().includes(query) ||
          (file.description?.toLowerCase().includes(query) ?? false) ||
          file.tags.some((tag) => tag.toLowerCase().includes(query)),
      )
    : files;

  return [...matched].sort((a, b) => {
    switch (sort) {
      case 'updated':
        return b.createdAt.localeCompare(a.createdAt);
      case 'uses':
        return b.totalUses - a.totalUses;
      case 'versions':
        return b.versionCount - a.versionCount;
      default:
        return a.slug.localeCompare(b.slug);
    }
  });
}

export function SkillFilesPage(): React.JSX.Element {
  const { data: files, isLoading, isError, error } = useSkillFiles();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('name');

  const visible = useMemo(
    () => (files ? applyFilters(files, search, sort) : []),
    [files, search, sort],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Skill Files</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Shared prompt library — anyone can upload, everyone can use them.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search skill files…"
              aria-label="Search skill files"
              className="w-64 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-400"
            />
          </div>

          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <span className="text-slate-500">Sort by:</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="bg-transparent font-medium text-slate-900 outline-none"
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <SkillFileUpload />

      {isLoading && <p className="text-sm text-slate-500">Loading skill files…</p>}

      {isError && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error.message}
        </p>
      )}

      {files && (
        <SkillFileList
          files={visible}
          {...(search.trim()
            ? { emptyHint: `Nothing matches “${search.trim()}”.` }
            : {})}
        />
      )}
    </div>
  );
}
