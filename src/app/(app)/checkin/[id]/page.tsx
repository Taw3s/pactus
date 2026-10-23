/* eslint-disable @next/next/no-img-element -- signed URLs */
import { Maximize2 } from "lucide-react";
import { notFound } from "next/navigation";
import { AiPanel } from "@/components/AiPanel";
import { Avatar } from "@/components/Avatar";
import { BackButton } from "@/components/BackButton";
import { DisputeActions } from "@/components/DisputeActions";
import { PrimaryBadge } from "@/components/StatusBadges";
import { addDays, formatDayPt, spToday } from "@/lib/dates";
import { getMembers, requireMember, signUrls } from "@/lib/data";
import { GOAL_ICON } from "@/lib/goal-icons";
import { checkinNumbers, goalMeta, type Checkin, type CheckinReview, type Dispute, type DisputeResult, type DisputeVote } from "@/lib/types";

export const dynamic = "force-dynamic";

const TRIBUNAL_TITLE = { open: "Contestação aberta", upheld: "Anulado", rejected: "Mantido" };
const TRIBUNAL_TEXT = {
  open: "O grupo está votando.",
  upheld: "O Tribunal decidiu que a contestação procede: esta prova não conta.",
  rejected: "O Tribunal decidiu que a contestação não procede: a prova continua valendo.",
};

const time = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

export default async function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, me } = await requireMember();

  const { data: checkin } = await supabase.from("checkins").select("*").eq("id", id).maybeSingle<Checkin>();
  if (!checkin) notFound();

  const [members, { data: dispute }, { data: result }, { data: review }] = await Promise.all([
    getMembers(supabase),
    supabase.from("disputes").select("*").eq("checkin_id", id).maybeSingle<Dispute>(),
    supabase.from("dispute_results").select("*").eq("checkin_id", id).maybeSingle<DisputeResult>(),
    supabase.from("checkin_reviews").select("*").eq("checkin_id", id).maybeSingle<CheckinReview>(),
  ]);
  const { data: voteRows } = dispute ? await supabase.from("dispute_votes").select("*").eq("dispute_id", dispute.id).order("created_at") : { data: [] };
  const votes = (voteRows ?? []) as DisputeVote[];

  const byId = new Map(members.map((m) => [m.user_id, m]));
  const owner = byId.get(checkin.user_id);
  const ownerName = owner?.display_name ?? "?";
  const urls = await signUrls(supabase, [checkin.photo_path, owner?.avatar_path]);
  const photo = urls.get(checkin.photo_path);
  const goal = goalMeta(checkin.goal);
  const GoalIcon = GOAL_ICON[checkin.goal];
  const value = checkinNumbers(checkin);
  const isOwner = checkin.user_id === me.user_id;
  const recent = checkin.day >= addDays(spToday(), -1);
  const canDispute = !dispute && !isOwner && recent;
  const myVote = votes.find((v) => v.voter_id === me.user_id);
  const joinedLate = !!dispute && me.created_at > dispute.created_at;

  return (
    <>
      <BackButton fallback="/feed" />

      <header className="mb-4 flex items-center gap-3">
        <Avatar name={ownerName} url={owner?.avatar_path ? urls.get(owner.avatar_path) : null} size={48} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[28px] font-bold leading-[34px]">{ownerName}</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <GoalIcon size={16} aria-hidden />
            {goal.label} · {formatDayPt(checkin.day)} · {time(checkin.created_at)}
          </p>
        </div>
      </header>
      {(result || review) && (
        <div className="mb-4">
          <PrimaryBadge dispute={result?.status} ai={review?.verdict} />
        </div>
      )}

      {(value || checkin.goal === "project") && (
        <dl className="mb-4 rounded-2xl bg-surface p-4">
          <dt className="text-sm text-muted">{checkin.goal === "project" ? "Projeto" : "Informado"}</dt>
          <dd className="tabular text-[32px] font-bold leading-9">{value}</dd>
        </dl>
      )}

      <figure className="mb-4">
        {photo ? (
          <a href={photo} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-xl bg-surface">
            <img src={photo} alt={`Prova de ${goal.label.toLowerCase()} enviada por ${ownerName}`} className="mx-auto max-h-[60dvh] w-full object-contain" />
            <span className="absolute bottom-2 right-2 inline-flex min-h-9 items-center gap-1 rounded-lg bg-bg/90 px-2 text-xs font-semibold">
              <Maximize2 size={14} aria-hidden /> Abrir foto inteira
            </span>
          </a>
        ) : (
          <div className="flex h-40 items-center justify-center rounded-xl bg-surface text-sm text-muted">Foto indisponível no momento.</div>
        )}
      </figure>

      {checkin.summary && (
        <section className="mb-4" aria-labelledby="resumo">
          <h2 id="resumo" className="mb-1 text-sm font-semibold text-muted">
            Resumo
          </h2>
          <p className="whitespace-pre-wrap">{checkin.summary}</p>
        </section>
      )}

      <div className="mb-4">
        <AiPanel
          checkinId={checkin.id}
          review={review ? { verdict: review.verdict, seen: review.seen, detected: review.detected } : null}
          declaredMinutes={checkin.minutes}
          ownerName={ownerName}
          isOwner={isOwner}
          canRequest={recent}
          secondary={result?.status === "upheld"}
        />
      </div>

      {dispute && result && (
        <section className="space-y-4 rounded-2xl bg-surface p-4" data-testid="dispute" aria-labelledby="tribunal">
          <div>
            <h2 id="tribunal" className="text-lg font-semibold leading-6">
              {TRIBUNAL_TITLE[result.status]}
            </h2>
            <p className="mt-1 text-sm text-muted">{TRIBUNAL_TEXT[result.status]}</p>
          </div>

          <div className="border-t border-divider pt-4">
            <p className="text-sm text-muted">Motivo de {byId.get(dispute.author_id)?.display_name}</p>
            <p className="mt-1">{dispute.reason}</p>
          </div>
          {dispute.reply && (
            <div className="border-t border-divider pt-4">
              <p className="text-sm text-muted">Resposta de {ownerName}</p>
              <p className="mt-1">{dispute.reply}</p>
            </div>
          )}

          <div className="border-t border-divider pt-4">
            <p className="tabular font-semibold">
              {result.yes} procede · {result.no} não procede
            </p>
            <p className="tabular text-sm text-muted">
              Maioria: {result.majority} de {result.eligible} votantes.
              {result.status === "open" &&
                ` Se ninguém atingir a maioria até ${new Date(result.closes_at).toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                  dateStyle: "short",
                  timeStyle: "short",
                })}, vale quem tiver mais votos; empate mantém a prova.`}
            </p>
            {votes.length > 0 && (
              <ul className="mt-2 text-sm text-muted">
                {votes.map((v) => (
                  <li key={v.voter_id}>
                    {byId.get(v.voter_id)?.display_name}: {v.upheld ? "procede" : "não procede"}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {result.status === "open" && (
            <div className="border-t border-divider pt-4">
              {myVote ? (
                <p className="font-medium">Seu voto: {myVote.upheld ? "procede" : "não procede"}.</p>
              ) : isOwner ? (
                <p className="text-sm text-muted">Você é o dono desta prova e não vota.</p>
              ) : joinedLate ? (
                <p className="text-sm text-muted">Você entrou no grupo depois que esta contestação foi aberta e não vota.</p>
              ) : (
                <DisputeActions disputeId={dispute.id} canVote />
              )}
            </div>
          )}
          {isOwner && !dispute.reply && (
            <div className="border-t border-divider pt-4">
              <DisputeActions disputeId={dispute.id} canReply />
            </div>
          )}
        </section>
      )}

      {canDispute && <DisputeActions checkinId={checkin.id} canDispute />}
      {!dispute && isOwner && <p className="text-sm text-muted">Provas enviadas não podem ser editadas, só contestadas pelo grupo.</p>}
    </>
  );
}
