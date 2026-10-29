import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
vi.mock("server-only", () => ({}));
import { removeGroupMedia, removeUserMedia, retryPendingMediaCleanup } from "./membership";

const list = vi.fn(), remove = vi.fn();
const acknowledge = vi.fn(), jobs = vi.fn();
const admin = {
  storage: { from: () => ({ list, remove }) },
  from: () => ({ delete: () => ({ eq: acknowledge, like: acknowledge }), select: () => ({ order: () => ({ limit: jobs }) }) }),
} as unknown as SupabaseClient;
beforeEach(() => { vi.resetAllMocks(); remove.mockResolvedValue({ error: null }); acknowledge.mockResolvedValue({ error: null }); });

describe("private media deletion", () => {
  it("removes nested files as well as flat photos", async () => {
    const tree: Record<string, { id: string | null; name: string }[]> = {
      "g/u": [{ id: "flat", name: "flat.jpg" }, { id: null, name: "nested" }],
      "g/u/nested": [{ id: null, name: "deeper" }],
      "g/u/nested/deeper": [{ id: "photo", name: "private.jpg" }],
    };
    list.mockImplementation(async (prefix: string) => ({ error: null, data: tree[prefix] ?? [] }));
    await removeUserMedia(admin, "g", "u");
    expect(remove.mock.calls.flat(2)).toEqual(expect.arrayContaining(["g/u/flat.jpg", "g/u/nested/deeper/private.jpg"]));
    expect(remove.mock.calls.flat(2)).not.toContain("g/u/nested");
  });

  it("deletes all group pages, including a member beyond the first page", async () => {
    const pending = Array.from({ length: 1001 }, (_, i) => `user-${i}`);
    list.mockImplementation(async (prefix: string) => ({ error: null, data: prefix === "g"
      ? pending.slice(0, 1000).map(name => ({ id: null, name }))
      : [{ id: "photo", name: "photo.jpg" }] }));
    remove.mockImplementation(async ([path]: string[]) => {
      pending.splice(pending.indexOf(path.split("/")[1]), 1);
      return { error: null };
    });
    await removeGroupMedia(admin, "g");
    expect(pending).toHaveLength(0);
    expect(remove).toHaveBeenCalledWith(["g/user-1000/photo.jpg"]);
  });

  it("does not report success when storage listing fails", async () => {
    list.mockResolvedValue({ data: null, error: { message: "offline" } });
    await expect(removeUserMedia(admin, "g", "u")).rejects.toThrow();
    expect(acknowledge).not.toHaveBeenCalled();
  });

  it("does not report success when deletion fails", async () => {
    list.mockResolvedValue({ data: [{ id: "p", name: "photo.jpg" }], error: null });
    remove.mockResolvedValue({ error: { message: "offline" } });
    await expect(removeUserMedia(admin, "g", "u")).rejects.toThrow();
    expect(acknowledge).not.toHaveBeenCalled();
  });
  it("retains a failed job and still processes the next one", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    jobs.mockResolvedValue({ data: [{ prefix: "g/failed" }, { prefix: "g/success" }], error: null });
    list.mockImplementation(async (prefix: string) => prefix === "g/failed" ? { data: null, error: { message: "offline" } } : { data: [], error: null });
    try {
      expect(await retryPendingMediaCleanup(admin)).toBe(1);
      expect(acknowledge).toHaveBeenCalledOnce();
      expect(acknowledge).toHaveBeenCalledWith("prefix", "g/success");
    } finally { log.mockRestore(); }
  });
});
