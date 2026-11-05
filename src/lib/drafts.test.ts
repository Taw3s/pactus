import { describe, expect, it } from "vitest";
import { clearDraft, clearDrafts, DRAFT_PREFIX, draftKey, hasDraft, loadDraft, purgeDrafts, saveDraft, type DraftScope, type DraftStore } from "./drafts";

/** A Storage stand-in; `broken` makes every call throw (private mode, storage disabled). */
function store({ broken = false } = {}) {
  const map = new Map<string, string>();
  const fail = () => {
    throw new DOMException("blocked", "SecurityError");
  };
  const s: DraftStore & { map: Map<string, string> } = {
    map,
    getItem: (k) => (broken ? fail() : (map.get(k) ?? null)),
    setItem: (k, v) => (broken ? fail() : void map.set(k, v)),
    removeItem: (k) => (broken ? fail() : void map.delete(k)),
    key: (n) => (broken ? fail() : ([...map.keys()][n] ?? null)),
    get length() {
      return broken ? fail() : map.size;
    },
  };
  return s;
}

const ana: DraftScope = { userId: "u-ana", groupId: "g-1", day: "2026-11-05", goal: "study", mode: "first" };
const fields = { summary: "Uma resposta comprida o bastante.", minutes: "45", pages: "", title: "", projectUrl: "" };

describe("drafts: recovery", () => {
  it("brings back what was typed, per field", () => {
    const s = store();
    saveDraft(ana, fields, "p-1", s);
    expect(loadDraft(ana, "p-1", s)).toEqual({ summary: fields.summary, minutes: "45" });
  });

  it("keeps reading, project and extra sessions apart from the study proof", () => {
    const s = store();
    const reading = { ...ana, goal: "reading" as const };
    const project = { ...ana, goal: "project" as const };
    const extra = { ...ana, mode: "extra" as const };
    saveDraft(ana, fields, "p-1", s);
    saveDraft(reading, { pages: "12" }, null, s);
    saveDraft(project, { title: "Calculadora", projectUrl: "https://github.com/ana/calc" }, null, s);
    saveDraft(extra, { minutes: "20" }, null, s);
    expect(loadDraft(reading, null, s)).toEqual({ pages: "12" });
    expect(loadDraft(project, null, s)).toEqual({ title: "Calculadora", projectUrl: "https://github.com/ana/calc" });
    expect(loadDraft(extra, null, s)).toEqual({ minutes: "20" });
    expect(loadDraft({ ...ana, mode: "retake" }, "p-1", s)).toBeNull();
    expect(loadDraft(ana, "p-1", s)).toEqual({ summary: fields.summary, minutes: "45" });
  });

  it("drops the answer when the question of the day is another one", () => {
    const s = store();
    saveDraft(ana, fields, "p-1", s);
    expect(loadDraft(ana, "p-2", s)).toEqual({ minutes: "45" });
  });

  it("removes the draft when every field is emptied", () => {
    const s = store();
    saveDraft(ana, fields, "p-1", s);
    saveDraft(ana, { summary: "  ", minutes: "" }, "p-1", s);
    expect(s.map.size).toBe(0);
    expect(hasDraft(ana, "p-1", s)).toBe(false);
  });

  it("never fills a field beyond what the input accepts", () => {
    const s = store();
    s.setItem(draftKey(ana), JSON.stringify({ v: 1, ...ana, prompt: null, fields: { summary: "x".repeat(5000), minutes: "12a345", title: 7, photo: "data:image/png" } }));
    const d = loadDraft(ana, null, s)!;
    expect(d.summary).toHaveLength(2000);
    expect(d.minutes).toBe("1234");
    expect(d).not.toHaveProperty("title");
    expect(d).not.toHaveProperty("photo");
  });

  it("deletes an entry that does not parse or does not match its key", () => {
    const s = store();
    s.setItem(draftKey(ana), "{not json");
    expect(loadDraft(ana, null, s)).toBeNull();
    expect(s.map.size).toBe(0);
    // Bruno's draft written under Ana's key: never shown to Ana.
    s.setItem(draftKey(ana), JSON.stringify({ v: 1, ...ana, userId: "u-bruno", prompt: null, fields: { minutes: "30" } }));
    expect(loadDraft(ana, null, s)).toBeNull();
    expect(s.map.size).toBe(0);
  });
});

describe("drafts: isolation", () => {
  it("another account on the same device sees nothing, and the old account's drafts are dropped", () => {
    const s = store();
    saveDraft(ana, fields, "p-1", s);
    const bruno = { ...ana, userId: "u-bruno" };
    expect(loadDraft(bruno, "p-1", s)).toBeNull();
    expect(s.map.size).toBe(0);
  });

  it("another group of the same person starts empty", () => {
    const s = store();
    saveDraft(ana, fields, "p-1", s);
    expect(loadDraft({ ...ana, groupId: "g-2" }, "p-1", s)).toBeNull();
    expect(s.map.size).toBe(0);
  });

  it("yesterday's draft never comes back today", () => {
    const s = store();
    saveDraft({ ...ana, day: "2026-11-04" }, fields, "p-1", s);
    expect(loadDraft(ana, "p-1", s)).toBeNull();
    expect(s.map.size).toBe(0);
  });

  it("purging keeps every draft of this person, group and day", () => {
    const s = store();
    saveDraft(ana, fields, "p-1", s);
    saveDraft({ ...ana, goal: "reading" }, { pages: "3" }, null, s);
    saveDraft({ ...ana, day: "2026-11-04" }, fields, "p-1", s);
    purgeDrafts(ana, s);
    expect([...s.map.keys()].sort()).toEqual([draftKey(ana), draftKey({ ...ana, goal: "reading" })].sort());
  });

  it("leaves other keys of the site alone", () => {
    const s = store();
    s.setItem("pacto:first-steps:u-bruno:g-1", "{}");
    saveDraft({ ...ana, userId: "u-bruno" }, fields, "p-1", s);
    loadDraft(ana, "p-1", s);
    clearDrafts(s);
    expect([...s.map.keys()]).toEqual(["pacto:first-steps:u-bruno:g-1"]);
  });
});

describe("drafts: clearing", () => {
  it("a confirmed send clears only that form", () => {
    const s = store();
    const extra = { ...ana, mode: "extra" as const };
    saveDraft(ana, fields, "p-1", s);
    saveDraft(extra, { minutes: "20" }, null, s);
    clearDraft(ana, s);
    expect(loadDraft(ana, "p-1", s)).toBeNull();
    expect(loadDraft(extra, null, s)).toEqual({ minutes: "20" });
  });

  it("logout clears every draft on the device", () => {
    const s = store();
    saveDraft(ana, fields, "p-1", s);
    saveDraft({ ...ana, goal: "project" }, { title: "Calc" }, null, s);
    clearDrafts(s);
    expect([...s.map.keys()].filter((k) => k.startsWith(DRAFT_PREFIX))).toEqual([]);
  });
});

describe("drafts: storage unavailable", () => {
  it("blocked storage never throws and keeps the draft for the tab", () => {
    const s = store({ broken: true });
    expect(() => saveDraft(ana, fields, "p-1", s)).not.toThrow();
    expect(loadDraft(ana, "p-1", s)).toEqual({ summary: fields.summary, minutes: "45" });
    // Isolation and clearing still apply to the copy in memory.
    expect(loadDraft({ ...ana, userId: "u-bruno" }, "p-1", s)).toBeNull();
    expect(loadDraft(ana, "p-1", s)).toBeNull();
    saveDraft(ana, fields, "p-1", s);
    clearDrafts(s);
    expect(loadDraft(ana, "p-1", s)).toBeNull();
  });

  it("full storage drops the older stored copy and keeps the newer text in memory", () => {
    const s = store();
    saveDraft(ana, { minutes: "30" }, null, s);
    const full = Object.assign(s, {
      setItem: () => {
        throw new DOMException("full", "QuotaExceededError");
      },
    });
    saveDraft(ana, { minutes: "45" }, null, full);
    expect(s.map.size).toBe(0);
    expect(loadDraft(ana, null, full)).toEqual({ minutes: "45" });
    clearDraft(ana, full);
    expect(loadDraft(ana, null, full)).toBeNull();
  });

  it("works without a window (server render)", () => {
    expect(() => saveDraft(ana, fields, "p-1")).not.toThrow();
    expect(loadDraft(ana, "p-1")).toEqual({ summary: fields.summary, minutes: "45" });
    clearDrafts();
    expect(loadDraft(ana, "p-1")).toBeNull();
  });
});
