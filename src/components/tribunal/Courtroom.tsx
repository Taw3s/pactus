import { Check, Minus, X } from "lucide-react";
import { Avatar } from "../Avatar";
import { GavelStamp } from "../GavelStamp";
import { Sprite } from "../Sprite";
import { VoteForm } from "./VoteForm";
import type { DisputeResult, DisputeVote, Member } from "@/lib/types";

export interface Juror {
  member: Member;
  avatarUrl: string | null;
  vote: DisputeVote | null;
}

interface Props {
  disputeId: string;
  result: DisputeResult;
  defendant: Member;
  defendantAvatar: string | null;
  accuser: string; // a member's name, or "Juiz IA"
  byAi: boolean;
  jurors: Juror[];
  me: { isOwner: boolean; canVote: boolean; vote: DisputeVote | null; joinedLate: boolean };
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const RING = {
  guilty: "ring-fail",
  innocent: "ring-done",
  none: "ring-control/50",
};

/** The courtroom: judge's bench, the defendant in the middle, the jury around, the score and the verdict. */
export function Courtroom({ disputeId, result, defendant, defendantAvatar, accuser, byAi, jurors, me }: Props) {
  const open = result.status === "open";
  const defendantRing = result.status === "upheld" ? "border-fail" : result.status === "rejected" ? "border-done" : "border-warn";

  return (
    <section className="card relative overflow-hidden !p-0" data-testid="dispute" aria-labelledby="tribunal-title">
      {/* back wall: wood panels with the bench */}
      <div className="relative flex flex-col items-center bg-[repeating-linear-gradient(90deg,#4a2a12_0_2px,#5e3518_2px_22px,#55301a_22px_24px)] px-4 pt-3">
        <div className="flex w-full items-center justify-between">
          <h1 id="tribunal-title" className="pixel text-2xl font-bold uppercase text-fg [text-shadow:2px_2px_0_var(--color-hard-shadow)]">
            Tribunal
          </h1>
          <span
            className={`pixel rounded-sm border-2 px-2 text-sm uppercase ${
              open ? "border-warn bg-warn-bg text-warn" : result.status === "upheld" ? "border-fail bg-fail-bg text-fail" : "border-done bg-done-bg text-done"
            }`}
          >
            {open ? "Em votação" : "Encerrado"}
          </span>
        </div>
        <Sprite name="judgeBench" scale={3} className="-mb-3 -mt-6" />
        {byAi && <p className="pixel -mt-1 mb-2 text-sm uppercase text-accent">Juiz IA acusa</p>}
      </div>
      <div aria-hidden className="h-2 border-b-4 border-wood-dark bg-wood" />

      {/* the defendant */}
      <div className="flex flex-col items-center px-4 pt-5 text-center">
        <div className={`rounded-full border-4 p-1 ${defendantRing}`}>
          <Avatar name={defendant.display_name} url={defendantAvatar} size={88} />
        </div>
        <p className="pixel mt-2 text-sm uppercase text-muted">Réu</p>
        <p className="text-xl font-bold leading-6" data-testid="defendant">
          {defendant.display_name}
        </p>
        <p className="mt-1 text-sm text-muted">Acusado por {accuser}</p>
      </div>

      {/* score */}
      <div className="mx-4 mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-sm border-2 border-bevel-dark bg-bg px-3 py-2 text-center">
        <div>
          <p className="pixel tabular text-3xl font-bold leading-8 text-fail" data-testid="guilty-count">
            {result.yes}
          </p>
          <p className="pixel text-xs uppercase text-muted">Culpado</p>
        </div>
        <p className="pixel text-xl text-muted">×</p>
        <div>
          <p className="pixel tabular text-3xl font-bold leading-8 text-done" data-testid="innocent-count">
            {result.no}
          </p>
          <p className="pixel text-xs uppercase text-muted">Inocente</p>
        </div>
      </div>
      <p className="tabular mx-4 mt-2 text-center text-sm text-muted">
        Maioria: {result.majority} de {result.eligible} jurados.
        {open && ` Se ninguém chegar lá até ${when(result.closes_at)}, vence quem tiver mais votos; empate absolve.`}
      </p>

      {/* jury box */}
      <div className="mt-4 px-4">
        <p className="pixel mb-2 text-center text-sm uppercase text-muted">Júri</p>
        <ul className="flex flex-wrap justify-center gap-x-3 gap-y-3">
          {jurors.map(({ member, avatarUrl, vote }) => {
            const state = !vote ? "none" : vote.upheld ? "guilty" : "innocent";
            const Icon = state === "guilty" ? X : state === "innocent" ? Check : Minus;
            const word = state === "guilty" ? "culpado" : state === "innocent" ? "inocente" : "ainda não votou";
            return (
              <li key={member.user_id} className="flex w-16 flex-col items-center" data-juror={member.display_name} data-vote={state}>
                <div className="relative">
                  <div className={`rounded-full ring-2 ring-offset-2 ring-offset-surface ${RING[state]} ${state === "none" ? "opacity-60" : ""}`}>
                    <Avatar name={member.display_name} url={avatarUrl} size={40} />
                  </div>
                  <span
                    aria-hidden
                    className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-sm border-2 ${
                      state === "guilty" ? "border-fail bg-fail-bg text-fail" : state === "innocent" ? "border-done bg-done-bg text-done" : "border-divider bg-raised text-muted"
                    }`}
                  >
                    <Icon size={12} strokeWidth={3} />
                  </span>
                </div>
                <p className="mt-1.5 w-full truncate text-center text-xs">{member.display_name}</p>
                <p className="sr-only">{word}</p>
              </li>
            );
          })}
        </ul>
        <div aria-hidden className="mt-3 h-2 rounded-[1px] border-b-4 border-wood-dark bg-wood" />
      </div>

      {/* verdict or my vote */}
      <div className="p-4">
        {!open ? (
          <GavelStamp
            playKey={`verdict:${disputeId}`}
            tone={result.status === "upheld" ? "fail" : "done"}
            stamp={result.status === "upheld" ? "Condenado" : "Absolvido"}
            note={
              result.status === "upheld"
                ? "O júri decidiu: esta prova não conta e a meta deixa de valer."
                : "O júri decidiu: a prova continua valendo."
            }
            testId="verdict"
          />
        ) : me.vote ? (
          <p className="font-medium">
            Seu voto: <b className={me.vote.upheld ? "text-fail" : "text-done"}>{me.vote.upheld ? "culpado" : "inocente"}</b>.
          </p>
        ) : me.isOwner ? (
          <p className="text-sm text-muted">Você é o réu e não vota. Use a aba Provas para se defender.</p>
        ) : me.joinedLate ? (
          <p className="text-sm text-muted">Você entrou no grupo depois que este tribunal foi aberto e não vota.</p>
        ) : me.canVote ? (
          <VoteForm disputeId={disputeId} defendant={defendant.display_name} />
        ) : null}
      </div>
    </section>
  );
}
