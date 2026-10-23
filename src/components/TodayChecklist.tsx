"use client";

/* eslint-disable @next/next/no-img-element -- local previews and signed URLs */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DisputeBadge } from "@/components/DisputeBadge";
import { compressImage, mediaPath } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";
import { checkinNumbers, goalMeta, GOALS, MIN_STUDY_MINUTES, MIN_SUMMARY, PROJECT, type DisputeStatus, type Goal } from "@/lib/types";

export interface DoneGoal {
  id: string;
  goal: Goal;
  dispute: DisputeStatus | null;
  summary: string | null;
  minutes: number | null;
  pages: number | null;
  title: string | null;
  photoUrl: string | null;
}

interface Props {
  groupId: string;
  userId: string;
  done: DoneGoal[];
  /** Day off: nothing is required, but whatever is sent still scores in the ranking. */
  isOff: boolean;
}

export function TodayChecklist({ groupId, userId, done, isOff }: Props) {
  const doneBy = new Map(done.map((d) => [d.goal, d]));
  const count = done.filter((d) => d.goal !== "project" && d.dispute !== "upheld").length;
  const project = doneBy.get("project");
  return (
    <div className="space-y-3">
      {!isOff && (
        <div className="card">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">{count === 3 ? "Dia cumprido! 🔥" : "Progresso do dia"}</span>
            <span className="text-zinc-400">{count}/3</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(count / 3) * 100}%` }} />
          </div>
        </div>
      )}
      {GOALS.map((g) => {
        const d = doneBy.get(g.id);
        return d ? <DoneCard key={g.id} item={d} /> : <GoalForm key={g.id} goal={g.id} groupId={groupId} userId={userId} />;
      })}
      {project ? <DoneCard item={project} /> : <GoalForm goal={PROJECT.id} groupId={groupId} userId={userId} />}
    </div>
  );
}

function GoalTitle({ goal, done, dispute }: { goal: Goal; done?: boolean; dispute?: DisputeStatus | null }) {
  const g = goalMeta(goal);
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="text-2xl" aria-hidden>{g.emoji}</span>
      <div className="flex-1">
        <h2 className="font-semibold">{g.label}</h2>
        <p className="text-xs text-zinc-400">{g.hint}</p>
      </div>
      {dispute && <DisputeBadge status={dispute} />}
      {done && !dispute && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">enviado</span>}
    </div>
  );
}

function DoneCard({ item }: { item: DoneGoal }) {
  const numbers = checkinNumbers(item);
  return (
    <section className="card" data-goal={item.goal} data-state={item.dispute === "upheld" ? "annulled" : "done"}>
      <GoalTitle goal={item.goal} done dispute={item.dispute} />
      {item.photoUrl && <img src={item.photoUrl} alt="Prova" className="max-h-64 w-full rounded-xl object-cover" />}
      {numbers && <p className="mt-2 text-sm font-medium text-emerald-300">{numbers}</p>}
      {item.summary && <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{item.summary}</p>}
      <p className="mt-2 text-xs text-zinc-500">
        {item.dispute === "upheld"
          ? "Anulado pelo tribunal: não conta hoje."
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
  const [minutes, setMinutes] = useState("");
  const [pages, setPages] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const minutesOk = goal !== "study" || Number(minutes) >= MIN_STUDY_MINUTES;
  const pagesOk = goal !== "reading" || Number(pages) >= 1;
  const titleOk = goal !== "project" || title.trim().length >= 3;
  const summaryOk = goal !== "study" || summary.trim().length >= MIN_SUMMARY;
  const ready = !!file && minutesOk && pagesOk && titleOk && summaryOk;

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  function pick(f: File | undefined) {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
  }

  async function submit() {
    if (!file || !ready) return;
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const blob = await compressImage(file);
      const path = mediaPath(groupId, userId, goal);
      const up = await supabase.storage.from("media").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (up.error) throw new Error("Falha no upload da foto. Tente de novo.");
      // The database sets the day (São Paulo) and the owner; the client only sends the content.
      const { error } = await supabase.from("checkins").insert({
        goal,
        photo_path: path,
        summary: goal === "study" ? summary.trim() : null,
        minutes: goal === "study" ? Number(minutes) : null,
        pages: goal === "reading" ? Number(pages) : null,
        title: goal === "project" ? title.trim() : null,
      });
      if (error) {
        throw new Error(
          error.code === "23505"
            ? goal === "project"
              ? "Você já registrou um projeto hoje."
              : "Essa meta já foi enviada hoje."
            : error.message.includes("photo not uploaded")
              ? "A foto não terminou de subir. Tente de novo."
              : "Não foi possível enviar o check-in.",
        );
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
      setBusy(false);
    }
  }

  return (
    <section className={`card ${goal === "project" ? "border-dashed" : ""}`} data-goal={goal} data-state="pending">
      <GoalTitle goal={goal} />
      {goal === "project" && (
        <input
          className="input mb-3"
          placeholder="Nome do projeto (ex.: calculadora em Python)"
          maxLength={80}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid="title"
        />
      )}
      {/* No `capture` attribute: phones offer both camera and gallery. */}
      <label className="flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-zinc-700 bg-zinc-950 text-sm text-zinc-400">
        {preview ? (
          <img src={preview} alt="Prévia" className="max-h-64 w-full object-cover" />
        ) : (
          <span className="py-8">📷 Tirar ou escolher foto da prova</span>
        )}
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      {goal === "study" && (
        <div className="mt-3 space-y-3">
          <NumberField label="Minutos estudados" min={MIN_STUDY_MINUTES} max={1440} value={minutes} onChange={setMinutes} ok={minutesOk} testId="minutes" />
          <div>
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
        </div>
      )}
      {goal === "reading" && (
        <div className="mt-3">
          <NumberField label="Páginas lidas" min={1} max={2000} value={pages} onChange={setPages} ok={pagesOk} testId="pages" />
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      <button className={`${goal === "project" ? "btn-ghost" : "btn-primary"} mt-3 w-full`} disabled={!ready || busy} onClick={submit}>
        {busy ? "Enviando…" : goal === "project" ? "Registrar projeto" : "Enviar check-in"}
      </button>
    </section>
  );
}

function NumberField(props: {
  label: string;
  min: number;
  max: number;
  value: string;
  onChange: (v: string) => void;
  ok: boolean;
  testId: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className={props.ok || !props.value ? "text-zinc-300" : "text-amber-400"}>
        {props.label} <span className="text-zinc-500">(mín. {props.min})</span>
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={props.min}
        max={props.max}
        className="input w-24 text-right"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        data-testid={props.testId}
      />
    </label>
  );
}
