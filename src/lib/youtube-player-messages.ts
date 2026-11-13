import { isPactusAppHostname } from "./isolated-static-host";

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const PLAYLIST_ID_PATTERN = /^PL[A-Za-z0-9_-]{8,}$/;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const PRODUCTION_PARENT_ORIGINS = new Set(["https://www.pactus.dev.br", "https://pactus.dev.br"]);

export type YouTubePlayerMessage =
  | { type: "ready" }
  | { type: "playlist"; videoOrder: string[]; videoTitles: Record<string, string> }
  | {
      type: "progress";
      videoOrder: string[];
      videoTitles: Record<string, string>;
      currentVideoId: string;
      currentTitle: string;
      currentIndex: number;
      currentSeconds: number;
      videoCount: number;
      completedVideoId?: string;
    }
  | { type: "state"; state: "PLAYING" | "PAUSED" | "ENDED" | "BUFFERING" | "CUED" }
  | { type: "error"; code: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isVideoOrder(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 600 && value.every((id) => typeof id === "string" && VIDEO_ID_PATTERN.test(id));
}

function isVideoTitles(value: unknown, order: string[]): value is Record<string, string> {
  if (!isRecord(value)) return false;
  const entries = Object.entries(value);
  return entries.length <= 600 && entries.every(([id, title]) =>
    order.includes(id) && typeof title === "string" && title.length <= 240,
  );
}

function isSafeOriginUrl(url: URL): boolean {
  return !url.username && !url.password && !url.search && !url.hash && (url.pathname === "/" || url.pathname === "");
}

/** Accept only small, typed data from the isolated player frame. */
export function isYouTubePlayerMessage(value: unknown): value is YouTubePlayerMessage {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (value.type === "ready") return true;
  if (value.type === "playlist") {
    return isVideoOrder(value.videoOrder) && isVideoTitles(value.videoTitles, value.videoOrder);
  }
  if (value.type === "state") {
    return ["PLAYING", "PAUSED", "ENDED", "BUFFERING", "CUED"].includes(String(value.state));
  }
  if (value.type === "error") {
    return Number.isInteger(value.code) && Number(value.code) >= 0 && Number(value.code) <= 1000;
  }
  if (value.type !== "progress") return false;
  const order = value.videoOrder;
  return isVideoOrder(order)
    && isVideoTitles(value.videoTitles, order)
    && typeof value.currentVideoId === "string"
    && (!value.currentVideoId || VIDEO_ID_PATTERN.test(value.currentVideoId))
    && typeof value.currentTitle === "string"
    && value.currentTitle.length <= 240
    && Number.isInteger(value.currentIndex)
    && Number(value.currentIndex) >= 0
    && Number(value.currentIndex) < 600
    && Number.isInteger(value.currentSeconds)
    && Number(value.currentSeconds) >= 0
    && Number(value.currentSeconds) <= 86400
    && Number.isInteger(value.videoCount)
    && Number(value.videoCount) >= 0
    && Number(value.videoCount) <= 600
    && (value.completedVideoId === undefined
      || (typeof value.completedVideoId === "string" && VIDEO_ID_PATTERN.test(value.completedVideoId) && order.includes(value.completedVideoId)));
}

export function resolveIsolatedHostOrigin(raw: string | undefined, appOrigin: string, development = false): string | null {
  if (!raw) return null;
  try {
    const player = new URL(raw);
    const app = new URL(appOrigin);
    if (!isSafeOriginUrl(player) || !isSafeOriginUrl(app) || !isAllowedIsolatedParentOrigin(app.origin, development)) return null;
    const playerHostname = player.hostname.toLowerCase();
    const appHostname = app.hostname.toLowerCase();
    if (isPactusAppHostname(playerHostname) || playerHostname === appHostname || playerHostname.endsWith(`.${appHostname}`)) return null;
    const localDevelopment = development && LOCAL_HOSTS.has(player.hostname);
    if (player.protocol !== "https:" && !(localDevelopment && player.protocol === "http:")) return null;
    if (player.hostname.toLowerCase() === app.hostname.toLowerCase()) return null;
    return player.origin;
  } catch {
    return null;
  }
}

/** The static isolated host only sends user progress to the canonical app domains or local development. */
export function isAllowedIsolatedParentOrigin(raw: string, development = false): boolean {
  try {
    const parent = new URL(raw);
    if (!isSafeOriginUrl(parent)) return false;
    if (PRODUCTION_PARENT_ORIGINS.has(parent.origin)) return true;
    return development && parent.protocol === "http:" && LOCAL_HOSTS.has(parent.hostname);
  } catch {
    return false;
  }
}

export function buildDirectYouTubePlaylistUrl(playlistId: string, index: number, seconds: number): string {
  if (!PLAYLIST_ID_PATTERN.test(playlistId)) throw new Error("Invalid YouTube playlist");
  const safeIndex = Number.isFinite(index) ? Math.max(0, Math.min(599, Math.floor(index))) : 0;
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.min(86400, Math.floor(seconds))) : 0;
  const url = new URL("https://www.youtube-nocookie.com/embed/videoseries");
  url.searchParams.set("list", playlistId);
  url.searchParams.set("index", String(safeIndex));
  if (safeSeconds > 0) url.searchParams.set("start", String(safeSeconds));
  url.searchParams.set("playsinline", "1");
  url.searchParams.set("rel", "0");
  return url.toString();
}

export function buildIsolatedYouTubePlayerUrl(
  playerOrigin: string,
  playlistId: string,
  parentOrigin: string,
  index: number,
  seconds: number,
): string {
  if (!PLAYLIST_ID_PATTERN.test(playlistId)) throw new Error("Invalid YouTube playlist");
  const origin = new URL(playerOrigin);
  const parent = new URL(parentOrigin);
  const localOrigin = origin.protocol === "http:" && LOCAL_HOSTS.has(origin.hostname);
  const originHostname = origin.hostname.toLowerCase();
  const parentHostname = parent.hostname.toLowerCase();
  if (isPactusAppHostname(originHostname) || originHostname === parentHostname || originHostname.endsWith(`.${parentHostname}`)
    || parentHostname.endsWith(`.${originHostname}`) || (!localOrigin && origin.protocol !== "https:") || !isSafeOriginUrl(origin) || !isSafeOriginUrl(parent)
    || !isAllowedIsolatedParentOrigin(parent.origin, localOrigin)) {
    throw new Error("The isolated player must use a safe HTTPS origin and an approved parent");
  }
  if (parent.origin === origin.origin || parent.hostname.toLowerCase() === origin.hostname.toLowerCase()) {
    throw new Error("The isolated player must use a different hostname from the app");
  }
  const url = new URL("/youtube-player.html", origin.origin);
  url.searchParams.set("playlist", playlistId);
  url.searchParams.set("parent", parent.origin);
  url.searchParams.set("index", String(Number.isFinite(index) ? Math.max(0, Math.min(599, Math.floor(index))) : 0));
  url.searchParams.set("start", String(Number.isFinite(seconds) ? Math.max(0, Math.min(86400, Math.floor(seconds))) : 0));
  return url.toString();
}

export function manualPlaylistVideoId(index: number): string {
  const safeIndex = Number.isFinite(index) ? Math.max(0, Math.min(599, Math.floor(index))) : 0;
  return `pactus${String(safeIndex + 1).padStart(5, "0")}`;
}

/** What the person reads for a YouTube IFrame API error code (player isolado). */
export function youtubeErrorMessage(code: number): string {
  if (code === 153) {
    return "O YouTube não identificou de qual site vem o player (erro 153). Recarregue a página; se continuar, abra a playlist direto no YouTube.";
  }
  if (code === 900) {
    return "Este navegador não conseguiu falar com o YouTube: a rede, um firewall (comum em empresa) ou um bloqueador impediu. O app está funcionando; tente em outra rede ou abra a playlist direto no YouTube.";
  }
  if (code === 100) return "Este vídeo foi removido ou é privado. Abra a playlist no YouTube para seguir com a próxima aula.";
  if (code === 101 || code === 150) return "O dono deste vídeo não permite reprodução dentro de outros sites. Abra a playlist no YouTube.";
  if (code === 2) return "O YouTube recusou o pedido do player. Recarregue a página e tente de novo.";
  if (code === 5) return "Este vídeo não toca no player HTML5 deste navegador. Tente outro navegador ou abra no YouTube.";
  return "O player isolado não conseguiu carregar. Tente abrir a playlist no YouTube.";
}
