"use client";

/* eslint-disable @next/next/no-img-element -- local previews and signed URLs */
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressImage, mediaPath } from "@/lib/image";
import Link from "next/link";
import { DisputeBadge } from "@/components/DisputeBadge";
import { GOALS, MIN_SUMMARY, type DisputeStatus, type Goal } from "@/lib/types";

interface DoneGoal {
  id: string;
  goal: Goal;
  dispute: DisputeStatus | null;
  summary: string | null;
  photoUrl: string | null;
}

export function TodayChecklist({ groupId, userId, done }: { groupId: string; userId: string; done: DoneGoal[] }) {
  const doneBy = new Map(done.map((d) => [d.goal, d]));
  const count = done.filter((d) => d.dispute !== "upheld").length;
  return (
    <div className="space-y-3">
      <div className="card">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">{count === 3 ? "Dia cumprido! 🔥" : "Progresso do dia"}</span>
          <span className="text-zinc-400">{count}/3</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(count / 3) * 100}%` }} />
        </div>
      </div>
      {GOALS.map((g) => {
        const d = doneBy.get(g.id);
        return d ? <DoneCard key={g.id} goal={g.id} item={d} /> : <GoalForm key={g.id} goal={g.id} groupId={groupId} userId={userId} />;
      })}
    </div>
  );
}

function GoalTitle({ goal, done, dispute }: { goal: Goal; done?: boolean; dispute?: DisputeStatus | null }) {
  const g = GOALS.find((x) => x.id === goal)!;
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="text-2xl" aria-hidden>{g.emoji}</span>
      <div className="flex-1">
        <h2 className="font-semibold">{g.label}</h2>
        <p className="text-xs text-zinc-400">{g.minutes} min</p>
      </div>
      {dispute && <DisputeBadge status={dispute} />}
      {done && !dispute && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">enviado</span>}
    </div>
  );
}

function DoneCard({ goal, item }: { goal: Goal; item: DoneGoal }) {
  return (
    <section className="card" data-goal={goal} data-state={item.dispute === "upheld" ? "annulled" : "done"}>
      <GoalTitle goal={goal} done dispute={item.dispute} />
      {item.photoUrl && <img src={item.photoUrl} alt="Prova" className="max-h-64 w-full rounded-xl object-cover" />}
      {item.summary && <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{item.summary}</p>}
      <p className="mt-2 text-xs text-zinc-500">
        {item.dispute === "upheld"
          ? "Anulado pelo tribunal: esta meta não conta hoje."
          : "Prova enviada não pode ser editada."}{" "}
        {item.dispute && <Link href={`/checkin/${item.id}`} className="underline">Ver tribunal</Link>}
      </p>
    </section>
  );
}

function GoalForm({ goal, groupId, userId }: { goal: Goal; groupId: string; userId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const needsSummary = goal === "study";
  const summaryOk = !needsSummary || summary.trim().length >= MIN_SUMMARY;

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  function pick(f: File | undefined) {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
  }

  async function submit() {
    if (!file || !summaryOk) return;
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const blob = await compressImage(file);
      const path = mediaPath(groupId, userId, goal);
      const up = await supabase.storage.from("media").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (up.error) throw new Error("Falha no upload da foto. Tente de novo.");
      // The database sets the day (São Paulo) and the owner; the client only sends the content.
      const { error } = await supabase
        .from("checkins")
        .insert({ goal, photo_path: path, summary: needsSummary ? summary.trim() : null });
      if (error) throw new Error(error.code === "23505" ? "Essa meta já foi enviada hoje." : "Não foi possível enviar o check-in.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
      setBusy(false);
    }
  }

  return (
    <section className="card" data-goal={goal} data-state="pending">
      <GoalTitle goal={goal} />
      {/* No `capture` attribute: phones offer both camera and gallery. */}
      <label className="flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-zinc-700 bg-zinc-950 text-sm text-zinc-400">
        {preview ? (
          <img src={preview} alt="Prévia" className="max-h-64 w-full object-cover" />
        ) : (
          <span className="py-8">📷 Tirar ou escolher foto da prova</span>
        )}
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      {needsSummary && (
        <div className="mt-3">
          <textarea
            className="input min-h-24 resize-y"
            placeholder="Resumo do que você estudou…"
            maxLength={2000}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
          <p className={`mt-1 text-xs ${summaryOk ? "text-zinc-500" : "text-amber-400"}`}>
            {summary.trim().length}/{MIN_SUMMARY} caracteres mínimos
          </p>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      <button className="btn-primary mt-3 w-full" disabled={!file || !summaryOk || busy} onClick={submit}>
        {busy ? "Enviando…" : "Enviar check-in"}
      </button>
    </section>
  );
}
