"use client";

/* eslint-disable @next/next/no-img-element -- local previews and signed URLs */
import { Camera, Check, ChevronRight, Loader } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AiBadge, TribunalBadge } from "@/components/StatusBadges";
import { Badge } from "@/components/ui/Badge";
import type { Verdict } from "@/lib/ai-review";
import { GOAL_SPRITE } from "@/lib/goal-icons";
import { Sprite } from "@/components/Sprite";
import { compressImage, mediaPath } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";
import { checkinNumbers, goalMeta, GOALS, MIN_STUDY_MINUTES, MIN_SUMMARY, PROJECT, type DisputeStatus, type Goal } from "@/lib/types";

export interface DoneGoal {
  id: string;
  goal: Goal;
  dispute: DisputeStatus | null;
  review: Verdict | null;
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
}

export function TodayChecklist({ groupId, userId, done }: Props) {
  const doneBy = new Map(done.map((d) => [d.goal, d]));
  const project = doneBy.get("project");
  const anyDone = GOALS.some((g) => doneBy.has(g.id));
  return (
    <>
      <section aria-labelledby="metas" className="mb-8">
        <h2 id="metas" className="pixel mb-3 text-2xl uppercase leading-7">
          Metas
        </h2>
        {/* Stable order (study → typing → reading): cards never move while someone is typing. */}
        <div className="space-y-3">
          {GOALS.map((g) => {
            const d = doneBy.get(g.id);
            return d ? <DoneRow key={g.id} item={d} /> : <GoalForm key={g.id} goal={g.id} groupId={groupId} userId={userId} />;
          })}
        </div>
        {anyDone && <p className="mt-3 text-sm text-muted">Provas enviadas não podem ser editadas, só contestadas pelo grupo.</p>}
      </section>

      <section aria-labelledby="projeto">
        <h2 id="projeto" className="pixel text-2xl uppercase leading-7">
          Projeto opcional
        </h2>
        <p className="mb-3 text-sm text-muted">Não conta para as 3 metas. Vale poucos pontos no ranking, no máximo 1 por dia.</p>
        {project ? <DoneRow item={project} /> : <GoalForm goal={PROJECT.id} groupId={groupId} userId={userId} />}
      </section>
    </>
  );
}

function DoneRow({ item }: { item: DoneGoal }) {
  const g = goalMeta(item.goal);
  const value = checkinNumbers(item);
  const annulled = item.dispute === "upheld";
  return (
    <Link
      href={`/checkin/${item.id}`}
      className="card flex min-h-[88px] items-center gap-3 p-3 transition-colors duration-150 hover:bg-raised"
      data-goal={item.goal}
      data-state={annulled ? "annulled" : "done"}
    >
      <Sprite name={GOAL_SPRITE[item.goal]} dim={annulled} />
      <span className="min-w-0 flex-1">
        <span className="pixel block text-lg uppercase leading-5">{g.label}</span>
        {value && <span className="tabular mt-0.5 block break-words text-sm text-muted">{value}</span>}
        <span className="mt-1 flex flex-wrap gap-1">
          {item.dispute ? (
            <TribunalBadge status={item.dispute} />
          ) : (
            <>
              <Badge tone="done" icon={Check}>
                Enviado
              </Badge>
              {item.review && <AiBadge state={item.review} />}
            </>
          )}
        </span>
      </span>
      {item.photoUrl ? (
        <img src={item.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-sm border-2 border-bevel-dark object-cover" />
      ) : (
        <span className="h-14 w-14 shrink-0 rounded-sm bg-raised" />
      )}
      <ChevronRight size={20} aria-hidden className="shrink-0 text-muted" />
    </Link>
  );
}

function GoalForm({ goal, groupId, userId }: { goal: Goal; groupId: string; userId: string }) {
  const router = useRouter();
  const g = goalMeta(goal);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [minutes, setMinutes] = useState("");
  const [pages, setPages] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  const minutesOk = goal !== "study" || Number(minutes) >= MIN_STUDY_MINUTES;
  const pagesOk = goal !== "reading" || Number(pages) >= 1;
  const titleOk = goal !== "project" || title.trim().length >= 3;
  const summaryOk = goal !== "study" || summary.trim().length >= MIN_SUMMARY;
  const ready = !!file && minutesOk && pagesOk && titleOk && summaryOk;

  // What is still missing, in words, next to the disabled button.
  const missing = [
    !titleOk && "dê um nome ao projeto",
    !file && "adicione a foto",
    goal === "study" && !minutesOk && `informe pelo menos ${MIN_STUDY_MINUTES} min`,
    goal === "reading" && !pagesOk && "informe as páginas lidas",
    goal === "study" && !summaryOk && "complete o resumo",
  ].filter(Boolean) as string[];
  const missingText =
    missing.length === 0 ? "" : `Para enviar: ${missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(", ")} e ${missing.at(-1)}`}.`;

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
      if (up.error) throw new Error("A foto não subiu. Seus dados continuam aqui: tente de novo.");
      // The database sets the day (São Paulo) and the owner; the client only sends the content.
      const { data: created, error } = await supabase
        .from("checkins")
        .insert({
          goal,
          photo_path: path,
          summary: goal === "study" ? summary.trim() : null,
          minutes: goal === "study" ? Number(minutes) : null,
          pages: goal === "reading" ? Number(pages) : null,
          title: goal === "project" ? title.trim() : null,
        })
        .select("id")
        .single();
      if (error) {
        throw new Error(
          error.code === "23505"
            ? goal === "project"
              ? "Você já registrou um projeto hoje."
              : "Essa meta já foi enviada hoje."
            : error.message.includes("photo not uploaded")
              ? "A foto não terminou de subir. Tente de novo."
              : "Não foi possível enviar. Seus dados continuam aqui: tente de novo.",
        );
      }
      // AI review runs in the background; the check-in is already saved.
      fetch("/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ checkinId: created.id }),
        keepalive: true,
      }).catch(() => {});
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
      setBusy(false);
    }
  }

  const fieldId = (name: string) => `${goal}-${name}`;

  return (
    <section className="card" data-goal={goal} data-state="pending" aria-labelledby={fieldId("title")} onChange={() => setTouched(true)}>
      <div className="mb-3 flex items-center gap-3">
        <Sprite name={GOAL_SPRITE[goal]} dim />
        <div className="min-w-0 flex-1">
          <h3 id={fieldId("title")} className="pixel text-xl uppercase leading-6">
            {g.label}
          </h3>
          <p className="text-sm text-muted">{g.hint}</p>
        </div>
      </div>

      {goal === "project" && (
        <div className="mb-3">
          <label className="label" htmlFor={fieldId("name")}>
            Nome do projeto
          </label>
          <input
            id={fieldId("name")}
            className="input"
            placeholder="Ex.: calculadora em Python"
            maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            data-testid="title"
          />
        </div>
      )}

      {/* No `capture` attribute: phones offer both camera and gallery. */}
      <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-sm border-2 border-dashed border-control bg-bg text-sm text-muted transition-colors duration-150 hover:text-fg">
        {preview ? (
          <img src={preview} alt="Prévia da prova" className="max-h-64 w-full object-contain" />
        ) : (
          <span className="flex items-center gap-2 py-8 font-medium">
            <Camera size={20} aria-hidden />
            Tirar ou escolher foto da prova
          </span>
        )}
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      </label>

      {goal === "study" && (
        <div className="mt-3 space-y-3">
          <NumberField id={fieldId("minutes")} label="Minutos estudados" min={MIN_STUDY_MINUTES} max={1440} value={minutes} onChange={setMinutes} ok={minutesOk} testId="minutes" />
          <div>
            <label className="label" htmlFor={fieldId("summary")}>
              Resumo do que você estudou
            </label>
            <textarea
              id={fieldId("summary")}
              className="input min-h-24 resize-y"
              maxLength={2000}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              aria-describedby={fieldId("summary-help")}
            />
            <p id={fieldId("summary-help")} className={`tabular mt-1 text-sm ${summaryOk || !touched ? "text-muted" : "text-warn"}`}>
              {summary.trim().length} de {MIN_SUMMARY} caracteres mínimos
            </p>
          </div>
        </div>
      )}
      {goal === "reading" && (
        <div className="mt-3">
          <NumberField id={fieldId("pages")} label="Páginas lidas" min={1} max={2000} value={pages} onChange={setPages} ok={pagesOk} testId="pages" />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-fail">
          {error}
        </p>
      )}
      {missingText && (
        <p id={fieldId("missing")} className="mt-4 text-sm text-muted" aria-live="polite">
          {missingText}
        </p>
      )}
      <button
        className={`${goal === "project" ? "btn-secondary" : "btn-primary"} mt-3 w-full`}
        disabled={!ready || busy}
        onClick={submit}
        aria-describedby={missingText ? fieldId("missing") : undefined}
      >
        {busy && <Loader size={18} aria-hidden className="animate-spin motion-reduce:animate-none" />}
        {busy ? "Enviando…" : goal === "project" ? "Registrar projeto" : "Enviar prova"}
      </button>
    </section>
  );
}

function NumberField(props: {
  id: string;
  label: string;
  min: number;
  max: number;
  value: string;
  onChange: (v: string) => void;
  ok: boolean;
  testId: string;
}) {
  const invalid = !props.ok && !!props.value;
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={props.id} className={`text-base leading-5 ${invalid ? "text-warn" : "text-fg"}`}>
        {props.label}
        <span className="block text-sm text-muted">Mínimo {props.min}</span>
      </label>
      <input
        id={props.id}
        type="number"
        inputMode="numeric"
        min={props.min}
        max={props.max}
        aria-invalid={invalid}
        className="input tabular w-24 text-right"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        data-testid={props.testId}
      />
    </div>
  );
}
