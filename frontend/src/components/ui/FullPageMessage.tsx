export function FullPageMessage({ text }: { text: string }): React.JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-500">{text}</p>
    </main>
  );
}
