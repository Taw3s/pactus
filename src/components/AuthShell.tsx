export function AuthShell({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-black tracking-tight">
          Pacto<span className="text-emerald-400">.</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>
      </div>
      {children}
    </main>
  );
}

export function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-2 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-zinc-300">{children}</p>
    </div>
  );
}
