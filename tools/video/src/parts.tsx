// Building blocks of the video: the judge played frame by frame, the app's screenshots, the step-in move and the texts.
// Everything depends only on the video frame (never on timers), so every export is identical.
import { useEffect, useState } from "react";
import { continueRender, delayRender, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { JUDGE, type JudgeAction } from "../../../src/lib/judge";
import meta from "../public/shots/meta.json";

export const C = {
  bg: "#26292e",
  raised: "#444951",
  fg: "#f5f1e6",
  muted: "#bdb7a8",
  accent: "#ffcd38",
  folder: "#7a2e3a",
  divider: "#3a3e45",
};
export const INTER = '"Inter Variable", "Inter", sans-serif';
export const PIXEL = '"Pacto Digits", "Pixelify Sans", sans-serif';

/** Holds the render until the fonts are in (text never shows in a fallback face). */
export function useFonts() {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    document.fonts.ready.then(() => continueRender(handle));
  }, [handle]);
}

const sec = (ms: number, fps: number) => (ms ? Math.max(1, Math.round((ms * fps) / 1000)) : 0);

/** The judge's frame `t` video frames after his move started: before it, the first pose; after it, the resting one. */
export function judgeFrame(action: JudgeAction, t: number, fps: number): string {
  const s = JUDGE[action];
  if (t < 0) return s.frames[0].id;
  const lengths = s.frames.map((f) => sec(f.ms, fps));
  const total = lengths.reduce((a, b) => a + b, 0);
  if (s.loop) t %= total;
  for (let i = 0, at = 0; i < lengths.length; at += lengths[i], i++) if (t < at + lengths[i]) return s.frames[i].id;
  return s.still;
}

/** Video frames from the start of the move to its impact (stamp or gavel hit). */
export function impactAt(action: JudgeAction, fps: number) {
  const s = JUDGE[action];
  return s.frames.slice(0, s.impact ?? 0).reduce((a, f) => a + sec(f.ms, fps), 0);
}

export function Sprite({ name, px, x, y, style }: { name: string; px: 48 | 96 | 144 | 192; x: number; y: number; style?: React.CSSProperties }) {
  return (
    <Img
      src={staticFile(`lowpoly/${name}.png`)}
      className="sprite"
      style={{ position: "absolute", left: Math.round(x), top: Math.round(y), width: px, height: px, ...style }}
    />
  );
}

/** The judge sprite playing `action` from local frame `start` (a loop plays from the scene's start). */
export function Judge({ action, start = 0, px, x, y }: { action: JudgeAction; start?: number; px: 96 | 144 | 192; x: number; y: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <Sprite name={`judge-${judgeFrame(action, frame - start, fps)}`} px={px} x={x} y={y} />;
}

type ShotId = keyof typeof meta;
interface ShotMeta {
  width: number;
  height: number;
  dpr: number;
  judge?: { x: number; y: number; size: number; frame: string | null };
}
export const shotMeta = (id: ShotId) => meta[id] as ShotMeta;

/** Scale (video px per CSS px) that puts the screenshot's judge at exactly `judgePx`. */
export const judgeScale = (id: ShotId, judgePx: 96 | 144 | 192) => judgePx / shotMeta(id).judge!.size;

/** Size of a shot drawn at `scale` video px per CSS px. */
export const shotSize = (id: ShotId, scale: number) => ({ w: Math.round(shotMeta(id).width * scale), h: Math.round(shotMeta(id).height * scale) });

/**
 * A screenshot of the real app at `scale`, top-left at (x, y). With `judge`, the still judge of the screenshot is
 * replaced by the animated one, at the same place and an exact sprite size.
 */
export function Shot({ id, scale, x, y, judge }: { id: ShotId; scale: number; x: number; y: number; judge?: { action: JudgeAction; start?: number } }) {
  const m = shotMeta(id);
  const { w, h } = shotSize(id, scale);
  const j = judge && m.judge;
  return (
    <div style={{ position: "absolute", left: Math.round(x), top: Math.round(y), width: w, height: h }}>
      <Img src={staticFile(`shots/${id}${j ? "-nojudge" : ""}.png`)} style={{ width: w, height: h, display: "block" }} />
      {j && <Judge action={judge.action} start={judge.start} px={Math.round(j.size * scale) as 96 | 144 | 192} x={j.x * scale} y={j.y * scale} />}
    </div>
  );
}

/** Entrance of a card: 6 frames, 24 px in three whole steps (the app's movement, not a glide). */
export function StepIn({ start = 0, children }: { start?: number; children: React.ReactNode }) {
  const t = useCurrentFrame() - start;
  if (t < 0) return null;
  const dy = 24 - 8 * Math.min(3, Math.floor(t / 2));
  return <div style={{ position: "absolute", inset: 0, transform: `translateY(${dy}px)` }}>{children}</div>;
}

/** Shown from local frame `from` to `to` (whole, no fade). */
export function Between({ from = 0, to = Infinity, children }: { from?: number; to?: number; children: React.ReactNode }) {
  const f = useCurrentFrame();
  return f >= from && f < to ? <>{children}</> : null;
}

export type Format = "h" | "v";
const TYPE = {
  h: { main: [64, 72], aux: [36, 46], address: [72, 80] },
  v: { main: [64, 76], aux: [40, 50], address: [64, 76] },
} as const;

export function Text({
  f,
  kind = "main",
  x,
  y,
  w,
  align = "left",
  color = C.fg,
  children,
}: {
  f: Format;
  kind?: keyof (typeof TYPE)["h"];
  x: number;
  y: number;
  w: number;
  align?: "left" | "center";
  color?: string;
  children: React.ReactNode;
}) {
  const [size, line] = TYPE[f][kind];
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        textAlign: align,
        fontFamily: INTER,
        fontWeight: kind === "aux" ? 400 : 600,
        fontSize: size,
        lineHeight: `${line}px`,
        color,
        textWrap: "balance",
      }}
    >
      {children}
    </div>
  );
}

/** The brand: the app icon and the name in the pixel type. */
export function Brand({ x, y, px = 96 }: { x: number; y: number; px?: 96 | 144 }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", gap: px / 4 }}>
      <Img src={staticFile("icons/icon-192.png")} style={{ width: px, height: px, borderRadius: px / 6 }} />
      <span style={{ fontFamily: PIXEL, fontWeight: 700, fontSize: px * 0.66, lineHeight: 1, color: C.fg, letterSpacing: 2 }}>PACTO</span>
    </div>
  );
}
