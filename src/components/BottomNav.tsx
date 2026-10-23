"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/hoje", label: "Hoje", icon: "✅" },
  { href: "/feed", label: "Feed", icon: "👥" },
  { href: "/dividas", label: "Dívidas", icon: "🥤" },
  { href: "/historico", label: "Histórico", icon: "📅" },
  { href: "/config", label: "Config", icon: "⚙️" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-800 bg-zinc-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {ITEMS.map((item) => {
          const active = path === item.href || path.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${active ? "text-emerald-400" : "text-zinc-400"}`}
              >
                <span className="text-lg leading-none" aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
