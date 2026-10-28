/** Cookie-authenticated mutations must not accept browser requests from another origin. */
export function trustedMutationOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin !== null) return origin === new URL(request.url).origin;
  // Non-browser clients may omit Origin. Browsers still identify cross-site requests here.
  return request.headers.get("sec-fetch-site") !== "cross-site";
}
