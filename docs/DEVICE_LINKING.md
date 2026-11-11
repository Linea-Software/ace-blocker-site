# HTTPS device linking for Ace Blocker

## Why
Browsers legitimately warn before launching an external protocol handler such as `aceblocker://`. The preferred activation path uses a time-limited, browser-authorized device code instead. It does **not** bypass browser security prompts; it avoids asking the browser to launch a desktop application.

## Flow
1. In Desktop → **Settings → License → Connect account**, the Tauri Rust process POSTs to `/api/device-link/start`. It receives a 256-bit `deviceCode` secret, a distinct 12-character `userCode`, an interval (5 seconds), and a 10-minute expiry. The native process retains `deviceCode` in memory, never in the WebView.
2. Tauri opens the normal HTTPS URL `/connect`. It shows no device secret. The desktop UI shows the user code; the person types that code into the authenticated browser page.
3. `/api/device-link/approve` requires same-origin POST, a verified Better Auth user session, a valid one-time code, and an unexpired pending challenge. Its one-row conditional UPDATE authorizes the challenge for **that** user.
4. Tauri sends the secret to `/api/device-link/poll` at the advertised interval. The service atomically changes `approved → redeeming` and issues an account API key once. The response is marked `no-store`. A second redemption cannot issue another key.
5. Only Tauri Rust receives the issued credential. It forwards the key through the existing capability-protected remoc `setApiKey` call to the engine. The JavaScript UI receives only `linked` or an error; it never receives the key.
6. The desktop refreshes its entitlement, including Free or Pro state. Pro access is governed by the signed entitlement and server-side subscription checks—not by possession of a user code.

## Security boundaries
- User code: uniformly generated from a 32-character alphabet, 12 characters (~60 bits of entropy). The code identifies the authorization request but is not a bearer credential for redemption.
- Device code: 32 random bytes, base64url. Server persistence stores only SHA-256 hashes of both codes and the approved user ID. DB migration `0003_tearful_ultimates.sql` adds `device_links`.
- Single-use and expiry: 10 minutes, database compare-and-set prevents competing pollers from redeeming the same grant. An uncertain key-issuance failure is treated as terminal rather than replaying a possibly issued credential.
- Never place `deviceCode`, API keys, privileged IPC capability tokens, or session credentials in a browser URL, browser storage, logs, or JavaScript responses.
- `/api/device-link/start` and `/api/device-link/poll` intentionally need no browser session; they must be protected by **edge/API gateway rate limits** and monitored for abuse in production. The service gives no cross-origin access, and browser approval requires valid cookies and a same-origin `Origin` header.
- The new API endpoints are **SvelteKit** routes, not Elysia routes. Keep the `handleApi` exemption in `src/hooks.server.ts`, or all start/poll/approve calls return 404.
- The native HTTP client uses loopback HTTP in debug only and HTTPS in production. Redirects are disallowed, and each request has a 12-second timeout.
- The legacy `aceblocker://` protocol path remains a manual fallback for older installations; it must never auto-open on signin/signup/checkout or Pro landing pages.

## Deployment
1. Deploy the additive Postgres migration (`bun run db:migrate`) before shipping desktop builds that use the new endpoints.
2. Deploy the updated site and enforce per-IP/IP-prefix rate limiting at the edge for start/poll and stronger per-account limits on approve.
3. Deploy desktop builds with Tauri's `device_link_start`, `device_link_poll`, and `device_link_cancel` native commands.
4. Verify that the browser authorization page is HTTPS, the code matches the desktop, and the app reports Pro only after a successful engine account refresh.

## Tests
- Site: `bun run check`, `bun run test:unit -- --run src/lib/server/device-link.test.ts`, `bunx playwright test --config e2e/marketing-features.config.ts device-link.spec.ts`.
- Desktop: `cd ../ace-blocker && cargo check -p ace-app --lib`, plus `cd apps/ace-app && bun run check && bun run test:unit -- --run src/lib/utils/account-browser.test.ts`.
- Security regression: reject cross-origin approval, reject unauthenticated approval, enforce polling interval, reject malformed codes and consume grants once.
