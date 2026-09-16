interface Props {
  disabled: boolean;
  onPick: (instruction: string) => void;
}

/** Canned EDIT instructions — each sends with `forcedIntent: 'EDIT'`, skipping the classifier. */
const CHIPS = ['Make it shorter', 'Make it punchier', 'Focus on the mystery', 'Add more action'];

export function RefineChips({ disabled, onPick }: Props): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-1.5 px-3 pt-2">
      {CHIPS.map((chip) => (
        <button
          key={chip}
          type="button"
          disabled={disabled}
          onClick={() => onPick(chip)}
          className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
