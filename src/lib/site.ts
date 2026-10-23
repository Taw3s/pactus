export function siteUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export function confirmUrl(next = "/hoje") {
  return `${siteUrl()}/auth/confirm?next=${encodeURIComponent(next)}`;
}

/** Resolves a post-login destination, accepting only paths on our own origin. */
export function safeNextPath(raw: string | null, origin: string, fallback = "/hoje"): string {
  if (!raw) return fallback;
  try {
    const url = new URL(raw, origin);
    if (url.origin !== new URL(origin).origin) return fallback;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}
