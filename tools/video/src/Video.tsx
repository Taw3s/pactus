// The presentation video, as approved by Astra (brief of 28/10/2026): 43 s with the support card (Apoia-se, 16:9)
// and 38 s without it (WhatsApp, 9:16). Each format is laid out on its own, never cropped from the other.
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { Between, Brand, C, Format, PIXEL, Shot, shotMeta, shotSize, Sprite, StepIn, Text, judgeScale, useFonts } from "./parts";

export const FPS = 30;
const s = (sec: number) => Math.round(sec * FPS);
// Scene starts in seconds (the brief's table).
const T = { room: 0, proof: 4, goals: 8, court: 18, debt: 25, end: 32, support: 38, total: 43 };
export const DURATION = { support: s(T.total), plain: s(T.support) };

export function Presentation({ format, support }: { format: Format; support: boolean }) {
  useFonts();
  const scene = (from: number, to: number, el: React.ReactNode) => (
    <Sequence from={s(from)} durationInFrames={s(to - from)}>
      {el}
    </Sequence>
  );
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {scene(T.room, T.proof, <Room f={format} think={false} />)}
      {scene(T.proof, T.goals, <Room f={format} think />)}
      {scene(T.goals, T.court, <Goals f={format} />)}
      {scene(T.court, T.debt, <Court f={format} />)}
      {scene(T.debt, T.end, <Debt f={format} />)}
      {scene(T.end, T.support, <End f={format} />)}
      {support && scene(T.support, T.total, <Support f={format} />)}
    </AbsoluteFill>
  );
}

const useSize = () => {
  const { width, height } = useVideoConfig();
  return { W: width, H: height };
};
const room = (f: Format) => (f === "h" ? "room-desktop" : "room-phone");

/** Scenes 1–2: the judge's room of the presentation page. Then a proof (folder) steps onto his bench. */
function Room({ f, think }: { f: Format; think: boolean }) {
  const { W, H } = useSize();
  const id = room(f);
  const k = judgeScale(id, 192);
  const { w, h } = shotSize(id, k);
  const x = f === "h" ? W - 160 - w : Math.round((W - w) / 2);
  const y = f === "h" ? Math.round((H - h) / 2) : H - 220 - h;
  const j = shotMeta(id).judge!;
  return (
    <AbsoluteFill>
      <Brand x={f === "h" ? 120 : 96} y={f === "h" ? 100 : 140} />
      {/* idle: one small glance a second in; think: loops while he reads */}
      <Shot id={id} scale={k} x={x} y={y} judge={think ? { action: "think" } : { action: "idle", start: s(1.2) }} />
      {think && (
        <StepIn start={s(0.8)}>
          <Sprite name="evidenceFolder" px={144} x={x + j.x * k + 192 + 24} y={y + j.y * k + 96} />
        </StepIn>
      )}
      <Text f={f} x={f === "h" ? 120 : 96} y={f === "h" ? 420 : 380} w={f === "h" ? W - w - 160 - 240 : W - 192}>
        {think ? "No Pacto, compromisso vem com prova." : "Seu grupo combina. Todo mundo cumpre."}
      </Text>
    </AbsoluteFill>
  );
}

const GOALS = ["study", "typing", "reading"] as const;
const LABEL = { study: "Estudo", typing: "Digitação", reading: "Leitura" };

/** Scene 3: the three real proofs one by one, then the day's seal (the judge stamps the three together). */
function Goals({ f }: { f: Format }) {
  const { W, H } = useSize();
  const seal = s(6.5);
  return (
    <AbsoluteFill>
      <Between to={seal}>
        <Text f={f} x={f === "h" ? 120 : 96} y={f === "h" ? 90 : 140} w={W - 240}>
          Estudo. Digitação. Leitura.
        </Text>
        {f === "h" ? <GoalsRow W={W} H={H} /> : <GoalsOneByOne W={W} H={H} />}
      </Between>
      <Between from={seal}>
        <SealScene f={f} W={W} H={H} />
      </Between>
    </AbsoluteFill>
  );
}

function GoalsRow({ W, H }: { W: number; H: number }) {
  // Three cards of equal weight side by side, at the size of the widest that fits.
  const gap = 48;
  const colW = Math.floor((W - 240 - 2 * gap) / 3);
  const top = 230;
  return (
    <>
      {GOALS.map((g, i) => {
        const id = `today-${g}` as const;
        const k = Math.min(colW / shotMeta(id).width, (H - top - 80) / shotMeta(id).height);
        const { w } = shotSize(id, k);
        return (
          <StepIn key={g} start={s(0.4 + i * 1.6)}>
            <Shot id={id} scale={k} x={120 + i * (colW + gap) + (colW - w) / 2} y={top} />
          </StepIn>
        );
      })}
    </>
  );
}

function GoalsOneByOne({ W, H }: { W: number; H: number }) {
  // One card at a time across the width, with the three labels as a small sequence above it.
  const each = s(2);
  return (
    <>
      <div style={{ position: "absolute", left: 96, top: 360, display: "flex", gap: 32 }}>
        {GOALS.map((g, i) => (
          <Between key={g} from={s(0.4) + i * each}>
            <span style={{ fontFamily: PIXEL, fontSize: 48, lineHeight: "56px", color: C.accent, textTransform: "uppercase" }}>{LABEL[g]}</span>
          </Between>
        ))}
      </div>
      {GOALS.map((g, i) => {
        const id = `today-${g}` as const;
        const k = Math.min((W - 192) / shotMeta(id).width, (H - 560) / shotMeta(id).height);
        return (
          <Between key={g} from={s(0.4) + i * each} to={i < 2 ? s(0.4) + (i + 1) * each : undefined}>
            <StepIn start={s(0.4) + i * each}>
              <Shot id={id} scale={k} x={96} y={480} />
            </StepIn>
          </Between>
        );
      })}
    </>
  );
}

function SealScene({ f, W, H }: { f: Format; W: number; H: number }) {
  const id = "today-verified";
  const k = judgeScale(id, 192);
  const { w, h } = shotSize(id, k);
  return (
    <>
      <Shot id={id} scale={k} x={(W - w) / 2} y={f === "h" ? (H - h) / 2 - 40 : 760} judge={{ action: "stamp", start: s(0.3) }} />
      <Text f={f} x={f === "h" ? 120 : 96} y={f === "h" ? H - 190 : 1480} w={W - (f === "h" ? 240 : 192)} align="center">
        Até 23:59 · horário de São Paulo
      </Text>
    </>
  );
}

/** Scene 4: another proof goes to the tribunal. The judge presents it; people vote; the gavel only after the result. */
function Court({ f }: { f: Format }) {
  const { W, H } = useSize();
  const states = [
    { id: "tribunal-open", from: 0 },
    { id: "tribunal-vote1", from: s(2) },
    { id: "tribunal-vote2", from: s(3.4) },
    { id: "tribunal-verdict", from: s(4.8) },
  ] as const;
  const k = judgeScale("tribunal-open", f === "h" ? 144 : 192);
  const { w, h } = shotSize("tribunal-open", k);
  const x = f === "h" ? W - 160 - w : (W - w) / 2;
  const y = f === "h" ? Math.max(40, (H - h) / 2) : 520;
  return (
    <AbsoluteFill>
      {states.map((st, i) => (
        <Between key={st.id} from={st.from} to={states[i + 1]?.from}>
          <Shot
            id={st.id}
            scale={judgeScale(st.id, f === "h" ? 144 : 192)}
            x={x}
            y={y}
            judge={st.id === "tribunal-verdict" ? { action: "gavel", start: st.from + s(0.2) } : { action: "present", start: s(0.3) }}
          />
        </Between>
      ))}
      <Text f={f} x={f === "h" ? 120 : 96} y={f === "h" ? 420 : 200} w={f === "h" ? x - 240 : W - 192}>
        A IA confere. O grupo decide.
      </Text>
    </AbsoluteFill>
  );
}

/** Scene 5: Bruno's debt, pending; one item is registered as received and only it becomes a receipt. */
function Debt({ f }: { f: Format }) {
  const { W, H } = useSize();
  const paid = s(3.6);
  const box = f === "h" ? { w: 760, h: H - 160 } : { w: W - 192, h: 1100 };
  const k = Math.min(box.w / shotMeta("debt-received").width, box.h / shotMeta("debt-received").height);
  const x = f === "h" ? W - 160 - box.w : 96;
  const y = f === "h" ? 80 : 640;
  return (
    <AbsoluteFill>
      <Between to={paid}>
        <Shot id="debt-pending" scale={k} x={x} y={y} />
        <Text f={f} x={f === "h" ? 120 : 96} y={f === "h" ? 360 : 200} w={f === "h" ? x - 240 : W - 192}>
          Não cumpriu? Deve o combinado ao grupo.
        </Text>
      </Between>
      <Between from={paid}>
        <Shot id="debt-received" scale={k} x={x} y={y} />
        <Text f={f} x={f === "h" ? 120 : 96} y={f === "h" ? 360 : 200} w={f === "h" ? x - 240 : W - 192}>
          Recebeu? Registre no app.
        </Text>
      </Between>
      <Text f={f} kind="aux" color={C.muted} x={f === "h" ? 120 : 96} y={f === "h" ? 600 : 440} w={f === "h" ? x - 240 : W - 192}>
        O grupo escolhe o cardápio. O app não cobra dinheiro.
      </Text>
    </AbsoluteFill>
  );
}

/** Scene 6: back to the judge and the brand; the address stays still and large. */
function End({ f }: { f: Format }) {
  const { W, H } = useSize();
  const id = room(f);
  const k = judgeScale(id, f === "h" ? 144 : 192);
  const { w, h } = shotSize(id, k);
  return (
    <AbsoluteFill>
      <Brand x={f === "h" ? 120 : 96} y={f === "h" ? 100 : 140} />
      <Shot id={id} scale={k} x={f === "h" ? W - 160 - w : (W - w) / 2} y={f === "h" ? (H - h) / 2 : 1000} judge={{ action: "idle", start: s(2) }} />
      <Text f={f} x={f === "h" ? 120 : 96} y={f === "h" ? 380 : 400} w={f === "h" ? W - w - 400 : W - 192}>
        Crie um desafio ou entre com um convite.
      </Text>
      <Text f={f} kind="address" color={C.accent} x={f === "h" ? 120 : 96} y={f === "h" ? 620 : 700} w={f === "h" ? W - w - 400 : W - 192}>
        pactus.dev.br
      </Text>
    </AbsoluteFill>
  );
}

/** Apoia-se only: a plain card with the support page's identity. No new reward or character. */
function Support({ f }: { f: Format }) {
  const { W } = useSize();
  const x = f === "h" ? 240 : 96;
  const w = W - 2 * x;
  return (
    <AbsoluteFill>
      <Brand x={x} y={f === "h" ? 150 : 300} px={96} />
      <Text f={f} x={x} y={f === "h" ? 360 : 600} w={w}>
        Quer ajudar o Pacto a continuar?
      </Text>
      <Text f={f} kind="address" color={C.accent} x={x} y={f === "h" ? 520 : 840} w={w}>
        Apoie em pactus.dev.br/apoiar
      </Text>
      <Text f={f} kind="aux" color={C.muted} x={x} y={f === "h" ? 700 : 1100} w={w}>
        Apoio voluntário, sem vantagens no app.
      </Text>
    </AbsoluteFill>
  );
}
