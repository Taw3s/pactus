import type { Goal } from "@/lib/types";

/**
 * Drafts of the proof forms, kept on this device only (localStorage, never sent anywhere): what was typed
 * survives a reload, a crash or the phone killing the tab. Only text and numbers: photos and attachments
 * are files and are picked again. One draft per person, group, day (São Paulo), goal and form (first proof,
 * retake, extra session); reading drops every draft of another person, group or day, so nothing written by
 * another account or on another day ever comes back. Logging out, deleting the account and leaving the
 * group clear them all. Blocked storage (private mode, full, disabled) falls back to memory: the form works.
 */

export type DraftMode = "first" | "retake" | "extra";

export interface DraftScope {
  userId: string;
  groupId: string;
  /** The day of the form (São Paulo, YYYY-MM-DD). */
  day: string;
  goal: Goal;
  mode: DraftMode;
}

/** The form's fields, as the inputs hold them (strings). */
export interface DraftFields {
  summary: string;
  minutes: string;
  pages: string;
  title: string;
  projectUrl: string;
}

interface Stored {
  v: 1;
  userId: string;
  groupId: string;
  day: string;
  goal: Goal;
  mode: DraftMode;
  /** The question of the day the summary answers: a different question drops the answer. */
  prompt: string | null;
  fields: Partial<DraftFields>;
}

/** The subset of Storage the drafts use (tests pass their own). */
export type DraftStore = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

export const DRAFT_PREFIX = "pacto:draft:";

// Same limits as the inputs: a tampered entry never fills a field beyond what typing could.
const LIMITS: Record<keyof DraftFields, number> = { summary: 2000, minutes: 4, pages: 4, title: 80, projectUrl: 300 };
const DIGITS = new Set<keyof DraftFields>(["minutes", "pages"]);

// Used only when localStorage is missing or refuses a write (full, disabled): the draft then lives as long as
// the tab (in-app navigation included). Clearing always clears both.
const memory = new Map<string, string>();

function browserStore(): DraftStore | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // SecurityError: storage disabled for this site
  }
}

/** Never throws: a broken storage reads as empty. */
function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function read(key: string, store?: DraftStore): string | null {
  const s = store ?? browserStore();
  return (s && safe(() => s.getItem(key), null)) ?? memory.get(key) ?? null;
}

function write(key: string, value: string, store?: DraftStore): void {
  const s = store ?? browserStore();
  if (s && safe(() => (s.setItem(key, value), true), false)) {
    memory.delete(key);
    return;
  }
  // The stored copy is now older than what was typed: drop it so it never comes back instead.
  if (s) safe(() => s.removeItem(key), undefined);
  memory.set(key, value);
}

function remove(keys: (k: string) => boolean, store?: DraftStore): void {
  const s = store ?? browserStore();
  if (s) {
    safe(() => {
      const found: string[] = [];
      for (let n = 0; n < s.length; n++) {
        const k = s.key(n);
        if (k?.startsWith(DRAFT_PREFIX) && keys(k)) found.push(k);
      }
      found.forEach((k) => s.removeItem(k));
    }, undefined);
  }
  for (const k of [...memory.keys()]) if (keys(k)) memory.delete(k);
}

export function draftKey({ userId, groupId, day, goal, mode }: DraftScope): string {
  return `${DRAFT_PREFIX}${userId}:${groupId}:${day}:${goal}:${mode}`;
}

function clean(fields: Partial<Record<keyof DraftFields, unknown>>): Partial<DraftFields> {
  const out: Partial<DraftFields> = {};
  for (const name of Object.keys(LIMITS) as (keyof DraftFields)[]) {
    const value = fields[name];
    if (typeof value !== "string") continue;
    const v = (DIGITS.has(name) ? value.replace(/\D/g, "") : value).slice(0, LIMITS[name]);
    if (v.trim()) out[name] = v;
  }
  return out;
}

/** Drops every draft that is not of this person, group and day (another account, a group left, an old day). */
export function purgeDrafts(keep: Pick<DraftScope, "userId" | "groupId" | "day">, store?: DraftStore): void {
  const mine = `${DRAFT_PREFIX}${keep.userId}:${keep.groupId}:${keep.day}:`;
  remove((k) => !k.startsWith(mine), store);
}

/**
 * This form's draft, or null. Drafts of other people, groups or days are deleted first; an entry whose
 * contents do not match its key, or that does not parse, is deleted too. The summary only comes back
 * with the same question of the day (`prompt`).
 */
export function loadDraft(scope: DraftScope, prompt: string | null, store?: DraftStore): Partial<DraftFields> | null {
  purgeDrafts(scope, store);
  const key = draftKey(scope);
  const raw = read(key, store);
  if (!raw) return null;
  const d = safe(() => JSON.parse(raw) as Stored, null);
  const valid =
    !!d && d.v === 1 && d.userId === scope.userId && d.groupId === scope.groupId && d.day === scope.day && d.goal === scope.goal && d.mode === scope.mode;
  if (!valid || typeof d.fields !== "object" || !d.fields) {
    remove((k) => k === key, store);
    return null;
  }
  const fields = clean(d.fields);
  if ((d.prompt ?? null) !== prompt) delete fields.summary;
  return Object.keys(fields).length ? fields : null;
}

/** Saves the form's fields; with nothing typed, removes the draft. */
export function saveDraft(scope: DraftScope, fields: Partial<DraftFields>, prompt: string | null, store?: DraftStore): void {
  const kept = clean(fields);
  const key = draftKey(scope);
  if (!Object.keys(kept).length) return remove((k) => k === key, store);
  const value: Stored = { v: 1, userId: scope.userId, groupId: scope.groupId, day: scope.day, goal: scope.goal, mode: scope.mode, prompt, fields: kept };
  write(key, JSON.stringify(value), store);
}

export function hasDraft(scope: DraftScope, prompt: string | null, store?: DraftStore): boolean {
  return loadDraft(scope, prompt, store) !== null;
}

/** After a confirmed send: this form's draft is spent. */
export function clearDraft(scope: DraftScope, store?: DraftStore): void {
  const key = draftKey(scope);
  remove((k) => k === key, store);
}

/** Logging out, deleting the account, leaving the group: no draft stays on the device. */
export function clearDrafts(store?: DraftStore): void {
  remove(() => true, store);
}
