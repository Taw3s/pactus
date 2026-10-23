import { BottomNav } from "@/components/BottomNav";
import { requireMember } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireMember();
  return (
    <div className="mx-auto min-h-dvh max-w-md pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <main className="px-4 pt-[calc(1rem+env(safe-area-inset-top))]">{children}</main>
      <BottomNav />
    </div>
  );
}
