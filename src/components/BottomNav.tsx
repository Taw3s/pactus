"use client";

import { CircleCheck, ReceiptText, UserRound, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { GROUP_TAB_KEY } from "./GroupTabs";

interface Item {
  label: string;
  icon: LucideIcon;
  href: string;
  match: string[];
}

const ITEMS: Item[] = [
  { label: "Hoje", icon: CircleCheck, href: "/hoje", match: ["/hoje"] },
  { label: "Grupo", icon: Users, href: "/feed", match: ["/feed", "/ranking", "/checkin"] },
  { label: "Dívidas", icon: ReceiptText, href: "/dividas", match: ["/dividas"] },
  { label: "Perfil", icon: UserRound, href: "/historico", match: ["/historico", "/config"] },
];

/** `profileHref` points straight at the user's own history: no redirect hop when switching tabs. */
export function BottomNav({ profileHref }: { profileHref: string }) {
  const path = usePathname();
  // "Grupo" reopens the sub-tab (Feed or Ranking) used last.
  const [groupHref, setGroupHref] = useState("/feed");
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(GROUP_TAB_KEY);
      if (saved === "/feed" || saved === "/ranking") setGroupHref(saved);
    } catch {}
  }, [path]);

  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-20 border-t border-divider bg-bg pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid h-16 max-w-[560px] grid-cols-4">
        {ITEMS.map((item) => {
          const active = item.match.some((m) => path === m || path.startsWith(`${m}/`));
          const href = item.label === "Grupo" ? groupHref : item.label === "Perfil" ? profileHref : item.href;
          const Icon = item.icon;
          return (
            <li key={item.label} className="flex">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`mx-1 my-1 flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold leading-4 transition-colors duration-150 ${
                  active ? "bg-raised text-accent" : "text-muted hover:text-fg"
                }`}
              >
                <Icon size={22} strokeWidth={2} aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
