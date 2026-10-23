export function AuthShell({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
  return (
    <main className="gutter mx-auto flex min-h-dvh max-w-[400px] flex-col pb-10 pt-[calc(48px+env(safe-area-inset-top))]">
      <div className="mb-8">
        <p className="text-[40px] font-extrabold leading-[44px] tracking-tight">
          Pacto<span className="text-accent">.</span>
        </p>
        <p className="mt-1 text-base text-muted">Seu compromisso com o grupo</p>
        <h1 className="mt-6 text-lg font-semibold leading-6">{subtitle}</h1>
      </div>
      {children}
    </main>
  );
}

export function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-2" role="status">
      <h2 className="text-lg font-semibold leading-6">{title}</h2>
      <p className="text-muted">{children}</p>
    </div>
  );
}
