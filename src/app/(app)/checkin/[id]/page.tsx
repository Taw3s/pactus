/* eslint-disable @next/next/no-img-element -- signed URLs */
import { Maximize2 } from "lucide-react";
import { notFound } from "next/navigation";
import { AiPanel } from "@/components/AiPanel";
import { Avatar } from "@/components/Avatar";
import { BackButton } from "@/components/BackButton";
import { DisputeActions } from "@/components/DisputeActions";
import { Sprite } from "@/components/Sprite";
import { PrimaryBadge } from "@/components/StatusBadges";
import { Courtroom } from "@/components/tribunal/Courtroom";
import { TribunalTabs } from "@/components/tribunal/TribunalTabs";
import { addDays, formatDayPt, spToday } from "@/lib/dates";
import { getMembers, requireMember, signUrls } from "@/lib/data";
import { GOAL_ICON } from "@/lib/goal-icons";
import { checkinNumbers, goalMeta, type Checkin, type CheckinReview, type Dispute, type DisputeResult, type DisputeVote, type Member } from "@/lib/types";

export const dynamic = "force-dynamic";

const time = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

export default async function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, me } = await requireMember();

  // One round trip for everything about this proof (RLS limits it to the caller's group).
  const [{ data: checkin }, members, { data: dispute }, { data: result }, { data: review }] = await Promise.all([
    supabase.from("checkins").select("*").eq("id", id).maybeSingle<Checkin>(),
    getMembers(supabase),
    supabase.from("disputes").select("*, dispute_votes(*)").eq("checkin_id", id).maybeSingle<Dispute & { dispute_votes: DisputeVote[] }>(),
    supabase.from("dispute_results").select("*").eq("checkin_id", id).maybeSingle<DisputeResult>(),
    supabase.from("checkin_reviews").select("*").eq("checkin_id", id).maybeSingle<CheckinReview>(),
  ]);
  if (!checkin) notFound();
  const votes = [...(dispute?.dispute_votes ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));

  const byId = new Map(members.map((m) => [m.user_id, m]));
  const owner = byId.get(checkin.user_id);
  const ownerName = owner?.display_name ?? "?";
  // Jurors: everyone but the defendant who was in the group when the tribunal opened.
  const jurors = dispute ? members.filter((m) => m.user_id !== checkin.user_id && m.created_at <= dispute.created_at) : [];
  const urls = await signUrls(supabase, [checkin.photo_path, owner?.avatar_path, ...jurors.map((m) => m.avatar_path)]);
  const photo = urls.get(checkin.photo_path);
  const avatar = (m?: Member) => (m?.avatar_path ? (urls.get(m.avatar_path) ?? null) : null);
  const goal = goalMeta(checkin.goal);
  const GoalIcon = GOAL_ICON[checkin.goal];
  const value = checkinNumbers(checkin);
  const isOwner = checkin.user_id === me.user_id;
  const recent = checkin.day >= addDays(spToday(), -1);
  const canDispute = !dispute && !isOwner && recent;
  const myVote = votes.find((v) => v.voter_id === me.user_id) ?? null;
  const joinedLate = !!dispute && me.created_at > dispute.created_at;
  const accuser = dispute ? (dispute.by_ai ? "Juiz IA" : (byId.get(dispute.author_id ?? "")?.display_name ?? "?")) : "";

  const photoBlock = (
    <figure className="mb-4">
      {photo ? (
        <a href={photo} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-sm border-2 border-bevel-dark bg-surface">
          <img src={photo} alt={`Prova de ${goal.label.toLowerCase()} enviada por ${ownerName}`} className="mx-auto max-h-[60dvh] w-full object-contain" />
          <span className="absolute bottom-2 right-2 inline-flex min-h-9 items-center gap-1 rounded-sm bg-bg/90 px-2 text-xs font-semibold">
            <Maximize2 size={14} aria-hidden /> Abrir foto inteira
          </span>
        </a>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-sm bg-surface text-sm text-muted">Foto indisponível no momento.</div>
      )}
    </figure>
  );

  const details = (
    <>
      {(value || checkin.goal === "project") && (
        <dl className="card mb-4">
          <dt className="pixel text-base uppercase text-muted">{checkin.goal === "project" ? "Projeto" : "Informado"}</dt>
          <dd className="pixel tabular text-[32px] font-bold leading-9">{value}</dd>
        </dl>
      )}
      {photoBlock}
      {checkin.summary && (
        <section className="mb-4" aria-labelledby="resumo">
          <h2 id="resumo" className="pixel mb-1 text-base uppercase text-muted">
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
    </>
  );

  const header = (
    <header className="mb-4 flex items-center gap-3">
      <Avatar name={ownerName} url={avatar(owner)} size={48} />
      <div className="min-w-0 flex-1">
        <p className="pixel truncate text-[28px] font-bold uppercase leading-[34px]">{ownerName}</p>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <GoalIcon size={16} aria-hidden />
          {goal.label} · {formatDayPt(checkin.day)} · {time(checkin.created_at)}
        </p>
      </div>
    </header>
  );

  if (dispute && result && owner) {
    const evidence = (
      <>
        <section className="card mb-4" aria-labelledby="acusacao">
          <h2 id="acusacao" className="pixel flex items-center gap-2 text-lg uppercase text-fail">
            {dispute.by_ai ? <Sprite name="gavel" /> : <Avatar name={accuser} url={avatar(byId.get(dispute.author_id ?? ""))} size={32} />}
            Acusação · {accuser}
          </h2>
          <p className="mt-2">{dispute.reason}</p>
        </section>
        <section className="card mb-4" aria-labelledby="defesa">
          <h2 id="defesa" className="pixel flex items-center gap-2 text-lg uppercase text-done">
            <Avatar name={ownerName} url={avatar(owner)} size={32} />
            Defesa · {ownerName}
          </h2>
          {dispute.reply ? (
            <p className="mt-2">{dispute.reply}</p>
          ) : isOwner ? (
            <div className="mt-3">
              <DisputeActions disputeId={dispute.id} canReply />
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">{ownerName} ainda não se defendeu.</p>
          )}
        </section>
        <p className="pixel mb-2 flex items-center gap-1.5 text-base uppercase text-muted">
          <GoalIcon size={16} aria-hidden />
          Prova de {goal.label.toLowerCase()} · {formatDayPt(checkin.day)} · {time(checkin.created_at)}
        </p>
        {details}
      </>
    );

    const pending = jurors.filter((m) => !votes.some((v) => v.voter_id === m.user_id));
    const voteList = (
      <>
        {votes.length === 0 ? (
          <p className="text-sm text-muted">Ninguém votou ainda.</p>
        ) : (
          <ul className="space-y-3">
            {votes.map((v) => {
              const m = byId.get(v.voter_id);
              return (
                <li key={v.voter_id} className="card flex gap-3" data-vote-by={m?.display_name}>
                  <Avatar name={m?.display_name ?? "?"} url={avatar(m)} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 font-semibold">
                      {m?.display_name}
                      <span className={`pixel text-base uppercase ${v.upheld ? "text-fail" : "text-done"}`}>{v.upheld ? "Culpado" : "Inocente"}</span>
                      <span className="text-xs font-normal text-muted">{time(v.created_at)}</span>
                    </p>
                    <p className="mt-1 break-words text-sm">{v.reason ?? <span className="text-muted">Sem motivo (voto antigo).</span>}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {result.status === "open" && pending.length > 0 && (
          <p className="mt-4 text-sm text-muted">Ainda não votaram: {pending.map((m) => m.display_name).join(", ")}.</p>
        )}
      </>
    );

    return (
      <>
        <BackButton fallback="/feed" />
        <Courtroom
          disputeId={dispute.id}
          result={result}
          defendant={owner}
          defendantAvatar={avatar(owner)}
          accuser={accuser}
          byAi={dispute.by_ai}
          jurors={jurors.map((m) => ({ member: m, avatarUrl: avatar(m), vote: votes.find((v) => v.voter_id === m.user_id) ?? null }))}
          me={{ id: me.user_id, isOwner, canVote: !isOwner && !joinedLate && !myVote, vote: myVote, joinedLate }}
        />
        <TribunalTabs evidence={evidence} votes={voteList} voteCount={votes.length} />
      </>
    );
  }

  return (
    <>
      <BackButton fallback="/feed" />
      {header}
      {review && (
        <div className="mb-4">
          <PrimaryBadge ai={review.verdict} />
        </div>
      )}
      {details}
      {canDispute && <DisputeActions checkinId={checkin.id} canDispute />}
      {isOwner && <p className="text-sm text-muted">Provas enviadas não podem ser editadas, só contestadas pelo grupo.</p>}
    </>
  );
}
