import { useState } from 'react';
import { createShowSchema, type CreateShowInput } from '@scriptcraft/shared';
import { useCreateShow } from '../hooks/useShows';

const EMPTY: CreateShowInput = { title: '', description: '', genre: '', language: '' };

export function CreateShowForm({ onCreated }: { onCreated?: () => void }): React.JSX.Element {
  const [values, setValues] = useState<CreateShowInput>(EMPTY);
  const [validationError, setValidationError] = useState<string | null>(null);
  const createShow = useCreateShow();

  const set = (key: keyof CreateShowInput) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    setValidationError(null);

    // Same schema the backend validates with — no duplicated rules.
    const parsed = createShowSchema.safeParse(values);
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Please check the form.');
      return;
    }

    createShow.mutate(parsed.data, {
      onSuccess: () => {
        setValues(EMPTY);
        onCreated?.();
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field label="Title" required value={values.title} onChange={set('title')} />
      <Field label="Description" value={values.description ?? ''} onChange={set('description')} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Genre" value={values.genre ?? ''} onChange={set('genre')} />
        <Field label="Language" value={values.language ?? ''} onChange={set('language')} />
      </div>

      {(validationError ?? createShow.isError) && (
        <p className="rounded-md bg-red-50 p-2.5 text-sm text-red-700" role="alert">
          {validationError ?? createShow.error?.message}
        </p>
      )}

      <button
        type="submit"
        disabled={createShow.isPending}
        className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {createShow.isPending ? 'Creating…' : 'Create show'}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}): React.JSX.Element {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        type="text"
        value={value}
        onChange={onChange}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
      />
    </label>
  );
}
