import { useRef, useState } from 'react';
import type { SkillFileDetailDTO } from '@scriptcraft/shared';
import { useUploadSkillFile } from '../hooks/useSkillFiles';

const EXAMPLE = `---
name: Emotional Promo
category: emotional
slug: emotional-promo
description: Focuses on emotional storytelling and character-driven narratives.
language: en
tags: [emotional, character]
default_duration_sec: 30
temperature: 0.8
changelog: First version
---

You are writing a 30-second emotional radio promo...`;

/** Uploading the same slug again creates a new version — it never overwrites. */
export function SkillFileUpload(): React.JSX.Element {
  const [uploaded, setUploaded] = useState<SkillFileDetailDTO[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showFormat, setShowFormat] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const upload = useUploadSkillFile();

  const handleFiles = (files: FileList | null): void => {
    setLocalError(null);
    if (!files || files.length === 0) return;

    // Uploaded one at a time: each insert fires the versioning trigger, and a
    // parallel burst of the same slug would race for version numbers.
    void [...files]
      .reduce<Promise<void>>(
        (chain, file) =>
          chain.then(async () => {
            const result = await upload.mutateAsync(file);
            setUploaded((prev) => [...prev, result]);
          }),
        Promise.resolve(),
      )
      .catch((err: unknown) => {
        setLocalError(err instanceof Error ? err.message : 'Upload failed.');
      })
      .finally(() => {
        if (fileInput.current) fileInput.current.value = '';
      });
  };

  return (
    <section className="rounded-xl border border-dashed border-slate-300 bg-white p-5">
      <div className="flex flex-wrap items-center gap-4">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600"
          aria-hidden="true"
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 18a4 4 0 01-.6-7.96 5.5 5.5 0 0110.7-1.8A4.5 4.5 0 1117.5 18H16M12 12v8m0-8l-3 3m3-3l3 3"
            />
          </svg>
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="font-medium text-slate-900">Upload skill files</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Markdown with YAML frontmatter. Re-uploading the same slug adds a new version.
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={upload.isPending}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
          >
            {upload.isPending ? 'Uploading…' : 'Choose files'}
          </button>
          <button
            type="button"
            onClick={() => setShowFormat((open) => !open)}
            className="text-sm text-indigo-600 transition hover:text-indigo-800"
          >
            {showFormat ? 'Hide format' : 'Show format'}
          </button>
        </div>
      </div>

      {/* Hidden: the styled button above is the affordance, so the native
          control only has to exist, not be seen. */}
      <input
        ref={fileInput}
        type="file"
        accept=".md,text/markdown"
        multiple
        disabled={upload.isPending}
        onChange={(event) => handleFiles(event.target.files)}
        className="hidden"
      />

      {showFormat && (
        <pre className="mt-4 overflow-x-auto rounded-md bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-700">
          {EXAMPLE}
        </pre>
      )}

      {(localError ?? upload.isError) && (
        <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {localError ?? upload.error?.message}
        </p>
      )}

      {uploaded.length > 0 && (
        <ul className="mt-3 space-y-1">
          {uploaded.map((file) => (
            <li
              key={file.id}
              className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
            >
              {file.name} — <span className="font-mono text-xs">{file.slug}</span> v{file.version}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
