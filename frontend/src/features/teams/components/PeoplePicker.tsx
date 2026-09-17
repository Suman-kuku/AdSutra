import { useMemo, useState } from 'react';
import type { PersonAdminDTO } from '@scriptcraft/shared';

interface Props {
  people: PersonAdminDTO[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

function label(person: PersonAdminDTO): string {
  return person.name ?? person.email;
}

/**
 * Searchable multi-select over the people who have access. Selected people show
 * as removable chips, so the current membership is readable without opening the
 * list — which is the thing you check before saving.
 */
export function PeoplePicker({ people, selectedIds, onChange }: Props): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selected = useMemo(
    () => selectedIds.map((id) => people.find((p) => p.id === id)).filter(Boolean),
    [people, selectedIds],
  ) as PersonAdminDTO[];

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return people;
    return people.filter(
      (person) =>
        label(person).toLowerCase().includes(needle) ||
        person.email.toLowerCase().includes(needle),
    );
  }, [people, query]);

  const toggle = (id: string): void => {
    onChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id],
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {selected.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                onClick={() => toggle(person.id)}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-1 pl-2 pr-1.5 text-xs text-slate-700 transition hover:border-slate-300"
              >
                {label(person)}
                <span aria-hidden className="text-slate-400">
                  ✕
                </span>
                <span className="sr-only">Remove {label(person)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder="Select people"
        aria-label="Search people to add"
        className="w-full max-w-sm rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
      />

      {isOpen && (
        <div className="max-h-56 max-w-sm overflow-y-auto rounded-md border border-slate-200 bg-white">
          {matches.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-500">Nobody matches that.</p>
          ) : (
            <ul>
              {matches.map((person) => {
                const checked = selectedIds.includes(person.id);
                return (
                  <li key={person.id}>
                    <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(person.id)}
                        className="h-3.5 w-3.5 rounded border-slate-300"
                      />
                      <span className="text-slate-900">{label(person)}</span>
                      <span className="ml-auto text-xs text-slate-400">{person.email}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
