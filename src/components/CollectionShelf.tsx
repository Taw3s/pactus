import { COLLECTIBLES, RARITY_LABEL, RARITY_TONE } from "@/lib/collectibles";
import { Sprite } from "./Sprite";

/** Perfil: the objects won in chests. Missing ones show as silhouettes ("???"). */
export function CollectionShelf({ counts, isMe }: { counts: Map<string, number>; isMe: boolean }) {
  const owned = COLLECTIBLES.filter((c) => counts.has(c.id)).length;
  return (
    <section className="card mb-4" aria-labelledby="colecao" data-testid="collection">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="colecao" className="pixel text-xl uppercase leading-6">
          Coleção
        </h2>
        <p className="pixel tabular text-lg text-accent" data-testid="collection-count">
          {owned}/{COLLECTIBLES.length}
        </p>
      </div>
      <ul className="grid grid-cols-4 gap-x-2 gap-y-3">
        {COLLECTIBLES.map((c) => {
          const n = counts.get(c.id) ?? 0;
          return (
            <li key={c.id} className="flex flex-col items-center text-center" data-collectible={c.id} data-owned={n > 0}>
              <Sprite name={c.id} className={n ? "" : "opacity-40 [filter:brightness(0)]"} />
              <p className={`text-xs font-semibold leading-4 ${n ? RARITY_TONE[c.rarity] : "text-muted"}`}>{n ? c.name : "???"}</p>
              <p className="text-xs leading-4 text-muted">{n > 1 ? `×${n}` : RARITY_LABEL[c.rarity]}</p>
            </li>
          );
        })}
      </ul>
      <div aria-hidden className="mt-2 h-2 rounded-[1px] border-b-4 border-wood-dark bg-wood" />
      {owned === 0 && (
        <p className="mt-3 text-sm text-muted">{isMe ? "Feche um dia e abra o baú para ganhar o primeiro objeto." : "Ainda nenhum objeto."}</p>
      )}
    </section>
  );
}
