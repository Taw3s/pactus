import { describe, expect, it } from "vitest";
import { learningIsolationHeaders } from "./learning-isolation";

const CHROME = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const FIREFOX = "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0";

describe("learningIsolationHeaders", () => {
  it("isolates Chromium 110+ with COEP credentialless (keeps the YouTube player)", () => {
    expect(learningIsolationHeaders(CHROME, null)).toEqual({
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "credentialless",
      Vary: "User-Agent",
    });
  });
  it("leaves other browsers without isolation (Java says it needs Chrome or Edge)", () => {
    expect(learningIsolationHeaders(FIREFOX, null)).toEqual({ Vary: "User-Agent" });
    expect(learningIsolationHeaders(CHROME.replace("Chrome/131", "Chrome/109"), null)).toEqual({ Vary: "User-Agent" });
    expect(learningIsolationHeaders(null, null)).toEqual({ Vary: "User-Agent" });
  });
  it("keeps an existing Vary and never repeats User-Agent", () => {
    expect(learningIsolationHeaders(FIREFOX, "RSC, Accept").Vary).toBe("RSC, Accept, User-Agent");
    expect(learningIsolationHeaders(FIREFOX, "user-agent")).toEqual({});
  });
});
