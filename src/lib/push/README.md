# Push notifications (not enabled in the MVP)

Left out on purpose: on iPhone, Web Push only works when the PWA is installed
on the home screen (iOS 16.4+), so it would work for some friends and not others.

What is already in place:
- `public/sw.js` is registered in production and has commented `push` and
  `notificationclick` handlers.
- The manifest (`src/app/manifest.ts`) makes the app installable, which iOS requires.

To enable later:
1. Generate VAPID keys (`npx web-push generate-vapid-keys`). Put the public key in
   `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and the private key in `VAPID_PRIVATE_KEY` (Vercel env, never in git).
2. Create a `push_subscriptions` table (user_id, endpoint, p256dh, auth) with RLS "own rows only".
3. In Settings, add an "Ativar lembretes" button that calls
   `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`
   and saves the subscription.
4. Uncomment the handlers in `public/sw.js`.
5. Sending needs a scheduler (e.g. Vercel Cron or Supabase pg_cron hitting a route
   that uses the `web-push` package), e.g. a reminder at 21:00 for whoever is below 3/3.
