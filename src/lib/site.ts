export function siteUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export function confirmUrl(next = "/hoje") {
  return `${siteUrl()}/auth/confirm?next=${encodeURIComponent(next)}`;
}
