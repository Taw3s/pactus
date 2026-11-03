"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { MAX_ATTACHMENT_BYTES, validateAttachment, type AttachmentKind } from "@/lib/attachments";
import type { Goal } from "@/lib/types";

type SavedAttachment = { kind: AttachmentKind; display_name: string; size_bytes: number; url: string | null };

const kindFor = (goal: Goal): AttachmentKind | null => goal === "study" ? "study_pdf" : goal === "project" ? "project_zip" : null;
const sizeLabel = (size: number) => size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;

export function CheckinAttachments({ checkinId, goal, isOwner, attachments }: { checkinId: string; goal: Goal; isOwner: boolean; attachments: SavedAttachment[] }) {
  const router = useRouter();
  const kind = kindFor(goal);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const saved = attachments.find((item) => item.kind === kind);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    event.target.value = "";
    setError("");
    if (!next || !kind) return;
    const result = validateAttachment(kind, next.name, next.size, new Uint8Array(await next.slice(0, 8).arrayBuffer()));
    if (!result.ok) {
      setError(result.reason === "size" ? "O arquivo deve ter até 10 MB." : result.reason === "type" ? `Escolha um arquivo .${kind === "study_pdf" ? "pdf" : "zip"}.` : "O conteúdo do arquivo não corresponde ao tipo selecionado.");
      setFile(null);
      return;
    }
    setFile(next);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file || !kind || busy) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch(`/api/checkins/${checkinId}/attachments`, { method: "POST", body: form });
      if (!response.ok && response.status !== 409) {
        const body = await response.json().catch(() => null);
        throw new Error(typeof body?.error === "string" ? body.error : "Não foi possível anexar o arquivo. Tente novamente.");
      }
      setFile(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível anexar o arquivo. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  if (!kind) return null;
  return (
    <section className="card mb-4" aria-labelledby="anexos-title" data-testid="checkin-attachments">
      <h2 id="anexos-title" className="pixel mb-2 text-base uppercase text-muted">{kind === "study_pdf" ? "Material estudado" : "Arquivo do projeto"}</h2>
      {saved ? (
        <a
          href={saved.url ?? undefined}
          download={saved.display_name}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-12 items-center justify-between gap-3 rounded-sm border-2 border-bevel-dark bg-bg px-3 py-2 font-medium underline decoration-accent underline-offset-4"
        >
          <span className="min-w-0 break-all">{saved.display_name}</span>
          <span className="shrink-0 text-sm text-muted">{sizeLabel(saved.size_bytes)}</span>
        </a>
      ) : (
        <>
          <p className="mb-2 text-sm text-muted">{kind === "study_pdf" ? "PDF privado, até 10 MB." : "ZIP privado, até 10 MB. Não é extraído nem executado."}</p>
          {isOwner ? (
            <form onSubmit={submit} className="space-y-2">
              <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-sm border-2 border-dashed border-control px-3 py-2 text-sm font-semibold hover:bg-raised">
                {file ? file.name : `Escolher ${kind === "study_pdf" ? "PDF" : "ZIP"}`}
                <input type="file" accept={kind === "study_pdf" ? ".pdf,application/pdf" : ".zip,application/zip"} onChange={choose} className="sr-only" />
              </label>
              {error && <p role="alert" className="text-sm text-fail">{error}</p>}
              <button type="submit" className="btn-secondary w-full" disabled={!file || busy}>
                {busy ? "Enviando…" : "Anexar arquivo"}
              </button>
            </form>
          ) : (
            <p className="text-sm text-muted">Nenhum anexo.</p>
          )}
        </>
      )}
    </section>
  );
}

export { MAX_ATTACHMENT_BYTES };
