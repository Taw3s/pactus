import { describe, expect, it } from "vitest";
import {
  youtubeErrorMessage,
  buildDirectYouTubePlaylistUrl,
  buildIsolatedYouTubePlayerUrl,
  isAllowedIsolatedParentOrigin,
  isYouTubePlayerMessage,
  manualPlaylistVideoId,
  resolveIsolatedHostOrigin,
} from "./youtube-player-messages";

const playlistId = "PLHz_AreHm4dkZ9-atkcmcBaMZdmLHft8n";

describe("isolated YouTube player boundaries", () => {
  it("accepts a dedicated HTTPS hostname and refuses the app host, paths and non-HTTPS production URLs", () => {
    expect(resolveIsolatedHostOrigin("https://player.pactus.example", "https://www.pactus.dev.br")).toBe("https://player.pactus.example");
    expect(resolveIsolatedHostOrigin("https://www.pactus.dev.br", "https://www.pactus.dev.br")).toBeNull();
    expect(resolveIsolatedHostOrigin("https://runner.pactus.dev.br", "https://www.pactus.dev.br")).toBeNull();
    expect(resolveIsolatedHostOrigin("https://player.pactus.example/player", "https://www.pactus.dev.br")).toBeNull();
    expect(resolveIsolatedHostOrigin("http://player.pactus.example", "https://www.pactus.dev.br")).toBeNull();
    expect(resolveIsolatedHostOrigin("ftp://localhost", "http://localhost:3000", true)).toBeNull();
    expect(resolveIsolatedHostOrigin("http://127.0.0.1:3001", "http://localhost:3000", true)).toBe("http://127.0.0.1:3001");
    expect(resolveIsolatedHostOrigin("https://player.pactus.example", "https://pactus-preview.vercel.app")).toBeNull();
  });

  it("only lets the canonical Pacto domains and local development receive player progress", () => {
    expect(isAllowedIsolatedParentOrigin("https://www.pactus.dev.br")).toBe(true);
    expect(isAllowedIsolatedParentOrigin("https://pactus.dev.br")).toBe(true);
    expect(isAllowedIsolatedParentOrigin("https://attacker.example")).toBe(false);
    expect(isAllowedIsolatedParentOrigin("https://www.pactus.dev.br.evil.example")).toBe(false);
    expect(isAllowedIsolatedParentOrigin("http://localhost:3000", true)).toBe(true);
    expect(isAllowedIsolatedParentOrigin("http://localhost:3000")).toBe(false);
    expect(isAllowedIsolatedParentOrigin("https://www.pactus.dev.br/path")).toBe(false);
  });

  it("builds a cross-origin player URL with bounded start values", () => {
    const url = new URL(buildIsolatedYouTubePlayerUrl("https://player.pactus.example", playlistId, "https://www.pactus.dev.br", 700, 99999));
    expect(url.origin).toBe("https://player.pactus.example");
    expect(url.pathname).toBe("/youtube-player.html");
    expect(url.searchParams.get("playlist")).toBe(playlistId);
    expect(url.searchParams.get("parent")).toBe("https://www.pactus.dev.br");
    expect(url.searchParams.get("index")).toBe("599");
    expect(url.searchParams.get("start")).toBe("86400");
    expect(() => buildIsolatedYouTubePlayerUrl("http://localhost", playlistId, "https://pactus.dev.br", 0, 0)).not.toThrow();
    expect(() => buildIsolatedYouTubePlayerUrl("ftp://localhost", playlistId, "https://pactus.dev.br", 0, 0)).toThrow();
    expect(() => buildIsolatedYouTubePlayerUrl("https://runner.pactus.dev.br", playlistId, "https://pactus.dev.br", 0, 0)).toThrow();
  });

  it("keeps the safe fallback as a direct no-cookie embed without the IFrame API", () => {
    const url = new URL(buildDirectYouTubePlaylistUrl(playlistId, 3, 20));
    expect(url.origin).toBe("https://www.youtube-nocookie.com");
    expect(url.searchParams.get("list")).toBe(playlistId);
    expect(url.searchParams.get("index")).toBe("3");
    expect(url.searchParams.get("start")).toBe("20");
    expect(url.searchParams.has("enablejsapi")).toBe(false);
    expect(url.searchParams.has("origin")).toBe(false);
    expect(new URL(buildDirectYouTubePlaylistUrl(playlistId, Number.NaN, Number.NaN)).searchParams.get("index")).toBe("0");
  });

  it("accepts bounded progress messages and rejects malformed or oversized payloads", () => {
    const video = "abcdefghijk";
    const safe = {
      type: "progress",
      videoOrder: [video],
      videoTitles: { [video]: "Uma aula" },
      currentVideoId: video,
      currentTitle: "Uma aula",
      currentIndex: 0,
      currentSeconds: 12,
      videoCount: 1,
    };
    expect(isYouTubePlayerMessage(safe)).toBe(true);
    expect(isYouTubePlayerMessage({ ...safe, currentSeconds: 86401 })).toBe(false);
    expect(isYouTubePlayerMessage({ ...safe, videoTitles: { [video]: "x".repeat(241) } })).toBe(false);
    expect(isYouTubePlayerMessage({ ...safe, videoOrder: ["invalid"] })).toBe(false);
    expect(isYouTubePlayerMessage({ ...safe, completedVideoId: "zzzzzzzzzzz" })).toBe(false);
    expect(isYouTubePlayerMessage({ ...safe, completedVideoId: video })).toBe(true);
  });

  it("uses a stable app-owned identifier for manually tracked playlist positions", () => {
    expect(manualPlaylistVideoId(0)).toBe("pactus00001");
    expect(manualPlaylistVideoId(599)).toBe("pactus00600");
    expect(manualPlaylistVideoId(-1)).toBe("pactus00001");
    expect(manualPlaylistVideoId(999)).toBe("pactus00600");
  });
});

describe("youtubeErrorMessage", () => {
  it("explains error 153 (missing Referer) and the embed refusals", async () => {
    const { youtubeErrorMessage } = await import("./youtube-player-messages");
    expect(youtubeErrorMessage(153)).toMatch(/153/);
    expect(youtubeErrorMessage(150)).toMatch(/não permite/);
    expect(youtubeErrorMessage(101)).toBe(youtubeErrorMessage(150));
    expect(youtubeErrorMessage(999)).toMatch(/não conseguiu carregar/);
  });
  it("tells a network or firewall block apart from a YouTube error", () => {
    expect(youtubeErrorMessage(900)).toMatch(/firewall/);
    expect(youtubeErrorMessage(900)).not.toMatch(/player isolado/);
  });
});
