# Ace Blocker Site — SolidJS 2.0 architecture

Status: SolidJS 2 implementation on `solidjs-porting` (24 November 2026). Legacy Svelte source and tooling have been removed. Production deployment is a separate operation; the verification matrix below documents the required gates.

## 1. Sources of truth and scope

- Official Solid 2 reference: https://docs.solidjs.com/llms-full.txt ; documentation index: https://docs.solidjs.com/llms.txt ; AI tools: https://docs.solidjs.com/guides/ai-tools. Check APIs against the installed versions, because Solid 1.x/React examples are not API-compatible.
- Local skills: `.agents/skills/solid-2.0/SKILL.md`, `.agents/skills/solidjs-v2/SKILL.md`, `.agents/skills/reactivity-diagnostics/SKILL.md`, and the installed `node_modules/solid-js/CHEATSHEET.md`.
- Product, security, financial, localization and desktop update invariants remain in `AGENTS.md` and feature-specific docs, including `DEVICE_LINKING.md`, `CLOUD_BACKUP_PASSWORD_ENCRYPTION.md`, `DESKTOP_UPDATES.md`, `SEO.md` and `ui-identity.md`. The framework port does **not** relax them.
- This is the **website**, not the desktop app, engine or its privileged IPC. It supplies marketing pages, Better Auth accounts, Dodo subscriptions, signed release metadata and distribution, site packs, Resistance metadata, and Elysia APIs.

## 2. Runtime and directory ownership

| Concern                  | Solid 2 location / contract                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Tooling                  | `package.json`, `vite.config.ts`, Bun, Vite 8                                                                     |
| Solid plugin             | `@solidjs/vite-plugin` with `ssr: true`, `serverFunctions: true`, `start.middleware` and `start.nodeServer`       |
| Page discovery           | `filesystem-routing/vite` and `virtual:file-routes`, mapped by `src/router.ts`                                    |
| Root component           | `src/App.tsx` — `<Router>` and `<Loading>` boundary; imports global CSS/fonts                                     |
| Document                 | `src/Document.tsx` — server HTML shell, page language, favicon, `<HydrationScript>`                               |
| Server request entry     | `src/middleware.ts` — initialization, request dispatch, Paraglide, SSR continuation                               |
| Startup side effects     | `src/lib/server/bootstrap.ts:initializeSite()` — environment validation, seeding/cache, production site-pack sync |
| Browser pages            | `src/routes/**/index.tsx`, optional layouts e.g. `src/routes/admin.tsx`                                           |
| Route-local server reads | `src/routes/**/data.ts` and dedicated `"use server"` functions                                                    |
| Native HTTP routes       | `src/routes/api/device-link/*.ts`, `src/routes/download/[arch].ts`, `src/routes/sitemap.xml.ts`                   |
| REST API                 | `src/lib/server/api/app.ts` and modular `src/lib/server/api/routers/`, Elysia                                     |
| Authentication           | `src/lib/server/auth.ts` (server), `src/lib/auth-client.ts` (browser adapter)                                     |
| Database                 | `src/lib/server/db/` and guarded Drizzle migrations                                                               |
| Locale                   | `messages/`, generated `src/lib/paraglide/`, Paraglide middleware and runtime                                     |
| Production build         | `dist/client` assets and `dist/server` SSR/request server; current Dockerfile starts `bun ./dist/server/node.js`  |

The `$lib` alias is defined in `vite.config.ts` and points to `src/lib`. `static/` is Vite's `publicDir`. Route `_components` folders hold route-specific Solid components. Shared primitives belong to `src/lib/components/ui/` and shared layout/marketing components under `src/lib/components/`. Keep server modules in `src/lib/server/`: neither routes nor shared UI should import secrets or database modules outside a real server boundary.

## 3. HTTP request flow (as currently wired)

`src/middleware.ts` is the start-mode middleware entry. It calls `initializeSite()` before handling requests, then:

1. **REST API:** `/api/*` (except `/api/device-link/*`) is passed directly to the Elysia `app.handle(request)`. Elysia mounts the Better Auth handler (including `/api/auth/*`) and modular `/api/v1/*` endpoints. This is not a SvelteKit catch-all.
2. **Native handlers:** `createAPIHandler(virtual:file-routes)` handles file-based HTTP method exports, including `/api/device-link/start`, `/api/device-link/poll`, `/api/device-link/approve`, public downloads and sitemap. These are not Elysia routes. **The Elysia bypass must remain explicit.**
3. **Pages / server functions:** For unmatched native routes, the chain invokes `paraglideMiddleware(request, ...)` then continues to Solid's start-mode handler for SSR, navigation, and `/_server/*` server functions.

The current middleware records page visits and logs a request ID. Only indexable HTML document GET requests contribute to page visits; private and server-function paths are excluded. Production request URLs are reconstructed against configured HTTPS ORIGIN, and private document requests are guarded before streaming. HTML and RPC responses are private/no-store; native handlers retain their own cache policy. do not imply it already has SvelteKit `event.locals` or an implemented per-request logger scope. Middleware must not log query parameters, credentials, cookies or API keys. For new security headers, set headers on the returned **response**, not the incoming request.

### Route mapping

- `src/router.ts` builds page routes from `fileRoutes(pageRoutes)`; matching component modules export a default route component. A parent file, such as `admin.tsx`, can act as a layout for nested routes.
- `/:locale` prefixes are declared for `it`, `de` and `es`, in addition to unprefixed English pages. Do **not** assume a prefixed URL changes Paraglide's locale without the URL-first middleware; test the rendered `<html lang>` and metadata.
- `index.tsx` represents the directory's index page. A `.ts` module with exported HTTP methods (`GET`, `POST`) represents an HTTP route when `httpMethods: true` is configured. A `data.ts` module without default/HTTP exports is an ordinary co-located module, not a public route.
- The router uses explicit localized and unlocalized catch-alls with HTTP 404 status. Do not assume an old `+error.svelte`, `+layout` or SvelteKit pathname convention still operates.
- Preserve public links with Paraglide `localizeHref` and language switching that preserves pathname, query and fragment. Do not mirror account/API/checkout paths as indexable localized content without verifying permissions and SEO policy.
- SEO origin, `localesForPath`, canonical/hreflang, sitemap exclusions, FAQ JSON-LD parity and EN/IT-vs-DE/ES translation coverage are specified in `docs/SEO.md`. Verify SSR HTML (not only hydrated client DOM) and run `bun run seo:audit` after a reachable deployment.

## 4. Server rendering, hydration and Solid 2 reactivity

- Start mode generates browser and server entries. `src/Document.tsx` emits HTML with `<HydrationScript />`; `src/App.tsx` wraps routes with `<Loading>`. Server rendering must be request-isolated; no user/session/country data may leak through module-global mutable state or shared caches.
- Solid component functions run **once**. Read dynamic props as `props.value` inside JSX/`createMemo`; do not destructure reactive props once or snapshot signals at component top level. Pass **values** to JSX props, not accessor functions unless a hook explicitly requires one.
- Solid 2 uses `createSignal`, `createMemo`, `createStore` from `solid-js`; `createEffect(compute, apply)` with tracked pure compute and side-effect apply; `onSettled` for browser lifecycle and cleanup; `<Loading>`/`<Errored>` for async/error boundaries; DOM utilities from `@solidjs/web`. Never use Svelte runes, Solid 1 `solid-js/store`, `onMount`, or React rerender assumptions.
- Do not access `window`, `document`, `localStorage`, timers, or browser-only payment widgets on the server render path. Initiate browser-only work in the proper lifecycle and clean it up; keep first-render theme, language, and markup deterministic to avoid hydration mismatch.
- Server renders may run under Bun/Node compatibility and direct invocation; browser APIs, private providers and internal network clients belong behind server boundaries. Check that serialized route data contains **only** authorized, necessary fields.
- Preserve visual parity and accessibility across light/dark, mobile/desktop and reduced-motion; `docs/ui-identity.md` defines brand requirements. Isolate migration CSS so old and new component selectors do not silently interfere.

## 5. Data reads, writes, server functions and forms

Route `data.ts` modules currently use patterns such as:

```ts
// Example structure, not a public endpoint and not a replacement for auth.
import { query } from '@solidjs/router';

export const getPageData = query(async () => {
	'use server';
	// Check session, roles, parameters and ownership before querying.
	return { safe: true };
}, 'page-data');
```

- Components can call a query using a Solid 2 async `createMemo(() => getPageData(...))` inside the router/loading boundary. Reads are asynchronous, so provide pending/error/empty states, and revalidate or refresh after mutations.
- `'use server'` is a compile-time boundary. Its browser caller uses a generated server-function transport (typically `/_server/*`); on SSR the function runs directly in the server request context. **Every function is independently callable by HTTP.** Authentication, authorization, ownership checks, input validation, abuse/rate limits and CSRF protections are still required in the server implementation, even if the UI hides the control.
- Never capture non-top-level component state in a compiled server function; pass validated primitives explicitly. Avoid imports of `src/lib/server` modules in browser-executed expressions. Keep secrets on the server and do not return raw DB rows with sensitive columns.
- Mutations may use supported Solid Router actions/server functions or existing authenticated Elysia endpoints; choose one authoritative operation per business action. Preserve idempotency and server-side validation. Do not port SvelteKit `load`, `actions`, `fail`, `redirect`, `event.locals`, `invalidateAll` or `$app/*` APIs by name.
- Browser forms must handle loading, failure, double submissions, and focus/keyboard access. Keep the semantics of cancellation, checkout confirmation, device approval, and account deletion; **a browser redirect is never a payment or desktop activation acknowledgement**.

## 6. Authentication, admin and privileged APIs

- Better Auth is configured in `src/lib/server/auth.ts` with Drizzle, verified email, email OTP/2FA, admin and API-key plugins, Dodo subscriptions, signed webhook processing and account email flows. Its routes are mounted through **Elysia** at `/api/auth/*`; do not split into a second Solid Auth implementation.
- `src/lib/auth-client.ts` intentionally uses the **framework-neutral** Better Auth client with a Solid 2 signal/subscription for `useSession`. The Better Auth 1.x `better-auth/solid` adapter relies on removed Solid 1 internals; do not use it until the actual installed version is verified compatible.
- An authenticated nav badge or redirected page is not a security boundary. On **each** server query, action, account mutation, admin loader and Elysia endpoint check the session/API-key identity and the required authorization. Keep administrative routes server-enforced, never UI-only.
- Accept either `x-api-key` or `Authorization: Bearer <key>` for the engine where supported in Better Auth configuration. Never put API keys in query strings, logs, client-rendered URLs, or SSR page data. Desktop key import uses privileged Tauri remoc only.
- The device-link handlers are explicitly **native Solid filesystem HTTP routes**, not the generic API app. The flow uses hashed challenges, 10-minute expiry, polling at least 5 seconds apart, an email-verified approval session, single-use atomic redemption, and no browser-accessible engine listener. See `docs/DEVICE_LINKING.md`.
- Client-encrypted cloud backup uses Argon2id/AES-256-GCM ciphertext, separate salt and nonce columns and no server KMS. Password reset cannot recover an old encrypted backup. Do not call Better Auth login zero-knowledge; see `docs/CLOUD_BACKUP_PASSWORD_ENCRYPTION.md`.

## 7. Billing and release security

- Dodo integration is in Better Auth's `dodopayments` plugin. Keep its **test mode** configuration until payment approval changes intentionally; development signup must not contact Dodo, while production customer sync and verified startup price loading remain required.
- Inline checkout uses a non-query server function (POST), called only after browser settlement, with session authorization and server-side price validation. The authenticated Better Auth `/api/auth/dodopayments/checkout-session` endpoint is also preserved; webhooks arrive at `/api/auth/dodopayments/webhooks`. Preserve signature verification, durable dedupe/stale-event rejection, subscription state transitions, and safe verified-email billing reconciliation.
- Currency mapping trusts only the **sanitized, proxy-provided** `X-Ace-Visitor-Country` header. Never trust unsanitized `CF-IPCountry` or `CDN-RequestCountryCode` from a direct caller. Production reverse-proxy configuration must be deployed in coordination with the app.
- A checkout redirect is not proof of paid status; `/checkout/completed` must bound retries and expose delayed/error/retry states. Scheduled cancellation keeps Pro access until the actual end of term; a website Pro status does not prove desktop import.
- Installer validation, Linux companion atomicity, signed Windows review, disabled-by-default desktop updater feed and content SHA-256 verification are **not** relaxed by switching frameworks. Signed desktop publish/withdraw remains server-gated; do not promote from browser flags. See `docs/DESKTOP_UPDATES.md` and `AGENTS.md`.
- Public site packs are mirrored from verified GitHub assets, with digest checks and serialized monthly/startup sync. Preserve the production sync date/time and admin progress reporting; development startup must not run production distribution tasks.

## 8. Localization and metadata

- Paraglide source is `messages/en.json` plus approved locales; generated runtime is under `src/lib/paraglide`, produced by `bun run paraglide:compile`. Vite runs `paraglideVitePlugin({ strategy: ['url', 'baseLocale'] })`.
- Render user-facing strings through `$lib/paraglide/messages.js`. Keep URL-first language detection across SSR, links, auth/checkout navigation and metadata. Verify the language menu maintains path/search/hash.
- Follow `docs/LLM_LOCALIZATION_WORKFLOW.md` and glossary files. New keys start in English unless explicitly instructed otherwise; when marketing/SEO-visible text changes, preserve the existing EN/IT/DE/ES QA and SEO gating requirements. Do not label incomplete locale fallback content as translated.

## 9. Startup, environment and production deployment

- Local: `bun install`, `bun run setup`, then `bun run dev` (repository policy: do not independently start a second development server). Local HTTP is `http://localhost:5173/`. Development environment validation runs from Vite's `configureServer` and `initializeSite`, excluding Vitest/build imports. Missing required credential names produce `[ACE ENV ERROR]` without logging values.
- `initializeSite()` is one-time-per-process via a cached Promise, runs seeding and price setup and, in production, initializes site-pack sync/cache/schedule. Development fixtures are allowed **only** with local loopback PostgreSQL and must never run against a remote/production DB. Startup failure resets the Promise so it can fail closed again. Verify restart behavior and concurrency; do not add per-request database seeding.
- Production validation includes `BETTER_AUTH_URL` and `ORIGIN` even though development permits the documented fallbacks. Build/test/config imports must stay safe without active provider credentials. Never inject fake prod keys or silently bypass validation.
- `bun run build` produces `dist/client` and `dist/server`; the repository `Dockerfile` currently copies both and starts `bun ./dist/server/node.js` under an unprivileged user. Confirm the build artifact/handler before enabling production. Static assets must be served alongside the SSR server; `/_server/*`, `/api/*` and native HTTP routes must reach the same app origin.
- All host-level SSH/firewall/Nginx/TLS/systemd/database backup, proxy trust and VPS rollout are owned by **private ace-infra**, not this repository. See `docs/DEPLOY.md`. Entitlement Ed25519 production private keys live outside the checkout and must not be rotated by routine deploys.
- Database baseline `drizzle/0000` is a **new database baseline**. A read-only migration guard prevents replay against incompatible histories; never auto-reset production DB or run `bun run setup` there. Require an independently restorable pre-migration backup.

## 10. Verification gates (must be rerun; not claimed completed)

At minimum, after the application and dependency port is complete:

1. **Static:** `bun install --frozen-lockfile` (if dependency changes), `bun run check`, `bun run lint`, `bun run test:unit -- --run` and `bun run build`. Review remaining Svelte imports/route files in the active bundle and lockfile; old reference code must not be executed.
2. **SSR/request routing:** Test `/`, `/it`, `/de`, `/es`, public features, `/faq`, `/signin`, `/signup`, `/account`, `/admin` and unknown routes both by direct reload and navigation. Check real response status, HTML language, canonical/hreflang, hydration and no 404/500. Test direct `/api/v1/*`, `/api/auth/*`, `/api/device-link/*`, `/download/[arch]`, `/sitemap.xml` and `/_server/*`.
3. **Auth/security:** Signed-out and wrong-role requests must be rejected by **server** routes/functions, not just UI. Check cross-account access, 2FA, email verification, API keys, request/response CSRF/origin behavior, logs without credentials, device link single-use/expiration/rate limits and page-data serialization.
4. **Billing:** Verify test-mode checkout, country/currency from trusted proxy, post-checkout retry cap, cancellation/renewal and **signed** webhook dedupe/stale delivery with `bun scripts/test-dodo-webhooks.ts` (requires running dev server/DB). Do not test production card charges.
5. **Distribution:** Verify digest-checked site-pack sync, release staging/publish/withdraw, unsigned dev-only mode, validated Linux companion, signed updater feed default off and backup encryption/storage contract.
6. **Visual/E2E:** Run `bun run test:e2e` (disposable local PostgreSQL, HTTPS proxy, generated keys, isolated provider fixtures and real production bundle) and focused Playwright suites; compare light/dark and mobile/desktop screenshots for UI/UX parity, keyboard focus, theme on first paint, reduced motion and no overflow/console errors. Replace legacy Svelte component specs with Solid 2 browser tests before retiring them.
7. **Deployment:** Build and smoke-test the actual Node-compatible Bun entry from `dist/server/node.js` behind the intended proxy with `dist/client` assets, local URLs, SSR on hard refresh, API/webhook delivery and actual production env validation. Then run `bun run seo:audit` for deployed pages.

**Current verification status:** This guide was authored from inspected source/configuration and official documentation during an in-progress multi-agent port. It contains **required checks**, not assertions that those checks succeeded. Revisit this document after the implementation stabilizes and record passing evidence separately.
