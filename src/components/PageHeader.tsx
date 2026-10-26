import { BackButton } from "./BackButton";
import { GuideButton } from "./JudgeGuide";

interface Props {
  title: string;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  /** Where "Voltar" goes when there is no in-app history to return to. */
  backFallback?: string;
}

/** Title row with the judge's guide on the right (phones); with "Voltar", the guide shares its row. */
export function PageHeader({ title, subtitle, right, backFallback }: Props) {
  return (
    <header className="mb-6">
      {backFallback && <BackBar fallback={backFallback} />}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="pixel break-words text-[32px] font-bold uppercase leading-9">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {(right || !backFallback) && (
          <div className="flex shrink-0 items-center gap-2">
            {right}
            {!backFallback && <GuideButton place="header" />}
          </div>
        )}
      </div>
    </header>
  );
}

/** "Voltar" and the guide on one strip, for pages without a title row of their own. */
export function BackBar({ fallback }: { fallback: string }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <BackButton fallback={fallback} />
      <GuideButton place="header" />
    </div>
  );
}
