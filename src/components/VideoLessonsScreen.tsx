"use client";

import { useEffect, useRef, useState } from "react";
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
import { buildDirectYouTubePlaylistUrl, buildIsolatedYouTubePlayerUrl, isYouTubePlayerMessage, manualPlaylistVideoId, resolveIsolatedHostOrigin } from "@/lib/youtube-player-messages";

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
  const progressRef = useRef(progress);
  const onProgressRef = useRef(onProgress);
  const [playlistVideos, setPlaylistVideos] = useState(progress.videoOrder);
  const [currentVideoId, setCurrentVideoId] = useState(progress.currentVideoId);
  const [currentTitle, setCurrentTitle] = useState(progress.currentTitle);
  const [selectedIndex, setSelectedIndex] = useState(progress.currentIndex);
  const [manualLessonNumber, setManualLessonNumber] = useState(String(progress.currentIndex + 1));
  const [manualLessonCount, setManualLessonCount] = useState(String(progress.videoCount || progress.videoOrder.length || ""));
  const [playerEnabled, setPlayerEnabled] = useState(false);
  const [playerOrigin, setPlayerOrigin] = useState<string | null>(null);
  const [playerSource, setPlayerSource] = useState("");
  const [playerReady, setPlayerReady] = useState(false);
  const [playerMessage, setPlayerMessage] = useState("O player só carrega quando você pedir.");
  const [playerError, setPlayerError] = useState("");

  progressRef.current = progress;
  onProgressRef.current = onProgress;

  useEffect(() => {
    if (!playerEnabled || !playerOrigin) return;
    const frame = playerHost.current;
    const frameWindow = frame?.contentWindow;
    if (!frameWindow) return;

    function receiveMessage(event: MessageEvent<unknown>) {
      if (event.source !== frameWindow || event.origin !== playerOrigin || !isYouTubePlayerMessage(event.data)) return;
      const message = event.data;
      if (message.type === "ready") {
        setPlayerReady(true);
        setPlayerError("");
        setPlayerMessage("Player isolado conectado. O YouTube não recebe acesso à sessão do Pacto.");
        return;
      }
      if (message.type === "error") {
        setPlayerError(message.code === 100 || message.code === 101 || message.code === 150
          ? "Esta aula não permite reprodução incorporada. Abra a playlist no YouTube."
          : "O player isolado não conseguiu carregar. Tente abrir a playlist no YouTube.");
        return;
      }
      if (message.type === "state") {
        if (message.state === "PLAYING") setPlayerMessage("A posição e as aulas concluídas são salvas automaticamente.");
        else if (message.state === "PAUSED") setPlayerMessage("Aula pausada. Sua posição foi salva.");
        else if (message.state === "ENDED") setPlayerMessage("Aula concluída. Seu progresso foi salvo.");
        return;
      }

      const previous = progressRef.current;
      if (message.type === "playlist") {
        setPlaylistVideos(message.videoOrder);
        const next = { ...previous, videoOrder: message.videoOrder, videoTitles: message.videoTitles, videoCount: message.videoOrder.length };
        onProgressRef.current(course.id, next);
        return;
      }

      const completed = new Set(previous.completedVideoIds);
      if (message.completedVideoId) completed.add(message.completedVideoId);
      const next: VideoCourseProgress = {
        ...previous,
        videoOrder: message.videoOrder.length ? message.videoOrder : previous.videoOrder,
        videoTitles: { ...previous.videoTitles, ...message.videoTitles },
        completedVideoIds: [...completed].slice(0, MAX_TRACKED_VIDEOS),
        currentVideoId: message.currentVideoId || previous.currentVideoId,
        currentTitle: message.currentTitle || previous.currentTitle,
        currentIndex: message.currentIndex,
        currentSeconds: message.currentSeconds,
        videoCount: message.videoCount || previous.videoCount,
        updatedAt: Date.now(),
      };
      setCurrentVideoId(next.currentVideoId);
      setCurrentTitle(next.currentTitle);
      setSelectedIndex(next.currentIndex);
      setManualLessonNumber(String(next.currentIndex + 1));
      onProgressRef.current(course.id, next);
    }

    window.addEventListener("message", receiveMessage);
    return () => window.removeEventListener("message", receiveMessage);
  }, [course.id, playerEnabled, playerOrigin]);

  const visibleIds = playlistVideos.length ? playlistVideos : progress.videoOrder;
  const currentIndex = visibleIds.length
    ? Math.max(0, visibleIds.indexOf(currentVideoId || progress.currentVideoId))
    : selectedIndex;
  const completedIds = new Set(progress.completedVideoIds);
  const percent = progressPercent(progress);
  const trackedDone = visibleIds.length
    ? new Set(progress.completedVideoIds.filter((id) => visibleIds.includes(id))).size
    : progress.completedVideoIds.length;
  const isolatedPlayerConfigured = Boolean(playerOrigin);

  function startPlayer() {
    const origin = typeof window === "undefined" ? null : resolveIsolatedHostOrigin(
      process.env.NEXT_PUBLIC_ISOLATED_ORIGIN,
      window.location.origin,
      process.env.NODE_ENV !== "production",
    );
    const index = Math.max(0, Math.min(599, progressRef.current.currentIndex));
    const seconds = Math.max(0, Math.min(86400, progressRef.current.currentSeconds));
    const source = origin
      ? buildIsolatedYouTubePlayerUrl(origin, course.playlistId, window.location.origin, index, seconds)
      : buildDirectYouTubePlaylistUrl(course.playlistId, index, seconds);
    setPlayerOrigin(origin);
    setPlayerSource(source);
    setPlayerEnabled(true);
    setPlayerReady(false);
    setPlayerError("");
    setPlayerMessage(origin
      ? "Carregando o player isolado…"
      : "Player direto aberto. Selecione o número da aula abaixo para registrar seu progresso.");
  }

  function moveToLesson(index: number) {
    if (!Number.isInteger(index) || index < 0 || index >= MAX_TRACKED_VIDEOS) {
      setPlayerMessage("Informe o número de uma aula entre 1 e 600.");
      return;
    }
    const safeIndex = Math.max(0, Math.min(599, Math.floor(index)));
    const knownOrder = playlistVideos.length ? playlistVideos : progressRef.current.videoOrder;
    const count = Number(manualLessonCount);
    const validCount = Number.isInteger(count) && count >= 1 && count <= MAX_TRACKED_VIDEOS ? count : 0;
    if (validCount && safeIndex >= validCount) {
      setPlayerMessage("O número da aula não pode ser maior que o total informado.");
      return;
    }
    const order = knownOrder.length
      ? knownOrder
      : validCount
        ? Array.from({ length: validCount }, (_, position) => manualPlaylistVideoId(position))
        : [];
    const id = order[safeIndex] ?? manualPlaylistVideoId(safeIndex);
    const titles = { ...progressRef.current.videoTitles };
    const title = titles[id] || (id.startsWith("pactus") ? `Aula ${String(safeIndex + 1).padStart(2, "0")}` : "");
    if (title) titles[id] = title;
    const next: VideoCourseProgress = {
      ...progressRef.current,
      videoOrder: order,
      videoTitles: titles,
      currentVideoId: id,
      currentTitle: title,
      currentIndex: safeIndex,
      currentSeconds: 0,
      videoCount: validCount || (order.length ? order.length : progressRef.current.videoCount),
      updatedAt: Date.now(),
    };
    progressRef.current = next;
    setSelectedIndex(safeIndex);
    setCurrentVideoId(id);
    setCurrentTitle(title);
    setManualLessonNumber(String(safeIndex + 1));
    onProgressRef.current(course.id, next);

    if (playerEnabled && playerOrigin && playerReady) {
      playerHost.current?.contentWindow?.postMessage({ type: "select", index: safeIndex, seconds: 0 }, playerOrigin);
      setPlayerMessage(`Aula ${safeIndex + 1} selecionada. O player carrega o início dela.`);
      return;
    }

    if (playerEnabled) {
      const source = playerOrigin
        ? buildIsolatedYouTubePlayerUrl(playerOrigin, course.playlistId, window.location.origin, safeIndex, 0)
        : buildDirectYouTubePlaylistUrl(course.playlistId, safeIndex, 0);
      setPlayerSource(source);
      setPlayerReady(false);
    }
    setPlayerMessage(`Aula ${safeIndex + 1} selecionada. Abra o player para assistir.`);
  }

  function selectLesson(index: number) {
    const id = visibleIds[index];
    const resumeSeconds = id && id === progressRef.current.currentVideoId ? progressRef.current.currentSeconds : 0;
    const safeIndex = Math.max(0, Math.min(599, index));
    if (resumeSeconds > 0) {
      const next = { ...progressRef.current, currentVideoId: id, currentIndex: safeIndex, currentSeconds: resumeSeconds, updatedAt: Date.now() };
      progressRef.current = next;
      setSelectedIndex(safeIndex);
      setCurrentVideoId(id);
      setCurrentTitle(next.videoTitles[id] ?? currentTitle);
      setManualLessonNumber(String(safeIndex + 1));
      onProgressRef.current(course.id, next);
      if (playerEnabled && playerOrigin && playerReady) {
        playerHost.current?.contentWindow?.postMessage({ type: "select", index: safeIndex, seconds: resumeSeconds }, playerOrigin);
      } else if (playerEnabled) {
        setPlayerSource(playerOrigin
          ? buildIsolatedYouTubePlayerUrl(playerOrigin, course.playlistId, window.location.origin, safeIndex, resumeSeconds)
          : buildDirectYouTubePlaylistUrl(course.playlistId, safeIndex, resumeSeconds));
        setPlayerReady(false);
      }
      return;
    }
    moveToLesson(safeIndex);
  }

  function resume() {
    if (!playerEnabled) {
      startPlayer();
      return;
    }
    if (playerOrigin && playerReady) {
      playerHost.current?.contentWindow?.postMessage({ type: "play" }, playerOrigin);
      setPlayerMessage("Use os controles do player para continuar.");
    } else if (!playerOrigin) {
      setPlayerSource(buildDirectYouTubePlaylistUrl(course.playlistId, currentIndex, progress.currentSeconds));
      setPlayerMessage("A playlist foi aberta no ponto salvo. O modo direto não acompanha o tempo automaticamente.");
    } else {
      setPlayerMessage("O player isolado ainda está conectando.");
    }
  }

  function markCurrentComplete() {
    const id = currentVideoId || progress.currentVideoId;
    if (!id) return;
    const completed = new Set(progressRef.current.completedVideoIds);
    completed.add(id);
    const next = { ...progressRef.current, completedVideoIds: [...completed].slice(0, MAX_TRACKED_VIDEOS), updatedAt: Date.now() };
    progressRef.current = next;
    onProgressRef.current(course.id, next);
    setPlayerMessage("Aula marcada como concluída. Seu progresso foi salvo.");
  }

  return <div className="grid min-w-0 gap-4">
    <div className="min-w-0">
      <div className="overflow-hidden rounded-sm border-2 border-divider bg-black">
        {playerEnabled ? <iframe
          ref={(frame) => {
            playerHost.current = frame;
            if (frame && "credentialless" in frame) frame.setAttribute("credentialless", "");
          }}
          title={`Aulas de ${course.title}`}
          src={playerSource}
          className="aspect-video min-h-[200px] w-full"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => {
            if (!playerOrigin) setPlayerMessage("Player direto carregado. O YouTube não informa ao Pacto qual aula você está assistindo.");
          }}
        /> : <div className="grid aspect-video min-h-[200px] place-items-center px-4 text-center text-white">
          <div><p className="text-sm font-semibold">A playlist será carregada pelo YouTube.</p><p className="mx-auto mt-2 max-w-md text-xs text-white/75">Ao carregar o player, o Google/YouTube recebe dados técnicos do navegador e da conexão conforme as políticas deles. O vídeo não começa sozinho.</p><button type="button" onClick={startPlayer} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-sm border-2 border-white/60 px-3 text-sm font-semibold hover:bg-white/10"><Play size={15} /> Carregar player do YouTube</button></div>
        </div>}
      </div>
      <p className="mt-1 text-[10px] text-muted"><a className="underline underline-offset-2" href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">Termos do YouTube</a> · <a className="underline underline-offset-2" href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Privacidade do Google</a></p>
      {playerEnabled && !isolatedPlayerConfigured && <div className="mt-3 rounded-sm border border-pending/60 bg-warn-bg p-3 text-xs text-muted">
        <p className="font-semibold text-fg">Modo direto do YouTube</p>
        <p className="mt-1">O Pacto não carrega a API do YouTube na página da sua conta. Nesse modo, o YouTube não informa automaticamente a aula nem o tempo assistido. Escolha o número da aula aqui e marque-a como concluída quando terminar.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <label className="block">Aula atual
            <input type="number" min={1} max={600} value={manualLessonNumber} onChange={(event) => setManualLessonNumber(event.target.value)} className="mt-1 min-h-9 w-full rounded-sm border border-divider bg-bg px-2 text-fg" />
          </label>
          <label className="block">Total de aulas (opcional)
            <input type="number" min={1} max={600} value={manualLessonCount} onChange={(event) => setManualLessonCount(event.target.value)} className="mt-1 min-h-9 w-full rounded-sm border border-divider bg-bg px-2 text-fg" />
          </label>
          <button type="button" onClick={() => moveToLesson(Number(manualLessonNumber) - 1)} className="mt-auto min-h-9 rounded-sm border border-divider px-3 font-semibold text-accent hover:bg-raised">Carregar aula</button>
        </div>
      </div>}
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
          <span className="pixel text-accent">{progress.videoOrder.length || progress.videoCount ? `${percent}%` : `${trackedDone} aula(s)`}</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-sm border border-divider bg-surface" role="progressbar" aria-label={`Progresso de ${course.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
          <div className="h-full bg-accent transition-[width]" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-muted">
          {visibleIds.length
            ? `${new Set(progress.completedVideoIds.filter((id) => visibleIds.includes(id))).size} de ${visibleIds.length} aulas concluídas.`
            : progress.videoCount
              ? `${trackedDone} de ${progress.videoCount} aulas concluídas.`
              : `${trackedDone} aula(s) concluída(s). Informe o total de aulas para ver o percentual.`}
          {progress.currentSeconds > 0 && ` Última posição salva: aula ${progress.currentIndex + 1}, ${formatTime(progress.currentSeconds)}.`}
        </p>
      </div>
      <p className="mt-3 text-[11px] text-muted">
        {isolatedPlayerConfigured
          ? "Assista até o fim para registrar a aula automaticamente. A posição atual é salva na sua conta."
          : "No modo direto, a conclusão e o número da aula são registrados quando você os informa. O tempo assistido não é enviado automaticamente."}
      </p>
    </div>

    <aside className="min-w-0 rounded-sm border-2 border-divider bg-bg p-3" aria-label="Aulas da playlist">
      <div className="flex items-center justify-between gap-2">
        <div><p className="pixel text-xs uppercase text-muted">Ordem da playlist</p><h3 className="pixel mt-1 text-sm uppercase">Aulas</h3></div>
        <span className="rounded-sm border border-divider px-2 py-1 text-[11px] text-muted">{visibleIds.length || progress.videoCount || "YouTube"}</span>
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
      </ol> : isolatedPlayerConfigured
        ? <div className="mt-3 grid min-h-36 place-items-center rounded-sm border border-dashed border-divider px-4 text-center">
          <div><LoaderCircle size={22} className="mx-auto animate-spin text-accent" /><p className="mt-2 text-xs text-muted">Carregando a lista de aulas…</p></div>
        </div>
        : <div className="mt-3 rounded-sm border border-dashed border-divider px-3 py-5 text-center text-xs text-muted">
          O modo direto não lê a lista do YouTube. Use os números das aulas no controle acima ou abra a playlist completa no YouTube.
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
  const totalCompleted = COURSES.filter((course) => progressPercent(progress[course.id]) === 100 && ((progress[course.id]?.videoOrder.length ?? 0) > 0 || (progress[course.id]?.videoCount ?? 0) > 0)).length;
  const coursesStarted = COURSES.filter((course) => (progress[course.id]?.currentTitle ?? "") || (progress[course.id]?.completedVideoIds.length ?? 0) > 0).length;

  return <>
    <header className="mb-5">
      <p className="pixel text-xs uppercase text-muted">Biblioteca de estudo</p>
      <h1 className="pixel mt-1 break-words text-[32px] font-bold uppercase leading-9">Cursos em vídeo</h1>
      <p className="mt-2 max-w-4xl text-sm text-muted">Playlists gratuitas do YouTube, organizadas por linguagem e dificuldade. Com o player isolado configurado, a lista, a posição e as aulas concluídas acompanham sua conta. Sem esse domínio, o player abre diretamente e o progresso é marcado manualmente.</p>
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

    <p className="mt-4 rounded-sm border border-divider bg-bg p-3 text-[11px] text-muted"><Video size={14} className="mr-1 inline-block text-accent" />As playlists pertencem aos canais do YouTube. Se uma aula bloquear a reprodução dentro do laboratório, use “Abrir no YouTube”. O Pacto só recebe a posição e as conclusões automaticamente quando o player está em um domínio isolado.</p>
  </>;
}
