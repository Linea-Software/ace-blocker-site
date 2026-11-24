# Production deployment (SolidJS 2.0 SSR)

> **Port in progress:** This guide describes the intended application-owned deployment for branch `solidjs-porting`; it is **not** evidence of a passing production build, a smoke-tested port, or a migrated VPS. Complete the verification gates in [SOLIDJS_2_ARCHITECTURE.md](SOLIDJS_2_ARCHITECTURE.md) before any rollout.

VPS provisioning, host configuration, and production update procedures are maintained in the private **Linea-Software/ace-infra** repository.

This website repository contains the **application** and local development tools. It does not own production SSH settings, UFW rules, Nginx, Certbot, database backup jobs or systemd unit files.

## Application-owned deployment interfaces

- `bun scripts/setup-env.ts` — configure and validate the production environment. Creates or reuses a persistent production entitlement-signing key pair; do not rotate this pair during ordinary deployments.
- `bun run db:migrate` — safely apply reviewed database migrations; a read-only guard refuses to replay the regenerated initial `0000` on databases with old migration history. Require an independently restorable pre-migration backup.
- `bun run build` — generate Solid 2 start-mode SSR bundles: `dist/client/` static assets and `dist/server/` server code. The current Vite config enables SSR, server functions and `start.nodeServer`; do not run SvelteKit's adapter or `svelte-kit sync`.
- `bun ./dist/server/node.js` — current Node-compatible server entry run under Bun; validate the actual emitted artifact after each build and use the host's proper process supervision. Serve `dist/client` and forward page, API and `/_server` requests to the appropriate handler on the same origin.
- `bun run check`, `bun run lint`, `bun run test:unit -- --run`, `bun run test:e2e` — pre-deploy checks (E2E requires a running test instance and database). Run `bun run seo:audit` once the deployed origin is reachable.
- `bun run provision-admin` — initial administrator provisioning; not an ordinary deployment step.
- `postgres-image.txt` — shared pinned PostgreSQL image for rootless development, E2E and production Quadlet.

Do **not** run `bun run setup` against a production database. It is for local development only.

## Request handling and production origin

The runtime entry is `src/middleware.ts` (not `src/hooks.server.ts`). It routes `/api/*` except `/api/device-link/*` through Elysia (`src/lib/server/api/app.ts`), mounts Better Auth at `/api/auth/*`, delegates device-link HTTP method exports and other native routes through `filesystem-routing`, and continues page/`/_server/*` SSR requests through Paraglide and Solid's server handler. Preserve this dispatch and its ordering when configuring Nginx; the runtime is **not** a static SPA.

Keep `BETTER_AUTH_URL` and `ORIGIN` aligned with the public HTTPS canonical origin (`https://aceblocker.com` in production). The existing production environment schema requires both. Do not weaken production validation, inject dummy secrets or expose the developer fixture account. `src/lib/server/bootstrap.ts:initializeSite()` validates the environment on first request and handles startup seeding/price setup/cache and production site-pack sync; inspect any delayed initialization errors before declaring the service healthy.

Proxy-set `X-Ace-Visitor-Country` is trusted for billing currency **only** when the edge has been authenticated by the production allowlist. Nginx/edge configuration belongs in `ace-infra`, and it must strip client-supplied country headers. Preserve webhook raw-body/signature verification and `/api/auth/dodopayments/webhooks` forwarding. Ensure `/_server/*`, `/api/device-link/*`, `/download/*`, sitemap, static assets, and language-prefixed pages load correctly on direct refresh, without routing to legacy SvelteKit handlers.

The production desktop update feed remains disabled by default until the signed release gate is independently satisfied; the server must never gain the release-signing private key. Entitlement-signing keys and database backups remain outside the checkout. See [DESKTOP_UPDATES.md](DESKTOP_UPDATES.md) and [DEVICE_LINKING.md](DEVICE_LINKING.md).

### New migration baseline

The current `drizzle/0000` is a clean initial schema for an empty database,
not an incremental migration. Its `backups` table stores ciphertext, Argon2id
salt, and AES-GCM nonce in distinct non-null columns.

The production VPS has **not** been migrated or modified by this development
change. Before any future production rollout, review the actual database and
establish an appropriate deployment procedure; **do not** blindly replay
`drizzle-kit migrate` over existing tables. The built-in read-only migration
guard refuses incompatible histories.

## Deployment acceptance checklist

1. On a clean build, verify `bun run check`, `bun run lint`, unit tests and `bun run build` are green; smoke-test the generated `dist/server/node.js` executable with required environment values and the local PostgreSQL service.
2. Confirm the SSR HTML contains expected localized metadata/canonicals (not merely client-side updates) and there are no hydration mismatches. Verify `dist/client` CSS/assets, `/`, `/it`, `/de`, `/es`, `/faq`, `/get-pro`, admin/auth boundaries and unknown-route status.
3. Confirm Better Auth sessions, 2FA, device-link challenges and native HTTP method handlers, Elysia REST and OpenAPI, signed Dodo webhook verification/idempotency, trusted currency header and server-function auth are functional and non-indexable private pages stay out of the sitemap.
4. Validate site-pack sync behavior and staging/publishing restrictions, scheduled tasks under the intended supervised service, backup ciphertext format, redacted logs and startup failures. Use read-only monitoring; never reset production databases to make the deployment pass.
5. Roll out through **ace-infra** with its recovery/backup plan; run `bun run seo:audit` after reaching the intended domain. Any missing verification blocks declaring production readiness.

## VPS runbooks

Authorized operators: consult the private `ace-infra/docs/BOOTSTRAP.md`, `ace-infra/docs/UPDATE.md`, and `ace-infra/docs/RECOVERY.md`. These cover new-server provisioning, updates, encrypted backups, verification and recovery.

The old `scripts/setup-vps.sh` and `scripts/vps/` directory were retired from this repository when infrastructure ownership moved. Their old versions may still exist in Git history; do not use an old commit as a new VPS installation guide.

Do not place host credentials, deployment secrets, TLS private keys or backup files into this repository.
