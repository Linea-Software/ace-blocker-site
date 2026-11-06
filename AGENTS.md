# Project Rules

## Package Management & Runtime

ALWAYS use **Bun** for all package management and script execution tasks.

- Use `bun install` instead of `npm install`
- Use `bun run` instead of `npm run`
- Use `bun` instead of `node`
- Do NOT use `npm`, `yarn`, or `pnpm` under any circumstances.
- **When installing packages**, use `bun add <package>` or `bun add -d <package>`.
- **TypeScript compatibility**: Keep `typescript@~6` and `@typescript/native@npm:typescript@7` installed together while `svelte-check` requires both. The `check` script uses `--tsgo`. Do not bump the root `typescript` dependency to 7 until Svelte tooling supports it without TypeScript 6.
- **Adapter compatibility**: Keep `@sveltejs/adapter-node` on v5 while using SvelteKit 2; adapter-node v6 requires SvelteKit 3. Review the migration as a coordinated major update.
- **Running Locally**: The development server is ALWAYS running at `https://localhost:5173/` during development. You do NOT need to run `bun run dev` yourself. Use this URL to test and verify changes.
- **Initial Setup**: Run `bun run setup` to configure `.env` (generating `BETTER_AUTH_SECRET`, a persistent Ed25519 entitlement signing/verification key pair outside the checkout, and missing `DEFAULT_ADMIN_*` fixture credentials if needed), start Docker PostgreSQL, and apply Drizzle migrations. `bun run gen:entitlement-keys` provisions/reuses dev entitlement keys and populates `.env`; a positional output directory manages standalone files without touching `.env`. On VPS, `setup-vps.sh` passes `ACE_VPS_BOOTSTRAP=1` to dev bootstrap while `setup-env.ts` creates/reuses a separate production pair under `~/.config/ace-blocker/entitlement-keys` and writes both values to `.env` (mode 0600). Reruns never rotate keys. `scripts/setup.ts` detects Debian/Ubuntu, Arch, Fedora/RHEL, openSUSE and Alpine via `os-release`, checks `certutil` first, and installs distro-specific NSS tools only when needed; package selection lives in `scripts/linux-setup.ts` and is covered by unit tests. See README.md. The production VPS script `scripts/setup-vps.sh` is separately Debian/Ubuntu-specific; do not treat it as portable.
- **Local DB migration rebases**: The checked-in `drizzle/0000` replaces earlier development migration files. `bun run setup` executes `bun scripts/db-baseline.ts` before `db:migrate`; it compares the existing local catalog against the checked-in snapshot and, only for a matching legacy schema, records the new baseline while preserving older migration history. It removes the obsolete `account.issuer` field only if `account` is empty under an exclusive lock. Any unexpected differences or non-local/prod URL must fail closed. Run `bun scripts/db-baseline.ts --dry-run` for read-only diagnosis. Do not reset user databases or hand-edit migration history. See README.md.
- **Database Management**: Run `bun run db:delete` to stop the Docker database and delete its associated volumes (virtual disk); this is destructive and must never be used as an automatic migration-repair step.
- **Development Credentials**: `bun run setup` fills missing/blank `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_USERNAME` and `DEFAULT_ADMIN_PASSWORD` in `.env` without overwriting nonblank custom values. The dev seeder also falls back to these defaults:
    - **Email**: `dev@example.com`
    - **Username**: `Admin`
    - **Password**: `dev-password`
    - **Login**: `https://localhost:5173/signin` after `bun run dev`
      Both `hooks.server.ts:init` and `seedDatabase()` require a local loopback PostgreSQL URL before seeding any dev account. Existing users retain their passwords; only role/email verification/Pro fixture are updated. For custom admin emails, require a custom 12+-character password (never assign the public dev password). Do not log passwords. The production provisioning flow in `scripts/provision-admin.ts` remains separate and unchanged.
- **Committing Changes**: You **MUST** perform git commits yourself. Once you have finished a task and verified it, run `git add .` and `git commit -m "..."` with a descriptive message. Do NOT ask the user to commit for you.

## Self-Maintenance (IMPORTANT)

- **Maintain Context**: You MUST automatically edit this `AGENTS.md` file whenever significant changes occur in the project (e.g., new tools added, new core documentation links found, project structure changes, or new patterns established). Keep this document up-to-date as the "Source of Truth" for your behavior in this project.

## Core Documentation & Tech Stack

**🚨 CRITICAL MANDATORY REQUIREMENT 🚨**
Before performing ANY task related to the technologies below, you MUST use `read_url_content` to read the linked `llms.txt` documentation. Relying solely on internal knowledge is UNACCEPTABLE and leads to outdated patterns (e.g., missing Svelte 5 runes).

- **Svelte 5 & SvelteKit**: [Documentation](https://svelte.dev/llms.txt) - Full-stack framework. **MUST use Svelte 5 runes (`$state`, `$derived`, `$effect`, etc.)**.
- **Drizzle ORM**: [Documentation](https://orm.drizzle.team/llms.txt) - Database management.
- **Better Auth**: [Documentation](https://www.better-auth.com/llms.txt) - Authentication.
- **Zod**: [Documentation](https://zod.dev/llms.txt) - Schema verification.
- **shadcn-svelte**: [Documentation](https://shadcn-svelte.com/llms.txt) - UI components.
- **DodoPayments**: [Documentation](https://docs.dodopayments.com/llms.txt) - Payments.
- **BunnyCDN**: [Documentation](https://docs.bunny.net/llms.txt) - File hosting.
- **Elysia**: [Documentation](https://elysiajs.com/llms.txt) - API framework.

### Mandatory Research Workflow

1. **Identify**: Determine which technologies from the list above are involved in the task.
2. **Fetch**: Call `read_url_content` for EVERY relevant documentation URL.
3. **Analyze**: Use only the patterns, runes, and practices found in that documentation.
4. **Citing Source**: In your plan, briefly mention which documentation was consulted (e.g., "Consulted Svelte 5 llms.txt for proper rune usage").

**FAILURE TO FOLLOW THIS WORKFLOW IS A PROJECT-LEVEL FAILURE.**

### Secondary Technologies

- **Secondary Technologies**: Use `@lucide/svelte` for icons. Do NOT use `lucide-svelte` as it is only for Svelte 4; `@lucide/svelte` is required for Svelte 5.

## Localization (Paraglide JS)

- **LLM translation and editorial QA:** Read [`docs/LLM_LOCALIZATION_WORKFLOW.md`](docs/LLM_LOCALIZATION_WORKFLOW.md) before producing or reviewing target-locale content; it covers both the website and desktop app, product terminology, natural writing, independent QA and SEO/localized-page gates.
- **CRITICAL**: All user-facing text **MUST** be localized using Paraglide. Hardcoded strings are **FORBIDDEN** in UI components.
- **Workflow**:
    1. Add the string key to `messages/en.json` (format: `"snake_case_key": "Text content"`).
    2. Run `bun run check` (or let the dev server auto-generate fields) to ensure types are updated.
    3. Import `* as m` from `$lib/paraglide/messages.js`.
    4. Use `m.snake_case_key()` in your Svelte components or TS files.
- **Rules**:
    - **Only** edit `en.json` by default. Do **NOT** edit other language files (`de.json`, `fr.json`, etc.) unless the user explicitly instructs you to do so.
    - Variable arguments: Use `{paramName}` in JSON (e.g., `"hello_user": "Hello {name}"`) and pass object used in code: `m.hello_user({ name: 'User' })`.

## Project Description

This is the **Ace Blocker** marketing and subscription website — a full-stack SvelteKit application for product publicity, user management, subscriptions, and REST API access. It handles authentication (Better Auth), payments (DodoPayments), file hosting (BunnyCDN), and serves as the upstream content provider for the Ace Engine (site packs, resistance scripts, and binary releases).

## UI Identity

**Before any task that creates, redesigns, or materially alters visible UI, read `docs/ui-identity.md`.** It is the approved target identity for the website and keeps the public site aligned with the desktop app.

The site should be the more expressive side of a shared Ace language:

- Signal amber (`#FFB000`) for intervention/commitment/attention;
- warm Ink/Paper neutrals instead of blue-slate defaults;
- IBM Plex Sans / Condensed / Mono;
- firmer geometry and modest radii;
- borders, rules, and inset surfaces over floating shadow cards;
- actual Ace concepts — policies, schedules, locks, resistance, site packs — used as the visual material;
- product-UI previews may simplify, but must stay visually faithful to the current desktop app domain components instead of inventing a separate pseudo-app language;
- theme-dependent brand artwork should follow the CSS `.dark` state rather than hydration-time JavaScript theme guesses, so the correct asset is present on first paint and refresh;
- the official brand files come from the sibling `ace-blocker-logo` repository: **use `ace-lockup-{light,dark}-no-tagline-transparent.svg` for visible site branding**, `ace-lockup-{light,dark}-transparent.png` for email branding, and `ace-icon-*-transparent.svg` for UI favicons. The SVGs must not have a background rectangle and the PNGs must retain alpha. The no-tagline logo is legible in the navbar at 48 px-high on desktop.
- restrained, explanatory motion.

Do not default to the old generic marketing composition: centered gradient hero, blurred blobs, release pill, three equal feature cards, rounded icon tiles, hover-lift cards, or generic premium glow/crown treatment.

For visible marketing work, the mandatory design skills are `frontend-design`, `design-taste-frontend`, and `ui-ux-pro-max`. Use `svelte-code-writer`, `svelte-core-bestpractices`, and `svelte-components` for implementation, then `web-design-guidelines` plus real light/dark screenshots for final review. For dense account/admin product UI, treat `frontend-design` + `ui-ux-pro-max` as primary; `design-taste-frontend` must not override product-UI semantics.

## Desktop account activation

- The engine exposes **typed remoc IPC, not a local browser HTTP endpoint**. Website sign-in, checkout completion, and Pro activation pass account keys to the allowlisted `aceblocker://account/api-key` handler, with credentials in the URI fragment rather than the query string.
- Opening the protocol is only a handoff request; the browser **cannot know** whether the desktop app imported the key or verified Pro. Never show a successful desktop activation without an explicit app-origin acknowledgement. Show a pending state with instructions to verify under Settings → License in Ace Blocker, and let the user retry. Website Pro entitlement may be shown as active independently.
- Linux development registers the handler in the user session as part of the desktop app's `bun run dev` / `tauri dev`; see `ace-blocker/apps/ace-app/docs/DEV_AUTOMATION.md`.

## Environment validation at startup

- **Development now fails closed:** Vite's `configureServer` hook validates the presence and nonblank values of every required server environment setting **before the dev server listens**. `hooks.server.ts:init` repeats the check. Missing settings cause a clearly labeled `[ACE ENV ERROR]` with the missing variable names, not secret values. Fill in all required settings before starting development.
- `src/lib/server/config/development.ts` derives the required keys from the production schema, excluding runtime `NODE_ENV`, production-only `BETTER_AUTH_URL` and `ORIGIN`, and optional settings such as `ACE_RELEASE_INGEST_TOKEN`. Empty and whitespace-only values count as missing; it does **not** make network calls or prove API credentials are valid.
- **Builds, tests, migrations and scripts remain import-safe:** missing provider credentials must not throw at module import time, and the Vite startup check runs only for the real dev server (not Vitest). Email/CDN services still return explicit errors if invoked in a missing-key test. See `src/lib/server/optional-providers.test.ts`.
- Production retains strict syntax/security validation in `src/lib/server/config/production.ts` and `hooks.server.ts:init`. Never bypass production validation or insert dummy production credentials.
- In development, `BETTER_AUTH_URL` is not required: Better Auth resolves its base URL from `PUBLIC_BETTER_AUTH_URL` when absent. `ORIGIN` is read by the production SvelteKit Node adapter, not required by the Vite development server. Both remain strictly required by the production schema.

## SEO and AI-search conventions

- Canonical production origin: `https://aceblocker.com`. Use `src/lib/seo.ts` to manage indexable public routes, canonical URLs, and language alternatives. Do not add private routes to the sitemap.
- Paraglide compilation must use URL-first locale detection in **both** `vite.config.ts` and the `paraglide:compile` script. Use `localizeHref` on public navigation links so the selected locale survives navigation.
- Only the `/faq` page currently has fully localized main content across EN, IT, ES and DE; other locales for marketing pages still contain English fallback and must not be indexed or advertised as fully translated until real translations are supplied. `localesForPath` controls this.
- Visible FAQ answers and JSON-LD must stay in sync; never invent reviews, prices, feature claims or availability. See `docs/SEO.md` for the Search Console/Bing manual setup and post-deploy `bun run seo:audit` read-only smoke checks.

## Project Structure

- `/src/routes/`: Contains SvelteKit pages and API endpoints.
    - **Authentication:** `signin/`, `signup/`, `forgot-password/`
    - **Account:** `account/`
    - **Admin:** `admin/`
    - **Checkout & Marketing:** `checkout/`, `download/`, `get-pro/`
    - **Content:** `about/`, `privacy/`, `terms/`
    - **API Forwarding:** `api/[...slugs]/` (catch-all route forwarding to Elysia)
    - **Development:** `dev/`
    - **Page-specific components** MUST reside in a `./_components` folder within the route directory.
- `/src/lib/`: Reusable components, utilities, and logic.
    - `/src/lib/components/`: **Global components** reused across the app.
    - `/src/lib/components/ui/`: Reserved ONLY for **shadcn-svelte** components.
    - `/src/lib/states/`: Svelte state modules (e.g., `engine.svelte.ts`).
    - `/src/lib/assets/`: Static assets (logo, favicon).
    - `/src/lib/utils/`: Utility functions (`platform.ts`, `locale-currency.ts`, `list-icons.ts`).
    - `/src/lib/api-client.ts`: Elysia Eden client for type-safe API calls.
    - `/src/lib/auth-client.ts`: Better Auth client setup.
    - `/src/lib/server/`: Server-only logic, including:
        - `auth.ts`: Better Auth configuration.
        - `db/`: Database schema (`schema.ts`, `auth-schema.ts`, `artifacts-schema.ts`) and connection (`index.ts`) using Drizzle.
        - `api/`: Elysia API implementation using `@elysiajs/openapi` for type-safe RPC and auto-generated documentation.
        - `cdn/`: BunnyCDN file management (`common.ts`, `delete.ts`, `get.ts`, `upload.ts`).
        - `cache.ts`: Server-side caching.
        - `ace-hosts-site-packs.ts`: Production startup + 2nd-of-month 04:00 UTC pull of all 14 canonical SQLite site-pack ZIPs from the latest `Linea-Software/ace-hosts` GitHub release; verifies SHA-256, skips unchanged assets, mirrors changed files to BunnyCDN, serializes simultaneous runs, and exposes in-process status to admin endpoints. Admins can manually trigger asynchronous sync from `/admin/releases/site-packs`. GitHub never pushes site packs to the site. The legacy Anime/Manga Extended pack is retired only after syncing a release that no longer includes it. See README.md.
        - Installer CI intake is one-way GitHub Actions → site at `POST /api/v1/releases/ingest/installer`. It uses `ACE_RELEASE_INGEST_TOKEN` (not a GitHub credential), verifies the submitted SHA-256, records source provenance, rejects version/target reuse, and always creates a staged release that still requires admin publication.
        - `email.ts`: Email sending.
        - `messages.ts`: Server-side message/notification logic.
        - `pro.ts`: Pro status management.
        - `products.ts`: Product/subscription plan definitions.
        - `env.ts`: Environment variable validation.
        - `seeder/`: Database seeding for development.
    - `/src/lib/paraglide/`: Auto-generated localization runtime.

## Database Patterns

- **Schema Separation**:
    - `auth-schema.ts`: Contains core tables for Better Auth (user, session, account, verification, apikey, twoFactor). Avoid adding application-specific fields here. This file is regenerated with `bun run gen:auth-schema`; **do not hand-edit it** except to keep the hand-added `user.locale` column (declared in `src/lib/server/auth.ts` via `additionalFields`).
    - **Better Auth 1.7.3+**: no longer uses the short-lived `account.issuer` column from 1.7.0-1.7.2. The migration history is rebased to a clean current-schema `0000`, so new databases must not replay the temporary issuer add/remove sequence. After a Better Auth upgrade, re-run `bun run gen:auth-schema`, then `bun run db:generate` and review the migration before `bun run db:migrate`.
    - `schema.ts`: Contains application-specific tables and extends `user` via 1:1 or 1:N relations.
    - `artifacts-schema.ts`: Contains build artifact/release tables for distributing ace-engine binaries and related assets.
- **User Extensions (1:1)**:
    - **Pro Status**: Managed via the `proStatus` table in `schema.ts` to avoid bloating the core `user` table.
    - **Backups**: Managed via the `backups` table in `schema.ts`. Each user has exactly one latest backup (upserted).
- **Relations**: All `relations` (including `userRelations`) should be defined in `schema.ts` to ensure visibility across the entire app schema.

## API Development & Documentation

The project uses **Elysia** to handle all API requests under the `/api` prefix.

- **Catch-all Route**: `src/routes/api/[...slugs]/+server.ts` forwards all requests to the Elysia app.
- **Type Safety**: The Elysia app exports an `AppType`. Use `@elysiajs/eden` in external projects to get full type safety and auto-completion.
- **OpenAPI / Swagger**:
    - In development mode, the interactive Swagger UI is available at `/api/docs`.
    - The raw OpenAPI specification is available at `/api/v1/openapi.json`.
- **Router Pattern**: Always use modular routers in `src/lib/server/api/routers/`.

## Payments (DodoPayments)

- **Country-based currency:** `/get-pro` and `/checkout` read only `X-Ace-Visitor-Country` from Nginx, never raw client-controlled `CDN-RequestCountryCode` or `CF-IPCountry`. The VPS Nginx configuration trusts BunnyCDN country data only from IPs in `/etc/nginx/ace-bunny-edges.geo` (generated from Bunny's published edge feeds), or Cloudflare data from a trusted Cloudflare peer. `scripts/vps/refresh-bunny-edges.sh` installs/refreshes this allowlist and the VPS setup installs a daily cron job. Country mapping supports USD/EUR/GBP/INR; unknown locations fall back to USD. Deploy the updated Nginx config as well as the app whenever changing this path.

Always test mode: `dodoPayments = new DodoPayments({ environment: 'test_mode' })` in `src/lib/server/auth.ts`.

- **Signup/customer creation:** The Dodo Better Auth plugin auto-creates billing customers only in production (`shouldCreateDodoCustomerOnSignUp` in `src/lib/server/config/dodo.ts`). Local signup must never contact Dodo, even with a configured but rejected test-mode API key; in production, the API key remains required and customer synchronization remains enabled.
- **Price startup sync:** If Dodo returns a 401 or is offline, development logs a warning and leaves checkout products unavailable instead of aborting startup. Production still fails on these errors. Do not fake payment products or enable checkout with unverified prices.

- **Checkout**: `/get-pro` calls `authClient.dodopayments.checkoutSession({ slug })` → plugin endpoint `POST /api/auth/dodopayments/checkout-session` (Better Auth mounts plugin routes under its base path `/api/auth`). Returns `{ url, redirect: true }` — in test mode the host is `test.checkout.dodopayments.com`.
- **Webhooks**: Dodo deliveries arrive at `POST /api/auth/dodopayments/webhooks` — the Dodo dashboard endpoint must be `https://<host>/api/auth/dodopayments/webhooks`. Signature verification (Svix-style `webhook-id`/`webhook-timestamp`/`webhook-signature`) happens in the plugin via `@dodopayments/core/webhook`.
- **Idempotency**: webhook events are recorded in `dodo_webhook_events` (keyed by a payload digest, see `src/lib/server/webhook-events.ts`). Every `onSubscription*` handler in `auth.ts` is gated by `shouldProcessWebhook()`, so retried deliveries are no-ops and stale events (older timestamp for the same subscription) are rejected.
- **scheduled cancellation**: `subscription.cancelled` with `cancel_at_next_billing_date: true` keeps access until `next_billing_date` (matching the account page); only a final `subscription.expired`/`failed`/`on_hold`/`paused` clears it.
- **Billing identity after inline checkout:** Local signup intentionally does not pre-create a Dodo customer. An inline purchase may therefore leave `user.dodoCustomerId` empty. `src/lib/server/billing-subscription.ts` reconciles active subscriptions against the signed-in user's **verified, exactly matching** email (including all customer pages and previously linked IDs). Sync and post-checkout verification persist a discovered active customer ID. Missing billing linkage is not HTTP 400 and must not revoke a manually granted Pro license. Cancellation uses the same lookup.
- **Checkout confirmation:** `/checkout/completed` checks Pro at most four times, then shows an actionable delayed/error state with an explicit retry. A redirect is not confirmation of payment, and desktop protocol handoff still has no app-origin acknowledgement.
- **Checkout appearance:** `/checkout?theme=dark|light` updates the site's mode as well as Dodo's hosted checkout theme. The responsive mobile cost/renewal strip appears before the embedded form; the full order panel is desktop-only. Dodo owns its cross-origin payment fields: style them via Dodo customization/checkout options, not host-page CSS.
- **Testing**: `bun scripts/test-dodo-webhooks.ts` signs real webhook payloads against the dev server and asserts pro status changes (needs a running dev server + dev DB). Billing identity, API reconciliation and bounded confirmation are covered by corresponding Vitest tests; real dark/mobile checkout screenshots are saved in `test-results/`.

## Nomenclature & Design Patterns

- **Design tokens & UI consistency**: `docs/ui-identity.md` is the approved **target** visual direction. The token system currently lives in `src/routes/layout.css` (Tailwind v4 `@theme`), while [`docs/design-tokens.md`](docs/design-tokens.md) documents the current/legacy token state and prior consolidation work. The new palette is approved as a direction, but migrate it visually and incrementally; do not perform blind global color replacements without screenshot verification.
- **Svelte Components**: All `.svelte` files MUST use `UpperCamelCase` naming convention (e.g., `Button.svelte`, `UserCard.svelte`).
- **Typed Svelte props**: Use a type annotation on the destructuring (`let { foo }: { foo: string } = $props();`) rather than `$props<{ foo: string }>()`; the latter breaks the current `svelte-check --tsgo` CI typecheck.
- **Page-specific components**: These MUST reside in a `./_components` folder within the route directory OR be prefixed with an underscore (e.g., `_Component.svelte`) to differentiate them from routes.
- `/messages/`: Localization message files for Paraglide. During development, always prioritize English (`en`). Only translate when explicitly requested.
- `/scripts/`: Development and maintenance scripts. **ALWAYS use TypeScript** for these scripts.
- `/drizzle/`: Database migrations managed by Drizzle.

## Formatting and linting

- Run `bun run format` to format owned source/docs, and `bun run lint` to generate Paraglide files, sync SvelteKit, then check formatting and ESLint (also required by CI). `.prettierignore` excludes vendor-provided `.agents/skills`, generated files and build artifacts; do not reformat those inputs.
- ESLint 10 uses `@ninoseki/eslint-plugin-neverthrow` (not the obsolete `eslint-plugin-neverthrow`) with TypeScript project services in the server/ CDN code where `neverthrow` Results are produced and consumed. Always handle cleanup Results explicitly; a failed best-effort cleanup must still be logged.
- `eslint-suppressions.json` records the **pre-existing** lint debt. It does not disable rules for new code. After fixing a recorded violation, run `bunx eslint . --prune-suppressions` and review the diff. Do not regenerate the baseline automatically or use suppressions for new neverthrow errors.

## Scripts

Use `bun run <script>` for these tasks:

- `setup`: Configures `.env`, including default development admin credentials, starts Docker DB, and applies migrations. The pure `.env` helper `scripts/dev-admin-setup.ts` refuses remote/production database targets and preserves custom credentials; see the config and seeder tests.
- `setup-env`: Production `.env` configuration must validate third-party credentials when a safe read-only/non-effectful provider check exists, re-prompt rejected credentials, and fail closed on provider/network ambiguity rather than saving unverified values. Webhook/signing secrets with no standalone verification endpoint must be called out honestly.
- `scripts/setup-vps.sh`: Deployment credential prompts must validate GitHub/Cloudflare/B2 access before relying on the values and re-prompt invalid credentials without persisting plaintext secrets.
- `db:start`: Starts the Docker database.
- `db:delete`: Stops the Docker database and deletes volumes.
- `db:push`: Pushes schema changes to the database (development).
- `db:migrate`: Runs migrations.
- `db:studio`: Opens Drizzle Studio.
- `provision-admin`: Idempotently promotes an existing account without changing its password. New accounts securely prompt for and confirm a password during direct interactive use; `--password-stdin` remains available for piped/non-interactive provisioning. Provisioning requires the lockfile-compatible Better Auth runtime; known-bad 1.7.0-1.7.2 installs must be repaired with `bun install --frozen-lockfile` rather than adding the reverted `account.issuer` column.
- `check`: Compiles the git-ignored Paraglide output first, then runs SvelteKit sync and Svelte-check. Keep this self-contained so fresh CI checkouts do not depend on generated local files.
- `test`: Runs unit and E2E tests.
- `format`: Formats code with Prettier.
- `verify-screenshots`: Captures before/after full-page screenshots (light +
  dark) of the key pages for pixel-level visual verification of UI changes
  (requires the dev server + Docker DB; see the script header for usage).

## Logging (Pino)

All server-side logging uses **Pino** for structured JSON logging.

- **Core module**: `src/lib/server/logger.ts` — exports the root `logger` instance and a `createLogger(component)` helper.
- **Component-level loggers**: In standalone server modules (CDN, pro, auth) and Elysia route files (admin routers, releases), create a module-level logger with `createLogger('component:name')`.
- **SvelteKit hooks**: `src/hooks.server.ts` injects a per-request child logger into `event.locals.log` with a unique `requestId`.
- **Dev vs Prod**: In development, logs are pretty-printed with colors via `pino-pretty`. In production, logs are raw JSON to stdout.
- **Redaction**: Sensitive fields (`password`, `token`, `secret`, `apiKey`, `accessKey`, `headers.authorization`, `headers.cookie`) are automatically redacted from nested objects.
- **DO NOT use `console.log` or `console.error`** in server-side code. Always use `log.info(...)`, `log.error(...)`, `log.warn(...)`, or `log.debug(...)`.

## Agent Skills

You have specialized **Skills** at your disposal located in `./.agents/skills/` (managed by `npx skills`). Before performing complex tasks, you should check these directories for `SKILL.md` files. These files contain project-specific patterns, instructions, and examples that MUST be followed.

The following skills are installed for all agents:

### Core Framework

- **`svelte5-best-practices`** (`ejirocodes/agent-skills`) — Svelte 5 runes, patterns, and best practices.
- **`sveltekit-structure`** (`spences10/svelte-skills-kit`) — SvelteKit project structure conventions.
- **`sveltekit-data-flow`** (`spences10/svelte-skills-kit`) — SvelteKit data loading, forms, and actions.
- **`sveltekit-svelte5-tailwind-skill`** (`claude-skills/sveltekit-svelte5-tailwind-skill`) — Combined SvelteKit + Svelte 5 + Tailwind patterns.

### Database

- **`drizzle-orm-patterns`** (`giuseppe-trisciuoglio/developer-kit`) — Drizzle ORM schema design, queries, and migrations.

### Authentication

- **`better-auth-best-practices`** (`better-auth/skills`) — Core Better Auth setup and configuration.
- **`better-auth-security-best-practices`** (`better-auth/skills`) — Security hardening for Better Auth.
- **`email-and-password-best-practices`** (`better-auth/skills`) — Email/password authentication patterns.

### API & Documentation

- **`elysiajs`** (`elysiajs/skills`) — Elysia API framework patterns.
- **`openapi-spec-generation`** (`wshobson/agents`) — OpenAPI/Swagger spec generation.

### UI & Styling

- **`frontend-design`** — Mandatory for distinctive, intentional visible UI.
- **`design-taste-frontend`** — Mandatory for marketing/landing redesigns and anti-template review.
- **`ui-ux-pro-max`** — Mandatory for product-wide UI/UX, typography, accessibility, layout, and interaction reasoning.
- **`svelte-components`** — Use for Bits UI/headless component patterns.
- **`web-design-guidelines`** — Final UI/accessibility review where applicable.
- **`shadcn`** (`shadcn/ui`) — Existing implementation reference; default shadcn styling is not Ace identity.
- **`tailwind-design-system`** (`wshobson/agents`) — Legacy/reference Tailwind design-system guidance; the Ace identity document is authoritative for visual direction.
- **`tailwind-v4-shadcn`** (`secondsky/claude-skills`) — Existing integration reference; do not treat its defaults as the target system.

### Validation

- **`zod`** (`pproenca/dot-skills`) — Zod schema validation patterns.

### Runtime

- **`bun-runtime`** (`affaan-m/everything-claude-code`) — Bun runtime best practices.

### Localization

- **`paraglide-js-internationalization-i18n`** (`oimiragieo/agent-studio`) — Paraglide JS i18n patterns.

### Infrastructure

- **`docker-expert`** (`sickn33/antigravity-awesome-skills`) — Docker containerization and Compose patterns.

### Payments (DodoPayments)

- **`dodo-best-practices`** (`dodopayments/skills`) — DodoPayments SDK best practices.
- **`checkout-integration`** (`dodopayments/skills`) — DodoPayments checkout integration.
- **`subscription-integration`** (`dodopayments/skills`) — DodoPayments subscription management.

### Testing

- **`vitest`** (`antfu/skills`) — Vitest unit testing patterns.
- **`playwright-cli`** (`microsoft/playwright-cli`) — Playwright CLI usage.
- **`playwright-best-practices`** (`currents-dev/playwright-best-practices-skill`) — Playwright E2E best practices.
- **`webapp-testing`** (`anthropics/skills`) — General web application testing strategies.

### TypeScript

- **`typescript-advanced-types`** (`wshobson/agents`) — Advanced TypeScript type patterns.

### Git & Code Quality

- **`git-commit`** (`github/awesome-copilot`) — Conventional commit message patterns.
- **`eslint-prettier-config`** (`patricio0312rev/skills`) — ESLint + Prettier configuration and usage.

## Svelte MCP Tools usage:

You have access to a Svelte MCP server for documentation. Use these tools effectively:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

## Signed desktop MSI updates (server, gated)

- See `docs/DESKTOP_UPDATES.md` for the immutable, signed Ed25519
  desktop feed contract and private Bunny staging/approval procedure.
- `src/lib/server/desktop-update-security.ts` verifies the exact Rust
  `ace-update-security` v1 envelope with Node crypto. There is **no**
  release signing private key on this server.
- `src/lib/server/desktop-update-storage.ts` verifies private Bunny bytes
  using a bounded stream; public MSI delivery bypasses the VPS.
  `src/lib/server/desktop-update-service.ts` enforces staged/publishing/
  published/withdrawn state, audit and explicit admin review.
- `GET /api/v1/releases/desktop/latest` is anonymous, account-independent
  and default-disabled; it is **not** the legacy `/releases/latest` content feed.
  `ACE_DESKTOP_UPDATES_ENABLED` must remain unset until production signing
  and pinned Windows client checks are ready.
- Only `POST /api/v1/releases/ingest/desktop` takes a CI bearer token;
  `POST /api/v1/admin/installers/{publish-desktop,withdraw-desktop}` require
  Better Auth administrator sessions. The legacy
  `set-downloadable` route cannot promote signed desktop releases.
