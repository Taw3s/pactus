import { BackButton } from "./BackButton";

interface Props {
  title: string;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  /** Where "Voltar" goes when there is no in-app history to return to. */
  backFallback?: string;
}

export function PageHeader({ title, subtitle, right, backFallback }: Props) {
  return (
    <header className="mb-6">
      {backFallback && <BackButton fallback={backFallback} />}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="pixel text-[32px] font-bold uppercase leading-9">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </header>
  );
}
