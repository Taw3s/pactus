import { BottomNav } from "@/components/BottomNav";
import { JudgeGuide } from "@/components/JudgeGuide";
import { requireMember } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { me } = await requireMember();
  return (
    <div className="mx-auto min-h-dvh max-w-[560px] pb-[calc(64px+env(safe-area-inset-bottom)+16px)] desk:ml-60 desk:mr-0 desk:max-w-none desk:pb-12">
      <main className="app-main gutter pt-[calc(16px+env(safe-area-inset-top))] desk:mx-auto desk:max-w-[1160px] desk:px-10 desk:pt-10">{children}</main>
      <BottomNav profileHref={`/historico/${me.user_id}`} />
      <JudgeGuide />
    </div>
  );
}
