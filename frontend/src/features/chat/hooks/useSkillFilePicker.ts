import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SkillFileSummaryDTO } from '@scriptcraft/shared';
import { useAllSkillFileVersions } from '../../skill-files';

/** One skill file and every version of it, newest first. */
export interface SkillFileGroup {
  slug: string;
  /** The version shown on the group's own row, and picked when it is chosen. */
  active: SkillFileSummaryDTO;
  versions: SkillFileSummaryDTO[];
}

/**
 * A row as drawn: either a skill file, or one version nested under it. The
 * list is flattened this way so arrow keys can walk exactly what is on screen
 * — stepping into an expanded group's versions and over a collapsed one's.
 */
export type PickerRow =
  | { kind: 'group'; group: SkillFileGroup }
  | { kind: 'version'; group: SkillFileGroup; file: SkillFileSummaryDTO };

/**
 * Groups, not versions, because a file with six revisions would otherwise be
 * the entire dropdown.
 */
const MAX_GROUPS = 6;

function groupBySlug(files: SkillFileSummaryDTO[]): SkillFileGroup[] {
  const bySlug = new Map<string, SkillFileSummaryDTO[]>();
  for (const file of files) {
    const bucket = bySlug.get(file.slug);
    if (bucket) bucket.push(file);
    else bySlug.set(file.slug, [file]);
  }

  return [...bySlug.entries()].map(([slug, versions]) => {
    const sorted = [...versions].sort((a, b) => b.version - a.version);
    // The partial unique index guarantees one active row per slug, but the
    // highest version is a safe answer either way.
    const active = sorted.find((file) => file.isActive) ?? sorted[0];
    return { slug, active: active as SkillFileSummaryDTO, versions: sorted };
  });
}

/**
 * State behind the composer's `@` dropdown.
 *
 * Kept out of `Composer` so the composer only has to forward key presses; the
 * grouping, expansion and highlight all live here, and `SkillFilePicker` just
 * draws `rows`.
 */
export function useSkillFilePicker(query: string | null): {
  rows: PickerRow[];
  highlighted: number;
  isOpen: boolean;
  setHighlighted: (index: number) => void;
  moveHighlight: (delta: number) => void;
  toggleExpanded: (slug: string) => void;
  setExpanded: (slug: string, open: boolean) => void;
  isExpanded: (slug: string) => boolean;
  /** The skill file version at `index`, or null when the row is not pickable. */
  fileAt: (index: number) => SkillFileSummaryDTO | null;
} {
  const { data: files } = useAllSkillFileVersions();
  const [expanded, setExpandedSet] = useState<ReadonlySet<string>>(new Set());
  const [highlighted, setHighlighted] = useState(0);

  const groups = useMemo(() => {
    if (query === null || !files) return [];
    const needle = query.toLowerCase();
    const matched = files.filter(
      (file) =>
        file.slug.toLowerCase().includes(needle) ||
        file.name.toLowerCase().includes(needle) ||
        file.category.toLowerCase().includes(needle),
    );
    return groupBySlug(matched).slice(0, MAX_GROUPS);
  }, [files, query]);

  const rows = useMemo<PickerRow[]>(() => {
    const flat: PickerRow[] = [];
    for (const group of groups) {
      flat.push({ kind: 'group', group });
      if (!expanded.has(group.slug)) continue;
      for (const file of group.versions) flat.push({ kind: 'version', group, file });
    }
    return flat;
  }, [groups, expanded]);

  // A new query rebuilds the list, so the old index would point somewhere
  // arbitrary. Expansion is reset too: groups left open from a previous search
  // would reopen unexpectedly on a different one.
  useEffect(() => {
    setHighlighted(0);
    setExpandedSet(new Set());
  }, [query]);

  // Collapsing a group shortens the list under the cursor.
  useEffect(() => {
    setHighlighted((index) => (index >= rows.length ? Math.max(0, rows.length - 1) : index));
  }, [rows.length]);

  const moveHighlight = useCallback(
    (delta: number) => {
      setHighlighted((index) => {
        if (rows.length === 0) return 0;
        return (index + delta + rows.length) % rows.length;
      });
    },
    [rows.length],
  );

  const setExpanded = useCallback((slug: string, open: boolean) => {
    setExpandedSet((prev) => {
      if (prev.has(slug) === open) return prev;
      const next = new Set(prev);
      if (open) next.add(slug);
      else next.delete(slug);
      return next;
    });
  }, []);

  const toggleExpanded = useCallback((slug: string) => {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const isExpanded = useCallback((slug: string) => expanded.has(slug), [expanded]);

  const fileAt = useCallback(
    (index: number): SkillFileSummaryDTO | null => {
      const row = rows[index];
      if (!row) return null;
      return row.kind === 'group' ? row.group.active : row.file;
    },
    [rows],
  );

  return {
    rows,
    highlighted,
    isOpen: rows.length > 0,
    setHighlighted,
    moveHighlight,
    toggleExpanded,
    setExpanded,
    isExpanded,
    fileAt,
  };
}
