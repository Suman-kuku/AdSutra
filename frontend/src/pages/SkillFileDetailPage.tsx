import { Link, useParams } from 'react-router-dom';
import { useSkillFile, useSkillFileVersions } from '../features/skill-files';

export function SkillFileDetailPage(): React.JSX.Element {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data: file, isLoading, isError, error } = useSkillFile(slug);
  const versions = useSkillFileVersions(slug);

  return (
    <div className="space-y-6">
      <Link to="/skill-files" className="inline-block text-sm text-slate-500 hover:text-slate-900">
        ← Skill Files
      </Link>

      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}

      {isError && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error.message}
        </p>
      )}

      {file && (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{file.name}</h1>
              <p className="mt-0.5 font-mono text-xs text-slate-500">
                {file.slug} · v{file.version} · {file.category}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                active
              </span>
              <Link
                to={`/skill-files/${file.slug}/chat`}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
              >
                Open chat &amp; edit
              </Link>
            </div>
          </div>

          {file.description && <p className="text-sm text-slate-600">{file.description}</p>}

          <dl className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-5 text-sm shadow-sm sm:grid-cols-4">
            <Detail label="Duration" value={file.defaultDurationSec ? `${file.defaultDurationSec}s` : '—'} />
            <Detail label="Model" value={file.model ?? '—'} />
            <Detail label="Temperature" value={file.temperature?.toString() ?? '—'} />
            <Detail label="Language" value={file.language ?? '—'} />
          </dl>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Prompt body
            </h2>
            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-slate-700">
              {file.promptBody}
            </pre>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold">Version history</h2>
            {versions.data && (
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                {versions.data.map((version) => (
                  <li key={version.id} className="flex items-center gap-3 p-3 text-sm">
                    <span className="w-10 shrink-0 font-mono text-xs text-slate-400">
                      v{version.version}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-slate-600">
                      {version.changelog ?? '—'}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {new Date(version.createdAt).toLocaleDateString()}
                    </span>
                    {version.isActive && (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        active
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 truncate text-slate-900">{value}</dd>
    </div>
  );
}
