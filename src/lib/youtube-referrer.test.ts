import fs from "node:fs";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

// YouTube answers error 153 to an embed that sends no Referer. The player path must send the origin (never the path),
// while the global policy and the code runner keep their own policies. These checks keep no-referrer from coming back.
const read = (file: string) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");

describe("YouTube player Referer (error 153)", () => {
  it("sets strict-origin-when-cross-origin on the player route and no-referrer only on the code runner", async () => {
    const rules = await nextConfig.headers!();
    const policy = (source: string) => rules.find((r) => r.source === source)?.headers.find((h) => h.key === "Referrer-Policy")?.value;
    expect(policy("/youtube-player.html")).toBe("strict-origin-when-cross-origin");
    expect(policy("/playground-runner.html")).toBe("no-referrer");
    const global = rules.find((r) => r.source.startsWith("/((?!youtube-player"));
    expect(global?.headers.find((h) => h.key === "Referrer-Policy")?.value).toBe("strict-origin-when-cross-origin");
  });

  it("keeps the player page and its iframe from suppressing the Referer", () => {
    expect(read("public/youtube-player.html")).toMatch(/<meta name="referrer" content="strict-origin-when-cross-origin">/);
    const screen = read("src/components/VideoLessonsScreen.tsx");
    expect(screen).toContain('referrerPolicy="strict-origin-when-cross-origin"');
    expect(screen).not.toMatch(/referrerPolicy="no-referrer"/);
  });
});
