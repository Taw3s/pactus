import { BottomNav } from "@/components/BottomNav";
import { requireMember } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { me } = await requireMember();
  return (
    <div className="mx-auto min-h-dvh max-w-[560px] pb-[calc(64px+env(safe-area-inset-bottom)+16px)]">
      <main className="gutter pt-[calc(16px+env(safe-area-inset-top))]">{children}</main>
      <BottomNav profileHref={`/historico/${me.user_id}`} />
    </div>
  );
}
