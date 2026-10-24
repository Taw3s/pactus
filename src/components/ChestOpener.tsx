"use client";

import { Loader } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { collectible, RARITY_LABEL, RARITY_TONE, type Rarity } from "@/lib/collectibles";
import { createClient } from "@/lib/supabase/client";
import { Sprite, type SpriteName } from "./Sprite";

export interface OpenedItem {
  itemId: string;
  rarity: Rarity;
}

const SPIN: SpriteName[] = ["chest1", "chest2", "chest3"];
const OPEN: SpriteName[] = ["chest4", "chest5", "chest6"];

/**
 * A chest that spins while the server draws the item, then opens and reveals it.
 * The draw happens in the database (open_chest): this component only plays it.
 */
export function ChestOpener({ kind, opened, label }: { kind: "daily" | "weekly"; opened: OpenedItem | null; label: string }) {
  const [item, setItem] = useState<OpenedItem | null>(opened);
  const [frame, setFrame] = useState<SpriteName>(opened ? "chest6" : "chest1");
  const [phase, setPhase] = useState<"idle" | "spinning" | "opening" | "done">(opened ? "done" : "idle");
  const [error, setError] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  async function open() {
    setError("");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPhase("spinning");
    let i = 0;
    const spin = setInterval(() => setFrame(SPIN[++i % SPIN.length]), 140);
    const started = Date.now();
    const { data, error } = await createClient().rpc("open_chest", { p_kind: kind });
    // Keep spinning for at least ~1 s so the reveal never feels instant.
    await new Promise((r) => setTimeout(r, still ? 0 : Math.max(0, 1000 - (Date.now() - started))));
    clearInterval(spin);
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) {
      setFrame("chest1");
      setPhase("idle");
      setError("Não foi possível abrir agora. Tente de novo.");
      return;
    }
    const won = { itemId: row.item_id as string, rarity: row.rarity as Rarity };
    if (still) {
      setFrame("chest6");
      setItem(won);
      setPhase("done");
      return;
    }
    setPhase("opening");
    OPEN.forEach((f, n) => timers.current.push(setTimeout(() => setFrame(f), n * 160)));
    timers.current.push(
      setTimeout(() => {
        setItem(won);
        setPhase("done");
      }, OPEN.length * 160 + 120),
    );
  }

  const info = item ? collectible(item.itemId) : null;
  return (
    <div className="flex items-center gap-4" data-testid={`chest-${kind}`} data-phase={phase}>
      <div className="relative shrink-0">
        <Sprite name={frame} scale={2} className={phase === "idle" ? "animate-[bob_1.2s_steps(2)_infinite] motion-reduce:animate-none" : ""} />
        {item && info && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 animate-[pop_240ms_steps(3)_both]">
            <Sprite name={info.id} />
          </span>
        )}
      </div>
      <div className="min-w-0" aria-live="polite">
        {item && info ? (
          <>
            <p className={`pixel text-sm uppercase ${RARITY_TONE[item.rarity]}`}>{RARITY_LABEL[item.rarity]}</p>
            <p className="pixel text-2xl font-bold uppercase leading-7" data-testid="chest-item">
              {info.name}
            </p>
            <p className="mt-1 text-sm text-muted">Guardado na sua coleção (Perfil).</p>
          </>
        ) : (
          <>
            <p className="font-semibold">{label}</p>
            <button className="btn-primary mt-2" onClick={open} disabled={phase !== "idle"}>
              {phase === "idle" ? "Abrir baú" : <Loader size={18} aria-hidden className="animate-[spin_800ms_steps(8)_infinite]" />}
              {phase === "idle" ? "" : "Abrindo…"}
            </button>
            {error && (
              <p role="alert" className="mt-2 text-sm text-fail">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
