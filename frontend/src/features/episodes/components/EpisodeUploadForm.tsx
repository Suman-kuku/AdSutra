import { useRef, useState } from 'react';
import { useUploadScript } from '../hooks/useEpisodes';

interface Props {
  showId: string;
  /** Pre-filled with the next free number so the common case needs no typing. */
  suggestedNumber: number;
  onUploaded?: () => void;
}

export function EpisodeUploadForm({
  showId,
  suggestedNumber,
  onUploaded,
}: Props): React.JSX.Element {
  const [episodeNumber, setEpisodeNumber] = useState(String(suggestedNumber));
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const upload = useUploadScript(showId);

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    setLocalError(null);

    const parsedNumber = Number(episodeNumber);
    if (!Number.isInteger(parsedNumber) || parsedNumber < 1) {
      setLocalError('Episode number must be a positive whole number.');
      return;
    }
    if (!file) {
      setLocalError('Choose a script file to upload.');
      return;
    }

    upload.mutate(
      { showId, episodeNumber: parsedNumber, title: title.trim() || null, file },
      {
        onSuccess: () => {
          setTitle('');
          setFile(null);
          setEpisodeNumber(String(parsedNumber + 1));
          if (fileInput.current) fileInput.current.value = '';
          onUploaded?.();
        },
      },
    );
  };

  const message = localError ?? (upload.isError ? upload.error.message : null);

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[7rem_1fr]">
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Episode #</span>
          <input
            type="number"
            min={1}
            value={episodeNumber}
            onChange={(event) => setEpisodeNumber(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Title</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Optional"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-slate-600">Script (PDF, DOCX or TXT)</span>
        <input
          ref={fileInput}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-sm file:text-slate-700"
        />
      </label>

      {message && (
        <p className="rounded-md bg-red-50 p-2.5 text-sm text-red-700" role="alert">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={upload.isPending}
        className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {upload.isPending ? 'Uploading…' : 'Upload script'}
      </button>
    </form>
  );
}
