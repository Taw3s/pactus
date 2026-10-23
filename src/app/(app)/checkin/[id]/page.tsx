/* eslint-disable @next/next/no-img-element -- signed URLs */
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { DisputeBadge } from "@/components/DisputeBadge";
import { DisputeActions } from "@/components/DisputeActions";
import { addDays, formatDayPt, spToday } from "@/lib/dates";
import { getMembers, requireMember, signUrls } from "@/lib/data";
import { checkinNumbers, goalMeta, type Checkin, type Dispute, type DisputeResult, type DisputeVote } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_TEXT = {
  open: "Em votação",
  upheld: "Contestação procedente: check-in anulado",
  rejected: "Contestação rejeitada: check-in mantido",
};

export default async function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, me } = await requireMember();

  const { data: checkin } = await supabase.from("checkins").select("*").eq("id", id).maybeSingle<Checkin>();
  if (!checkin) notFound();

  const [members, { data: dispute }, { data: result }] = await Promise.all([
    getMembers(supabase),
    supabase.from("disputes").select("*").eq("checkin_id", id).maybeSingle<Dispute>(),
    supabase.from("dispute_results").select("*").eq("checkin_id", id).maybeSingle<DisputeResult>(),
  ]);
  const { data: voteRows } = dispute
    ? await supabase.from("dispute_votes").select("*").eq("dispute_id", dispute.id).order("created_at")
    : { data: [] };
  const votes = (voteRows ?? []) as DisputeVote[];

  const byId = new Map(members.map((m) => [m.user_id, m]));
  const owner = byId.get(checkin.user_id);
  const urls = await signUrls(supabase, [checkin.photo_path, owner?.avatar_path]);
  const goal = goalMeta(checkin.goal);
  const numbers = checkinNumbers(checkin);
  const isOwner = checkin.user_id === me.user_id;
  const canDispute = !dispute && !isOwner && checkin.day >= addDays(spToday(), -1);

  return (
    <>
      <Link href="/feed" className="mb-3 inline-block text-sm text-zinc-400">← Feed</Link>
      <article className="card">
        <div className="mb-3 flex items-center gap-3">
          <Avatar name={owner?.display_name ?? "?"} url={owner?.avatar_path ? urls.get(owner.avatar_path) : null} />
          <div className="flex-1">
            <p className="font-semibold">{owner?.display_name}</p>
            <p className="text-xs text-zinc-400">
              {goal.emoji} {goal.label} · {formatDayPt(checkin.day)} ·{" "}
              {new Date(checkin.created_at).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          {result && <DisputeBadge status={result.status} />}
        </div>
        <img src={urls.get(checkin.photo_path)} alt={`Prova de ${goal.label}`} className="w-full rounded-xl" />
        {numbers && <p className="mt-3 text-sm font-medium text-emerald-300">{numbers}</p>}
        {checkin.summary && <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-200">{checkin.summary}</p>}
      </article>

      {dispute && result && (
        <section className="card mt-3 space-y-3" data-testid="dispute">
          <div>
            <h2 className="font-semibold">⚖️ Tribunal</h2>
            <p className="text-sm text-zinc-400">{STATUS_TEXT[result.status]}</p>
          </div>
          <blockquote className="rounded-xl bg-zinc-950 p-3 text-sm">
            <p className="text-xs text-zinc-500">{byId.get(dispute.author_id)?.display_name} contestou:</p>
            <p className="mt-1">{dispute.reason}</p>
          </blockquote>
          {dispute.reply && (
            <blockquote className="rounded-xl bg-zinc-950 p-3 text-sm">
              <p className="text-xs text-zinc-500">{owner?.display_name} respondeu:</p>
              <p className="mt-1">{dispute.reply}</p>
            </blockquote>
          )}
          <div className="text-sm">
            <p>
              <b className="text-red-300">{result.yes} procede</b> · <b className="text-zinc-300">{result.no} não procede</b> ·{" "}
              <span className="text-zinc-400">
                maioria: {result.majority} de {result.eligible}
              </span>
            </p>
            {result.status === "open" && (
              <p className="text-xs text-zinc-500">
                Se ninguém atingir a maioria até{" "}
                {new Date(result.closes_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}, vale
                quem tiver mais votos (empate mantém o check-in).
              </p>
            )}
            <ul className="mt-2 space-y-0.5 text-xs text-zinc-400">
              {votes.map((v) => (
                <li key={v.voter_id}>
                  {byId.get(v.voter_id)?.display_name}: {v.upheld ? "procede" : "não procede"}
                </li>
              ))}
            </ul>
          </div>
          <DisputeActions
            disputeId={dispute.id}
            canReply={isOwner && !dispute.reply}
            canVote={!isOwner && result.status === "open" && !votes.some((v) => v.voter_id === me.user_id)}
          />
        </section>
      )}

      {canDispute && <DisputeActions checkinId={checkin.id} canDispute />}
      {!dispute && isOwner && <p className="mt-3 text-center text-xs text-zinc-500">Prova enviada não pode ser editada.</p>}
    </>
  );
}
