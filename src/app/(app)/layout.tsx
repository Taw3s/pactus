import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { JudgeGuide } from "@/components/JudgeGuide";
import { requireMember } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { me } = await requireMember();
  return (
    <div className="mx-auto min-h-dvh max-w-[560px] pb-[calc(64px+env(safe-area-inset-bottom)+24px)] desk:ml-60 desk:mr-0 desk:max-w-none desk:pb-12">
      <main className="app-main gutter pt-[calc(16px+env(safe-area-inset-top))] desk:mx-auto desk:max-w-[1160px] desk:px-6 desk:pt-10 min-[80rem]:px-8">
        {/* Beta notice from the handoff snapshot; the form is the server-side one (no e-mail address anywhere). */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-sm border-2 border-accent bg-surface p-3 text-sm" role="note" data-testid="beta-notice">
          <p>
            <span className="pixel mr-2 text-xs uppercase text-accent">Beta</span> Estamos testando e melhorando o Pacto.
          </p>
          <Link href="/feedback" className="min-h-9 font-semibold text-accent underline underline-offset-2">
            Enviar feedback
          </Link>
        </div>
        {children}
      </main>
      <BottomNav profileHref={`/historico/${me.user_id}`} />
      {/* The guide's dialog; it opens from the header (phones) or the side bar (desktop). */}
      <JudgeGuide />
    </div>
  );
}
