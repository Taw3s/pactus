// Collectibles won in chests (sprite names in public/lowpoly). The draw itself happens in the
// database (open_chest, migration 0006) so nobody can pick an item; this is the display catalog.
export type Rarity = "comum" | "raro" | "lendario";

export const COLLECTIBLES = [
  { id: "plant", name: "Planta", rarity: "comum" },
  { id: "mug", name: "Caneca", rarity: "comum" },
  { id: "duck", name: "Patinho", rarity: "comum" },
  { id: "cat", name: "Gato", rarity: "raro" },
  { id: "lamp", name: "Luminária", rarity: "raro" },
  { id: "globe", name: "Globo", rarity: "raro" },
  { id: "goldBook", name: "Livro dourado", rarity: "lendario" },
  { id: "crown", name: "Coroa", rarity: "lendario" },
] as const satisfies readonly { id: string; name: string; rarity: Rarity }[];

export type CollectibleId = (typeof COLLECTIBLES)[number]["id"];

export const RARITY_LABEL: Record<Rarity, string> = { comum: "Comum", raro: "Raro", lendario: "Lendário" };
export const RARITY_TONE: Record<Rarity, string> = { comum: "text-fg", raro: "text-ai", lendario: "text-gold" };

export function collectible(id: string) {
  return COLLECTIBLES.find((c) => c.id === id);
}

/** Monday of the week of `day` (ISO), the period of the weekly group challenge. */
export function weekStart(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Weekly challenge: every member must complete this many days in the week. */
export const WEEKLY_GOAL_DAYS = 5;
