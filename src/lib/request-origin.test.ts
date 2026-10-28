import { describe, expect, it } from "vitest";
import { trustedMutationOrigin } from "./request-origin";

describe("cookie mutation origin", () => {
  it.each([
    ["https://pactus.example", true],
    ["https://pactus.example.evil.test", false],
    ["https://evil.pactus.example", false],
    ["http://pactus.example", false],
    ["https://pactus.example:444", false],
    ["null", false],
  ])("origin %s is accepted: %s", (origin, allowed) => {
    expect(trustedMutationOrigin(new Request("https://pactus.example/api/membership", { headers: { origin } }))).toBe(allowed);
  });
  it("rejects a cross-site browser request that omitted Origin", () => {
    expect(trustedMutationOrigin(new Request("https://pactus.example/api/membership", { headers: { "sec-fetch-site": "cross-site" } }))).toBe(false);
  });
  it("allows clients without browser origin headers", () => {
    expect(trustedMutationOrigin(new Request("https://pactus.example/api/membership"))).toBe(true);
  });
});
