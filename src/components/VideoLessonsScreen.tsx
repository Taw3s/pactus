"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronRight,
  CirclePlay,
  Clock3,
  ExternalLink,
  ListVideo,
  LoaderCircle,
  Play,
  Video,
} from "lucide-react";
import { LANGUAGE_CODE_EXAMPLES, type LanguageExampleId } from "@/lib/typing-language-examples";
import { VIDEO_METADATA_CACHE_KEY } from "@/lib/video-lessons-storage";
import { loadVideoProgress, saveVideoProgress, type VideoRow } from "@/lib/learning-progress";
import { createClient } from "@/lib/supabase/client";

type Difficulty = "Fácil" | "Intermediário" | "Difícil";
type DifficultyFilter = "Todas" | Difficulty;

type PlaylistCourse = {
  id: string;
  languageId: LanguageExampleId;
  playlistId: string;
  title: string;
  creator: string;
  difficulty: Difficulty;
  order: number;
  note: string;
  prerequisite?: string;
};

export type VideoCourseProgress = {
  videoOrder: string[];
  completedVideoIds: string[];
  videoTitles: Record<string, string>;
  currentVideoId: string;
  currentTitle: string;
  currentIndex: number;
  currentSeconds: number;
  updatedAt: number;
  /** Playlist size the server knows, so a new device shows the percentage before the player lists the videos. */
  videoCount: number;
};

type ProgressMap = Record<string, VideoCourseProgress>;

type YouTubePlayer = {
  destroy: () => void;
  cuePlaylist: (
    playlist: string[] | {
      listType: "playlist";
      list: string;
      index?: number;
      startSeconds?: number;
    },
    index?: number,
    startSeconds?: number,
  ) => void;
  playVideo: () => void;
  getPlaylist: () => string[];
  getPlaylistIndex: () => number;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  getVideoData: () => { video_id?: string; title?: string };
};

type YouTubeEvent = { target: YouTubePlayer; data: number };
type YouTubeApi = {
  Player: new (
    element: HTMLElement,
    options: {
      width: string;
      height: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady: (event: YouTubeEvent) => void;
        onStateChange: (event: YouTubeEvent) => void;
        onError: (event: { data: number }) => void;
      };
    },
  ) => YouTubePlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number; CUED: number };
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const COURSES: PlaylistCourse[] = [
  {
    id: "web-html-css",
    languageId: "web",
    playlistId: "PLHz_AreHm4dkZ9-atkcmcBaMZdmLHft8n",
    title: "HTML5 e CSS3 · Módulo 1",
    creator: "Curso em Vídeo · primeira etapa de cinco",
    difficulty: "Fácil",
    order: 1,
    note: "Comece pela estrutura das páginas e avance para a apresentação visual.",
  },
  {
    id: "python-basics",
    languageId: "python",
    playlistId: "PLvE-ZAFRgX8hnECDn1v9HNTI71veL3oW0",
    title: "Curso de Python",
    creator: "Curso em Vídeo",
    difficulty: "Fácil",
    order: 1,
    note: "Trilha inicial para conhecer a linguagem e praticar os primeiros programas.",
  },
  {
    id: "java-basics",
    languageId: "java",
    playlistId: "PLJH2yd19u4hzRtpzm2dDCWZx58UrE85ye",
    title: "Java · fundamentos",
    creator: "Gustavo Guanabara",
    difficulty: "Fácil",
    order: 1,
    note: "Siga a sequência original para construir a base antes de avançar para projetos.",
  },
  {
    id: "javascript-basics",
    languageId: "javascript",
    playlistId: "PLhkO7OMKgT_rRK3qvJsZAy3jrkupOxD_h",
    title: "Curso de JavaScript",
    creator: "Playlist do YouTube",
    difficulty: "Fácil",
    order: 1,
    note: "Faça esta trilha primeiro para entender variáveis, decisões, repetições e funções.",
  },
  {
    id: "typescript-node",
    languageId: "typescript",
    playlistId: "PL9tY_tDo_Q0DOAzTaPnWYsryfNLsz1K6U",
    title: "TypeScript com Node.js",
    creator: "Rincko Dev",
    difficulty: "Intermediário",
    order: 1,
    prerequisite: "Recomendado: concluir primeiro o curso de JavaScript.",
    note: "Depois da base de JavaScript, estude tipos e sua aplicação em projetos Node.js.",
  },
  {
    id: "sql-databases",
    languageId: "sql",
    playlistId: "PLHz_AreHm4dkBs-795Dsgvau_ekxg8g1r",
    title: "Banco de Dados com MySQL",
    creator: "Curso em Vídeo",
    difficulty: "Fácil",
    order: 1,
    note: "Primeira etapa de SQL: entenda bancos, tabelas e os comandos essenciais.",
  },
  {
    id: "sql-complete",
    languageId: "sql",
    playlistId: "PLbIBj8vQhvm2WT-pjGS5x7zUzmh4VgvRk",
    title: "SQL com MySQL · curso completo",
    creator: "Otávio Miranda",
    difficulty: "Intermediário",
    order: 2,
    prerequisite: "Faça depois de Banco de Dados com MySQL para aproveitar melhor a sequência.",
    note: "Continuação com consultas e operações mais completas. Mantenha a ordem original da playlist.",
  },
  {
    id: "bash-basics",
    languageId: "bash",
    playlistId: "PLXoSGejyuQGpf4X-NdGjvSlEFZhn2f2H7",
    title: "Curso básico de Bash",
    creator: "Blau Araújo",
    difficulty: "Fácil",
    order: 1,
    note: "Trilha em português para aprender a usar o shell e escrever seus primeiros comandos.",
  },
  {
    id: "bash-scripting-linux",
    languageId: "bash",
    playlistId: "PLT98CRl2KxKGj-VKtApD8-zCqSaN2mD4w",
    title: "Bash Scripting on Linux",
    creator: "Learn Linux TV · aulas em inglês",
    difficulty: "Difícil",
    order: 2,
    prerequisite: "Faça depois do curso básico de Bash; esta trilha está em inglês.",
    note: "Aprofundamento em scripts para Linux. A classificação difícil é uma orientação de sequência.",
  },
];

const COURSE_BY_ID = new Map(COURSES.map((course) => [course.id, course]));
const LANGUAGE_OPTIONS: { id: "todas" | LanguageExampleId; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "web", label: "HTML/CSS" },
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "sql", label: "SQL" },
  { id: "bash", label: "Bash" },
];
const DIFFICULTY_OPTIONS: DifficultyFilter[] = ["Todas", "Fácil", "Intermediário", "Difícil"];
const MAX_TRACKED_VIDEOS = 600;

let youtubeApiPromise: Promise<YouTubeApi> | null = null;

function loadYouTubeApi(): Promise<YouTubeApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("O player só abre no navegador."));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("O YouTube demorou para carregar. Confira sua conexão e tente novamente.")), 20000);
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try { previousCallback?.(); } catch { /* não interrompe o carregamento do player */ }
      window.clearTimeout(timeout);
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("A API de vídeo do YouTube não ficou disponível."));
    };

    let script = document.querySelector<HTMLScriptElement>("script[data-pactus-youtube-api]");
    if (!script) {
      script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.dataset.pactusYoutubeApi = "true";
      script.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error("Não foi possível conectar ao YouTube. Use o botão para abrir a playlist no site."));
      };
      document.head.appendChild(script);
    }
  });

  return youtubeApiPromise;
}

function emptyProgress(): VideoCourseProgress {
  return {
    videoOrder: [],
    completedVideoIds: [],
    videoTitles: {},
    currentVideoId: "",
    currentTitle: "",
    currentIndex: 0,
    currentSeconds: 0,
    updatedAt: 0,
    videoCount: 0,
  };
}

// Only YouTube metadata (playlist order and titles) stays on the device, as a cache to draw the list before the player
// answers. What was watched and where to resume come from the account (learning_video_progress, 0033).
type MetadataCache = Record<string, { videoOrder: string[]; videoTitles: Record<string, string> }>;

function readMetadataCache(): MetadataCache {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(VIDEO_METADATA_CACHE_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: MetadataCache = {};
    for (const [courseId, raw] of Object.entries(parsed)) {
      if (!COURSE_BY_ID.has(courseId) || !raw || typeof raw !== "object") continue;
      const value = raw as Partial<MetadataCache[string]>;
      const titles: Record<string, string> = {};
      if (value.videoTitles && typeof value.videoTitles === "object") {
        for (const [id, title] of Object.entries(value.videoTitles)) if (typeof title === "string") titles[id] = title.slice(0, 240);
      }
      out[courseId] = {
        videoOrder: Array.isArray(value.videoOrder) ? value.videoOrder.filter((id): id is string => typeof id === "string").slice(0, MAX_TRACKED_VIDEOS) : [],
        videoTitles: titles,
      };
    }
    return out;
  } catch {
    return {};
  }
}

function writeMetadataCache(map: ProgressMap) {
  try {
    const cache: MetadataCache = {};
    for (const [courseId, p] of Object.entries(map)) cache[courseId] = { videoOrder: p.videoOrder, videoTitles: p.videoTitles };
    localStorage.setItem(VIDEO_METADATA_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* only a cache: the list comes back from the player */
  }
}

function fromServer(row: VideoRow | undefined, cache: MetadataCache[string] | undefined): VideoCourseProgress {
  return {
    ...emptyProgress(),
    videoOrder: cache?.videoOrder ?? [],
    videoTitles: cache?.videoTitles ?? {},
    completedVideoIds: row?.completed_video_ids ?? [],
    currentVideoId: row?.current_video_id ?? "",
    currentTitle: row?.current_video_id ? (cache?.videoTitles[row.current_video_id] ?? "") : "",
    currentIndex: row?.current_index ?? 0,
    currentSeconds: row?.current_seconds ?? 0,
    updatedAt: row ? Date.parse(row.updated_at) : 0,
    videoCount: row?.video_count ?? 0,
  };
}

function progressPercent(progress?: VideoCourseProgress) {
  const order = progress?.videoOrder ?? [];
  const total = order.length || progress?.videoCount || 0;
  if (!total) return 0;
  // Before the player lists the videos (a new device), count every video the account marked done.
  const done = order.length ? new Set((progress?.completedVideoIds ?? []).filter((id) => order.includes(id))).size : new Set(progress?.completedVideoIds ?? []).size;
  return Math.min(100, Math.round((done / total) * 100));
}

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = safe % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function difficultyClass(difficulty: Difficulty) {
  if (difficulty === "Fácil") return "border-emerald-500/50 bg-emerald-500/10 text-emerald-300";
  if (difficulty === "Intermediário") return "border-amber-500/50 bg-amber-500/10 text-amber-200";
  return "border-rose-500/50 bg-rose-500/10 text-rose-200";
}

function CoursePlayer({
  course,
  progress,
  onProgress,
}: {
  course: PlaylistCourse;
  progress: VideoCourseProgress;
  onProgress: (courseId: string, next: VideoCourseProgress) => void;
}) {
  const playerHost = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const progressRef = useRef(progress);
  const onProgressRef = useRef(onProgress);
  const playerId = `video-course-player-${useId().replace(/:/g, "")}`;
  const [playlistVideos, setPlaylistVideos] = useState<string[]>(progress.videoOrder);
  const playlistVideosRef = useRef(playlistVideos);
  const [currentVideoId, setCurrentVideoId] = useState(progress.currentVideoId);
  const [currentTitle, setCurrentTitle] = useState(progress.currentTitle);
  const [playerEnabled, setPlayerEnabled] = useState(false);
  const [playerMessage, setPlayerMessage] = useState("Conectando ao YouTube…");
  const [playerError, setPlayerError] = useState("");

  const connectPlayerFrame = useCallback((frame: HTMLIFrameElement | null) => {
    playerHost.current = frame;
    if (!frame) return;
    // Only Chromium implements credentialless iframes; Firefox gets no COEP header
    // from middleware and must not receive an unsupported embed attribute.
    if ("credentialless" in frame) frame.setAttribute("credentialless", "");
    const embedUrl = new URL("https://www.youtube-nocookie.com/embed/videoseries");
    embedUrl.searchParams.set("list", course.playlistId);
    embedUrl.searchParams.set("enablejsapi", "1");
    embedUrl.searchParams.set("origin", window.location.origin);
    embedUrl.searchParams.set("playsinline", "1");
    embedUrl.searchParams.set("rel", "0");
    frame.src = embedUrl.toString();
  }, [course.playlistId]);

  progressRef.current = progress;
  onProgressRef.current = onProgress;
  playlistVideosRef.current = playlistVideos;

  useEffect(() => {
    if (!playerEnabled) return;
    let cancelled = false;
    let player: YouTubePlayer | null = null;
    let saveTimer = 0;
    let listTimer = 0;
    let listAttempts = 0;
    let stableListSamples = 0;
    let lastListSignature = "";
    let playlistCueStartedAt = 0;

    const checkpoint = (completedVideoId?: string) => {
      if (!player) return;
      const previous = progressRef.current;
      const order = (player.getPlaylist?.() ?? previous.videoOrder).filter(Boolean).slice(0, MAX_TRACKED_VIDEOS);
      const playerIndex = player.getPlaylistIndex?.() ?? -1;
      const videoData = player.getVideoData?.() ?? {};
      const id = videoData.video_id || (playerIndex >= 0 ? order[playerIndex] : "") || previous.currentVideoId;
      if (!id && !order.length) return;
      const seconds = Number.isFinite(player.getCurrentTime?.())
        ? Math.max(0, Math.floor(player.getCurrentTime()))
        : previous.currentSeconds;
      const title = (videoData.title ?? "").trim().slice(0, 240);
      const completed = new Set(previous.completedVideoIds);
      if (completedVideoId) completed.add(completedVideoId);
      const index = playerIndex >= 0 ? playerIndex : Math.max(0, previous.currentIndex);
      const titles = { ...previous.videoTitles };
      if (id && title) titles[id] = title;
      const next: VideoCourseProgress = {
        videoOrder: order.length ? order : previous.videoOrder,
        completedVideoIds: [...completed].slice(0, MAX_TRACKED_VIDEOS),
        videoTitles: titles,
        currentVideoId: id,
        currentTitle: title || (id ? titles[id] ?? previous.currentTitle : previous.currentTitle),
        currentIndex: index,
        currentSeconds: completedVideoId ? Math.floor(player.getDuration?.() ?? seconds) : seconds,
        updatedAt: Date.now(),
        videoCount: order.length || previous.videoCount,
      };
      progressRef.current = next;
      setCurrentVideoId(next.currentVideoId);
      if (next.currentTitle) setCurrentTitle(next.currentTitle);
      if (order.length && order.length !== playlistVideosRef.current.length) {
        playlistVideosRef.current = order;
        setPlaylistVideos(order);
      }
      onProgressRef.current(course.id, next);
    };

    setPlayerError("");
    setPlayerMessage("Conectando ao YouTube…");
    loadYouTubeApi().then((api) => {
      if (cancelled || !playerHost.current) return;
      const saved = progressRef.current;
      const startIndex = Math.min(saved.currentIndex, Math.max(0, saved.videoOrder.length - 1));
      player = new api.Player(playerHost.current, {
        width: "100%",
        height: "100%",
        playerVars: {
          listType: "playlist",
          list: course.playlistId,
          index: startIndex,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            player = event.target;
            playerRef.current = event.target;
            playlistCueStartedAt = Date.now();
            event.target.cuePlaylist({
              listType: "playlist",
              list: course.playlistId,
              index: startIndex,
              startSeconds: saved.currentSeconds,
            });
            setPlayerMessage(saved.currentSeconds > 0 ? "Aula preparada no ponto em que você parou. Aperte reproduzir para continuar." : "Aulas carregadas. Escolha uma aula e aperte reproduzir.");
            listTimer = window.setInterval(() => {
              if (!player) return;
              listAttempts += 1;
              const order = player.getPlaylist?.() ?? [];
              if (order.length) {
                const limited = order.filter(Boolean).slice(0, MAX_TRACKED_VIDEOS);
                const signature = limited.join(",");
                stableListSamples = signature === lastListSignature ? stableListSamples + 1 : 1;
                lastListSignature = signature;
                // cuePlaylist loads asynchronously. Wait for its result to settle so an
                // early one-item response does not get mistaken for the entire playlist.
                if (stableListSamples >= 3 && Date.now() - playlistCueStartedAt >= 2000) {
                  playlistVideosRef.current = limited;
                  setPlaylistVideos(limited);
                  checkpoint();
                  window.clearInterval(listTimer);
                }
              }
              if (listAttempts >= 30 && stableListSamples < 3) {
                window.clearInterval(listTimer);
                setPlayerError("Não foi possível carregar a lista completa de aulas. Abra a playlist no YouTube e confira se ela está pública.");
              }
            }, 400);
            saveTimer = window.setInterval(() => checkpoint(), 5000);
          },
          onStateChange: (event) => {
            if (!api.PlayerState) return;
            if (event.data === api.PlayerState.ENDED) {
              const videoId = event.target.getVideoData?.().video_id || "";
              checkpoint(videoId || undefined);
              setPlayerMessage("Aula concluída. Seu progresso foi salvo.");
              return;
            }
            if (event.data === api.PlayerState.PLAYING) {
              const data = event.target.getVideoData?.();
              if (data?.video_id) setCurrentVideoId(data.video_id);
              if (data?.title) setCurrentTitle(data.title);
              setPlayerMessage("A posição da aula é salva automaticamente enquanto você assiste.");
              checkpoint();
            } else if (event.data === api.PlayerState.PAUSED) {
              checkpoint();
              setPlayerMessage("Aula pausada. Sua posição foi salva.");
            }
          },
          onError: (event) => {
            const message = event.data === 100 || event.data === 101 || event.data === 150
              ? "Esta aula está indisponível para reprodução incorporada. Abra a playlist no YouTube."
              : "O player do YouTube encontrou um erro. Tente abrir a playlist no site.";
            setPlayerError(message);
            setPlayerMessage("");
          },
        },
      });
    }).catch((error: unknown) => {
      if (!cancelled) setPlayerError(error instanceof Error ? error.message : "Não foi possível abrir o player.");
    });

    return () => {
      cancelled = true;
      window.clearInterval(saveTimer);
      window.clearInterval(listTimer);
      if (player) {
        checkpoint();
        if (playerRef.current === player) playerRef.current = null;
        player.destroy();
      }
    };
    // A player instance belongs to one playlist. Progress and callbacks are refreshed through refs.
  }, [course.id, course.playlistId, playerEnabled]);

  const visibleIds = playlistVideos.length ? playlistVideos : progress.videoOrder;
  const currentIndex = Math.max(0, visibleIds.indexOf(currentVideoId || progress.currentVideoId));
  const completedIds = new Set(progress.completedVideoIds);
  const percent = progressPercent(progress);

  function selectLesson(index: number) {
    const targetId = visibleIds[index];
    const resumeSeconds = targetId && targetId === progress.currentVideoId ? progress.currentSeconds : 0;
    playerRef.current?.cuePlaylist(visibleIds, index, resumeSeconds);
    setPlayerMessage(`Aula ${index + 1} preparada. Aperte reproduzir no player para começar.`);
  }

  function resume() {
    if (!playerRef.current) {
      setPlayerEnabled(true);
      setPlayerMessage("Conectando ao YouTube. Depois, use o botão de reprodução no próprio player.");
      return;
    }
    playerRef.current.playVideo();
  }

  function markCurrentComplete() {
    const id = currentVideoId || progress.currentVideoId || visibleIds[currentIndex];
    if (!id) return;
    const completed = new Set(progressRef.current.completedVideoIds);
    completed.add(id);
    const next = { ...progressRef.current, completedVideoIds: [...completed], updatedAt: Date.now() };
    progressRef.current = next;
    onProgressRef.current(course.id, next);
    setPlayerMessage("Aula marcada como concluída. Seu progresso foi salvo.");
  }

  return <div className="grid min-w-0 gap-4">
    <div className="min-w-0">
      <div className="overflow-hidden rounded-sm border-2 border-divider bg-black">
        {playerEnabled ? <iframe
          id={playerId}
          ref={connectPlayerFrame}
          title={`Aulas de ${course.title}`}
          className="aspect-video min-h-[200px] w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        /> : <div className="grid aspect-video min-h-[200px] place-items-center px-4 text-center text-white">
          <div><p className="text-sm font-semibold">A playlist será carregada pelo YouTube.</p><p className="mx-auto mt-2 max-w-md text-xs text-white/75">Ao carregar o player, o Google/YouTube recebe dados técnicos do navegador e da conexão conforme as políticas deles. O vídeo não começa sozinho.</p><button type="button" onClick={() => { setPlayerEnabled(true); setPlayerMessage("Conectando ao YouTube…"); }} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-sm border-2 border-white/60 px-3 text-sm font-semibold hover:bg-white/10"><Play size={15} /> Carregar player do YouTube</button></div>
        </div>}
      </div>
      <p className="mt-1 text-[10px] text-muted"><a className="underline underline-offset-2" href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">Termos do YouTube</a> · <a className="underline underline-offset-2" href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Privacidade do Google</a></p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="pixel truncate text-sm uppercase">{currentTitle || progress.currentTitle || "Escolha uma aula"}</p>
          <p className="mt-1 text-xs text-muted" role="status">{playerError || playerMessage}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={resume} className="inline-flex min-h-9 items-center gap-2 rounded-sm border-2 border-bevel-dark bg-accent px-3 text-xs font-semibold text-on-accent shadow-[2px_2px_0_var(--color-hard-shadow)]"><Play size={14} /> Retomar aula</button>
          <button type="button" onClick={markCurrentComplete} disabled={!currentVideoId && !progress.currentVideoId} className="inline-flex min-h-9 items-center gap-2 rounded-sm border-2 border-divider px-3 text-xs font-semibold text-fg hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"><Check size={14} /> Marcar concluída</button>
        </div>
      </div>
      <div className="mt-4 rounded-sm border-2 border-divider bg-bg p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold">Progresso deste curso</span>
          <span className="pixel text-accent">{percent}%</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-sm border border-divider bg-surface" role="progressbar" aria-label={`Progresso de ${course.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
          <div className="h-full bg-accent transition-[width]" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-muted">
          {visibleIds.length
            ? `${new Set(progress.completedVideoIds.filter((id) => visibleIds.includes(id))).size} de ${visibleIds.length} aulas concluídas.`
            : "A lista e o total de aulas aparecem quando o YouTube carregar."}
          {progress.currentSeconds > 0 && ` Última posição: aula ${progress.currentIndex + 1}, ${formatTime(progress.currentSeconds)}.`}
        </p>
      </div>
      <p className="mt-3 text-[11px] text-muted">Assista até o fim para registrar a aula automaticamente. A posição atual é salva na sua conta enquanto você assiste. O percentual conta aulas concluídas.</p>
    </div>

    <aside className="min-w-0 rounded-sm border-2 border-divider bg-bg p-3" aria-label="Aulas da playlist">
      <div className="flex items-center justify-between gap-2">
        <div><p className="pixel text-xs uppercase text-muted">Ordem da playlist</p><h3 className="pixel mt-1 text-sm uppercase">Aulas</h3></div>
        <span className="rounded-sm border border-divider px-2 py-1 text-[11px] text-muted">{visibleIds.length || "…"}</span>
      </div>
      {visibleIds.length ? <ol className="mt-3 max-h-[440px] space-y-1 overflow-y-auto pr-1">
        {visibleIds.map((videoId, index) => {
          const complete = completedIds.has(videoId);
          const selected = index === currentIndex;
          const label = progress.videoTitles[videoId] || (videoId === currentVideoId ? currentTitle : "") || `Aula ${String(index + 1).padStart(2, "0")}`;
          return <li key={`${videoId}-${index}`}>
            <button type="button" onClick={() => selectLesson(index)} aria-current={selected ? "true" : undefined} className={`flex min-h-11 w-full items-center gap-2 rounded-sm border px-2 py-2 text-left text-xs ${selected ? "border-accent bg-raised text-fg" : "border-transparent text-muted hover:border-divider hover:bg-surface"}`}>
              <span className={`grid size-6 shrink-0 place-items-center rounded-sm border text-[10px] ${complete ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300" : "border-divider"}`}>{complete ? <Check size={13} /> : index + 1}</span>
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {selected && <CirclePlay size={15} className="shrink-0 text-accent" />}
            </button>
          </li>;
        })}
      </ol> : <div className="mt-3 grid min-h-36 place-items-center rounded-sm border border-dashed border-divider px-4 text-center">
        <div><LoaderCircle size={22} className="mx-auto animate-spin text-accent" /><p className="mt-2 text-xs text-muted">Carregando a lista de aulas…</p></div>
      </div>}
      <a className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-sm border border-divider px-3 text-xs text-accent hover:bg-raised" href={`https://www.youtube.com/playlist?list=${encodeURIComponent(course.playlistId)}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Abrir no YouTube</a>
    </aside>
  </div>;
}

export function VideoLessonsScreen() {
  const [progress, setProgress] = useState<ProgressMap>({});
  const progressRef = useRef<ProgressMap>({});
  const [ready, setReady] = useState(false);
  const [activeCourseId, setActiveCourseId] = useState(COURSES[0].id);
  const [languageFilter, setLanguageFilter] = useState<"todas" | LanguageExampleId>("todas");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("Todas");
  const [storageNotice, setStorageNotice] = useState("");

  // What was saved to the server, per course: completions go up at once, the position at most every 15 s.
  const sentRef = useRef<Record<string, { done: number; at: number }>>({});
  const pendingRef = useRef<Record<string, number>>({});

  useEffect(() => {
    let live = true;
    const cache = readMetadataCache();
    loadVideoProgress(createClient())
      .then((rows) => {
        if (!live) return;
        const byCourse = new Map(rows.map((r) => [r.course_id, r]));
        const saved: ProgressMap = {};
        for (const course of COURSES) {
          if (byCourse.has(course.id) || cache[course.id]) saved[course.id] = fromServer(byCourse.get(course.id), cache[course.id]);
          const row = byCourse.get(course.id);
          if (row) sentRef.current[course.id] = { done: row.completed_video_ids.length, at: Date.now() };
        }
        progressRef.current = saved;
        setProgress(saved);
        const mostRecentCourse = rows.filter((r) => COURSE_BY_ID.has(r.course_id)).sort((l, r) => Date.parse(r.updated_at) - Date.parse(l.updated_at))[0]?.course_id;
        if (mostRecentCourse) setActiveCourseId(mostRecentCourse);
      })
      .catch(() => live && setStorageNotice("Não foi possível carregar o seu progresso nos cursos. Recarregue a página para tentar de novo."))
      .finally(() => live && setReady(true));
    const timers = pendingRef.current;
    return () => {
      live = false;
      for (const t of Object.values(timers)) window.clearTimeout(t);
    };
  }, []);

  async function pushToServer(courseId: string) {
    const p = progressRef.current[courseId];
    if (!p) return;
    try {
      const merged = await saveVideoProgress(createClient(), courseId, {
        completed: p.completedVideoIds,
        currentId: p.currentVideoId,
        index: p.currentIndex,
        seconds: p.currentSeconds,
        count: p.videoOrder.length || p.videoCount,
      });
      sentRef.current[courseId] = { done: merged.length, at: Date.now() };
      // Another device may have finished other videos: show the union the server keeps.
      const current = progressRef.current[courseId];
      if (current && merged.some((id) => !current.completedVideoIds.includes(id))) {
        const updated = { ...progressRef.current, [courseId]: { ...current, completedVideoIds: merged } };
        progressRef.current = updated;
        setProgress(updated);
      }
      setStorageNotice("");
    } catch {
      setStorageNotice("Não foi possível salvar o progresso na sua conta. Ele será enviado de novo na próxima atualização do player.");
    }
  }

  function saveCourseProgress(courseId: string, next: VideoCourseProgress) {
    const updated = { ...progressRef.current, [courseId]: next };
    progressRef.current = updated;
    setProgress(updated);
    writeMetadataCache(updated);
    const sent = sentRef.current[courseId];
    const newCompletion = next.completedVideoIds.length > (sent?.done ?? 0);
    window.clearTimeout(pendingRef.current[courseId]);
    if (newCompletion || !sent || Date.now() - sent.at >= 15_000) void pushToServer(courseId);
    else pendingRef.current[courseId] = window.setTimeout(() => void pushToServer(courseId), 15_000 - (Date.now() - sent.at));
  }

  function pickLanguage(language: "todas" | LanguageExampleId) {
    let nextCourses = COURSES.filter((course) => (language === "todas" || course.languageId === language)
      && (difficultyFilter === "Todas" || course.difficulty === difficultyFilter));
    setLanguageFilter(language);
    if (!nextCourses.length) {
      setDifficultyFilter("Todas");
      nextCourses = COURSES.filter((course) => language === "todas" || course.languageId === language);
    }
    if (nextCourses.length && !nextCourses.some((course) => course.id === activeCourseId)) {
      setActiveCourseId(nextCourses[0].id);
    }
  }

  function pickDifficulty(difficulty: DifficultyFilter) {
    let nextCourses = COURSES.filter((course) => (languageFilter === "todas" || course.languageId === languageFilter)
      && (difficulty === "Todas" || course.difficulty === difficulty));
    setDifficultyFilter(difficulty);
    if (!nextCourses.length) {
      setLanguageFilter("todas");
      nextCourses = COURSES.filter((course) => difficulty === "Todas" || course.difficulty === difficulty);
    }
    if (nextCourses.length && !nextCourses.some((course) => course.id === activeCourseId)) {
      setActiveCourseId(nextCourses[0].id);
    }
  }

  const courses = COURSES.filter((course) => (languageFilter === "todas" || course.languageId === languageFilter)
    && (difficultyFilter === "Todas" || course.difficulty === difficultyFilter));
  const activeCourse = COURSES.find((course) => course.id === activeCourseId) ?? COURSES[0];
  const activeProgress = progress[activeCourse.id] ?? emptyProgress();
  const totalCompleted = COURSES.filter((course) => progressPercent(progress[course.id]) === 100 && (progress[course.id]?.videoOrder.length ?? 0) > 0).length;
  const coursesStarted = COURSES.filter((course) => (progress[course.id]?.currentTitle ?? "") || (progress[course.id]?.completedVideoIds.length ?? 0) > 0).length;

  return <>
    <header className="mb-5">
      <p className="pixel text-xs uppercase text-muted">Biblioteca de estudo</p>
      <h1 className="pixel mt-1 break-words text-[32px] font-bold uppercase leading-9">Cursos em vídeo</h1>
      <p className="mt-2 max-w-4xl text-sm text-muted">Playlists gratuitas do YouTube, organizadas por linguagem e dificuldade. Escolha um curso, assista às aulas na ordem e continue de onde parou, em qualquer aparelho: as aulas concluídas e a posição ficam na sua conta. A lista e os vídeos vêm do YouTube.</p>
      {storageNotice && <p className="mt-3 rounded-sm border border-pending/60 bg-warn-bg px-3 py-2 text-xs" role="status">{storageNotice}</p>}
    </header>

    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      <div className="rounded-sm border-2 border-divider bg-surface p-3"><p className="pixel text-[10px] uppercase text-muted">Playlists organizadas</p><p className="mt-1 text-xl font-bold">{COURSES.length}</p></div>
      <div className="rounded-sm border-2 border-divider bg-surface p-3"><p className="pixel text-[10px] uppercase text-muted">Cursos iniciados</p><p className="mt-1 text-xl font-bold">{coursesStarted}</p></div>
      <div className="rounded-sm border-2 border-divider bg-surface p-3"><p className="pixel text-[10px] uppercase text-muted">Cursos concluídos</p><p className="mt-1 text-xl font-bold">{totalCompleted}</p></div>
    </div>

    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(230px,0.62fr)_minmax(0,2fr)]">
      <aside className="card min-w-0 self-start" aria-label="Catálogo de cursos">
        <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-sm border border-accent/50 bg-bg text-accent"><BookOpen size={18} /></span><div><p className="pixel text-[10px] uppercase text-muted">Trilhas</p><h2 className="pixel text-sm uppercase">Escolha um curso</h2></div></div>

        <label className="mt-4 block text-xs font-semibold text-muted" htmlFor="video-language-filter">Linguagem
          <select id="video-language-filter" className="mt-1 min-h-10 w-full rounded-sm border-2 border-divider bg-bg px-3 text-sm text-fg focus:border-accent focus:outline-none" value={languageFilter} onChange={(event) => pickLanguage(event.target.value as "todas" | LanguageExampleId)}>
            {LANGUAGE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>

        <p className="mt-3 text-xs font-semibold text-muted">Nível recomendado</p>
        <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
          {DIFFICULTY_OPTIONS.map((difficulty) => <button key={difficulty} type="button" onClick={() => pickDifficulty(difficulty)} aria-pressed={difficultyFilter === difficulty} className={`min-h-8 rounded-sm border px-2 text-[10px] font-semibold ${difficultyFilter === difficulty ? "border-accent bg-raised text-accent" : "border-divider text-muted hover:border-accent/60"}`}>{difficulty}</button>)}
        </div>

        <div className="mt-4 space-y-2">
          {courses.length ? courses.map((course) => {
            const saved = progress[course.id] ?? emptyProgress();
            const percent = progressPercent(saved);
            const selected = course.id === activeCourseId;
            const language = LANGUAGE_CODE_EXAMPLES.find((example) => example.id === course.languageId)?.label.pt ?? course.languageId;
            const hasSavedPosition = saved.currentSeconds > 0 || saved.completedVideoIds.length > 0 || Boolean(saved.currentTitle);
            return <button key={course.id} type="button" onClick={() => setActiveCourseId(course.id)} aria-current={selected ? "true" : undefined} className={`w-full rounded-sm border-2 p-3 text-left transition-colors ${selected ? "border-accent bg-raised" : "border-divider bg-bg hover:border-accent/60"}`}>
              <div className="flex items-start justify-between gap-2"><div className="min-w-0"><span className="pixel text-[9px] uppercase text-muted">{language} · etapa {course.order}</span><p className="mt-1 text-sm font-semibold leading-snug">{course.title}</p></div><ChevronRight size={16} className={`mt-1 shrink-0 ${selected ? "text-accent" : "text-muted"}`} /></div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5"><span className={`rounded-sm border px-2 py-0.5 text-[10px] ${difficultyClass(course.difficulty)}`}>{course.difficulty}</span><span className="text-[10px] text-muted">{percent}%</span>{hasSavedPosition && <span className="inline-flex items-center gap-1 text-[10px] text-muted"><Clock3 size={11} /> salvo</span>}</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-sm bg-surface"><div className="h-full bg-accent" style={{ width: `${percent}%` }} /></div>
            </button>;
          }) : <p className="rounded-sm border border-dashed border-divider px-3 py-5 text-center text-xs text-muted">Nenhuma playlist neste filtro. Escolha outro nível ou linguagem.</p>}
        </div>
        <p className="mt-3 text-[10px] text-muted">A dificuldade organiza a sequência do curso; as aulas continuam na ordem definida por cada playlist.</p>
      </aside>

      <section className="card min-w-0">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1"><p className="pixel text-[10px] uppercase text-muted">{LANGUAGE_CODE_EXAMPLES.find((example) => example.id === activeCourse.languageId)?.label.pt} · etapa {activeCourse.order}</p><h2 className="pixel mt-1 break-words text-lg uppercase">{activeCourse.title}</h2><p className="mt-1 text-xs text-muted">{activeCourse.creator}</p></div>
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-sm border px-2 py-1 text-[10px] ${difficultyClass(activeCourse.difficulty)}`}><ListVideo size={13} /> {activeCourse.difficulty}</span>
        </div>
        <p className="mb-2 text-sm text-muted">{activeCourse.note}</p>
        {activeCourse.prerequisite && <p className="mb-4 rounded-sm border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">{activeCourse.prerequisite}</p>}
        {!activeCourse.prerequisite && <p className="mb-4 text-[11px] text-muted">Comece pela primeira aula e avance na ordem da lista.</p>}
        {ready && <CoursePlayer key={activeCourse.id} course={activeCourse} progress={activeProgress} onProgress={saveCourseProgress} />}
      </section>
    </div>

    <p className="mt-4 rounded-sm border border-divider bg-bg p-3 text-[11px] text-muted"><Video size={14} className="mr-1 inline-block text-accent" />As playlists pertencem aos canais do YouTube. Se uma aula bloquear a reprodução dentro do laboratório, use “Abrir no YouTube”; o progresso local continua disponível para você marcar as aulas concluídas.</p>
  </>;
}
