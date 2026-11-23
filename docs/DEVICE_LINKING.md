# HTTPS Device Linking for Ace Blocker

## Purpose

Browsers show a security warning when a website starts an external protocol handler such as `aceblocker://`.
Ace Blocker uses a temporary device code instead.
The browser authorizes the link through HTTPS.
This process does not bypass browser security prompts.
The browser does not have to start the desktop application.

## Flow

1. In **Desktop → Settings → License → Connect account**, Tauri Rust sends a POST request to `/api/device-link/start`.
   The server returns a secret 256-bit `deviceCode` and a separate 12-character `userCode`.
   It also returns a 5-second polling interval and a 10-minute expiration time.
   The native process keeps `deviceCode` in memory. It never sends the secret to the WebView.
2. Tauri opens `/connect?code=<userCode>` in the system browser. The URL contains only the human-readable confirmation code, **not** the secret `deviceCode` or an API key.
   The browser pre-fills the code so the user only checks it against the desktop app and explicitly approves the request.
   If sign-in (including two-factor authentication) is needed, the site retains the validated code through the sign-in redirect.
   Opening `/connect` without a code continues to support manual entry for older clients.
   The confirmation page uses `no-referrer` and never approves a link automatically.
3. `/api/device-link/approve` accepts only same-origin POST requests.
   It requires a verified Better Auth session, a valid one-time code, and a pending unexpired challenge.
   A conditional UPDATE authorizes one challenge row for the authenticated user.
4. Tauri sends `deviceCode` to `/api/device-link/poll` at the specified interval.
   The server atomically changes `approved` to `redeeming` and issues one account API key.
   The response uses `no-store`. Another redemption cannot issue another key.
5. Only native Tauri Rust receives the API key.
   Tauri sends it to the engine through the existing capability-protected remoc `setApiKey` call.
   JavaScript receives only `linked` or an error. JavaScript never receives the API key.
6. The desktop refreshes the entitlement and the Free or Pro state.
   Signed entitlements and server-side subscription checks control Pro access. A user code alone does not grant Pro access.

## Security Requirements

- **User code:** Generate 12 characters uniformly from a 32-character alphabet (approximately 60 bits of entropy).
  The code identifies the request. It is not a bearer credential for redemption.
- **Device code:** Generate 32 random bytes and encode them as base64url.
  Store only SHA-256 hashes of both codes and the approved user ID.
  The regenerated `drizzle/0000` initial migration includes `device_links`.
- **Single use and expiration:** Expire grants after 10 minutes.
  Use database compare-and-set to prevent competing pollers from redeeming one grant.
  Treat an uncertain key-issuance failure as terminal. Do not replay a possibly issued credential.
- Never put `deviceCode`, API keys, privileged IPC capability tokens, or session credentials in URLs, browser storage, logs, or JavaScript responses.
- `/api/device-link/start` and `/api/device-link/poll` do not require a browser session.
  Apply **edge/API gateway rate limits** in production. Monitor these endpoints for abuse.
  Do not allow cross-origin access. Browser approval requires valid cookies and a same-origin `Origin` header.
- Use **SvelteKit** routes for these endpoints, not Elysia routes.
  Keep the `handleApi` exemption in `src/hooks.server.ts`. Without it, start, poll, and approve return 404.
- Use loopback HTTP only in debug builds. Use HTTPS in production.
  Do not follow redirects. Set a 12-second timeout for each native HTTP request.
- Keep `aceblocker://` as a manual fallback for older installations.
  Never open it automatically on sign-in, sign-up, checkout, or Pro landing pages.

## Deployment

1. On fresh databases, `device_links` is part of the regenerated `drizzle/0000` baseline. On existing deployments, safely adopt the baseline (see `docs/DEPLOY.md`) before shipping desktop builds that use these endpoints.
2. Deploy the site. Set per-IP/IP-prefix edge limits for start and poll. Set stronger per-account limits for approve.
3. Ship desktop builds with native Tauri commands `device_link_start`, `device_link_poll`, and `device_link_cancel`.
4. Verify that `/connect?code=<userCode>` uses HTTPS, pre-fills the code and preserves it through login; ensure approval requires a click.
   Confirm that the app reports Pro only after the engine refreshes the account successfully.

## Tests

- **Site checks:** `bun run check`, `bun run test:unit -- --run src/lib/server/device-link.test.ts`, `bunx playwright test --config e2e/marketing-features.config.ts device-link.spec.ts`.
- **Desktop checks:** `cd ../ace-blocker && cargo check -p ace-app --lib`, then `cd apps/ace-app && bun run check && bun run test:unit -- --run src/lib/utils/account-browser.test.ts`.
- **Security checks:** Reject cross-origin and unauthenticated approval. Enforce the polling interval.
  Reject malformed codes. Confirm that each grant can be used only once.
