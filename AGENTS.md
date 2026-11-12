# Project Rules

## Package Management & Runtime

Use **Bun** for package management and script execution.

- Use `bun install` instead of `npm install`
- Use `bun run` instead of `npm run`
- Use `bun` instead of `node`
- Never use `npm`, `yarn`, or `pnpm`.
- **When installing packages**, use `bun add <package>` or `bun add -d <package>`.
- **TypeScript compatibility**: Keep `typescript@~6` and `@typescript/native@npm:typescript@7` installed together while `svelte-check` requires both. The `check` script uses `--tsgo`. Do not bump the root `typescript` dependency to 7 until Svelte tooling supports it without TypeScript 6.
- **Adapter compatibility**: Keep `@sveltejs/adapter-node` on v5 while using SvelteKit 2; adapter-node v6 requires SvelteKit 3. Review the migration as a coordinated major update.
- **Running locally:** The development server runs at `https://localhost:5173/`. Do not start `bun run dev` yourself. Use that URL to test and verify changes.
- **Initial setup:** Run `bun run setup`. It configures `.env`, creates `BETTER_AUTH_SECRET`, creates a persistent Ed25519 entitlement signing and verification key pair outside the checkout, and fills missing `DEFAULT_ADMIN_*` fixture credentials when needed. It also starts Docker PostgreSQL and applies Drizzle migrations.
  Run `bun run gen:entitlement-keys` to create or reuse development entitlement keys and fill `.env`. Provide a positional output directory to manage standalone files without changing `.env`.
  On a VPS, the private `ace-infra` provisioning flow calls `scripts/setup-env.ts`. It creates or reuses a separate production key pair in `~/.config/ace-blocker/entitlement-keys`, writes the values to `.env` with mode 0600, and must never rotate the keys on a routine deployment.
  `scripts/setup.ts` detects Debian/Ubuntu, Arch, Fedora/RHEL, openSUSE, and Alpine through `os-release`. It checks for `certutil` before installing distribution-specific NSS tools. `scripts/linux-setup.ts` selects packages; unit tests cover this selection. See README.md.
  VPS host provisioning and updates are owned by the private `ace-infra` repository. Its production provisioning supports Debian/Ubuntu only.
- **Local database migration rebases:** The checked-in `drizzle/0000` replaces earlier development migrations. During `bun run setup`, run `bun scripts/db-baseline.ts` before `db:migrate`. Compare the existing local catalog with the checked-in snapshot. Record the new baseline only for a matching legacy schema, and preserve older migration history.
  Remove the obsolete `account.issuer` field only when `account` is empty and an exclusive lock is held. Fail closed for unexpected schema differences or a non-local/production database URL.
  For read-only diagnosis, run `bun scripts/db-baseline.ts --dry-run`. Never reset user databases or edit migration history by hand. See README.md.
- **Database Management**: Run `bun run db:delete` to stop the Docker database and delete its associated volumes (virtual disk); this is destructive and must never be used as an automatic migration-repair step.
- **Development Credentials**: `bun run setup` fills missing/blank `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_USERNAME` and `DEFAULT_ADMIN_PASSWORD` in `.env` without overwriting nonblank custom values. The dev seeder also falls back to these defaults:
    - **Email**: `dev@example.com`
    - **Username**: `Admin`
    - **Password**: `dev-password`
    - **Login**: `https://localhost:5173/signin` after `bun run dev`
      Both `hooks.server.ts:init` and `seedDatabase()` require a local loopback PostgreSQL URL before they seed a development account. Keep existing user passwords. Update only the role, email verification, and Pro fixture. For a custom admin email, require a custom password of at least 12 characters. Never use the public development password or log passwords. Keep the production provisioning flow in `scripts/provision-admin.ts` separate and unchanged.
- **Committing changes:** Commit verified work yourself. Run `git add .` and `git commit -m "..."` with a descriptive message. Do not ask the user to make the commit.

## Self-Maintenance (IMPORTANT)

- **Maintain context:** Update this `AGENTS.md` when the project changes significantly. Examples include new tools, core documentation links, structural changes, and established patterns. Keep this document current as the source of truth for work in this project.

## Core Documentation & Tech Stack

**🚨 CRITICAL MANDATORY REQUIREMENT 🚨**
Before you work with a technology listed below, use `read_url_content` to read its linked `llms.txt` documentation. Do not rely only on internal knowledge. It can omit current requirements, such as Svelte 5 runes.

- **Svelte 5 & SvelteKit**: [Documentation](https://svelte.dev/llms.txt) - Full-stack framework. **MUST use Svelte 5 runes (`$state`, `$derived`, `$effect`, etc.)**.
- **Drizzle ORM**: [Documentation](https://orm.drizzle.team/llms.txt) - Database management.
- **Better Auth**: [Documentation](https://www.better-auth.com/llms.txt) - Authentication.
- **Zod**: [Documentation](https://zod.dev/llms.txt) - Schema verification.
- **shadcn-svelte**: [Documentation](https://shadcn-svelte.com/llms.txt) - UI components.
- **DodoPayments**: [Documentation](https://docs.dodopayments.com/llms.txt) - Payments.
- **BunnyCDN**: [Documentation](https://docs.bunny.net/llms.txt) - File hosting.
- **Elysia**: [Documentation](https://elysiajs.com/llms.txt) - API framework.

### Mandatory Research Workflow

1. **Identify:** Find the listed technologies that the task uses.
2. **Fetch:** Call `read_url_content` for every relevant documentation URL.
3. **Analyze:** Use the patterns, runes, and practices in that documentation.
4. **Cite sources:** In your plan, name the documentation you consulted (for example, "Consulted Svelte 5 llms.txt for proper rune usage").

**FAILURE TO FOLLOW THIS WORKFLOW IS A PROJECT-LEVEL FAILURE.**

### Secondary Technologies

- **Secondary Technologies**: Use `@lucide/svelte` for icons. Do NOT use `lucide-svelte` as it is only for Svelte 4; `@lucide/svelte` is required for Svelte 5.

## Localization (Paraglide JS)

- **LLM translation and editorial QA:** Read [`docs/LLM_LOCALIZATION_WORKFLOW.md`](docs/LLM_LOCALIZATION_WORKFLOW.md) before producing or reviewing target-locale content; it covers both the website and desktop app, product terminology, natural writing, independent QA and SEO/localized-page gates.
- **Critical:** Localize all user-facing text with Paraglide. Do not hardcode strings in UI components.
- **Workflow**:
    1. Add the string key to `messages/en.json` (format: `"snake_case_key": "Text content"`).
    2. Run `bun run check` (or let the dev server auto-generate fields) to ensure types are updated.
    3. Import `* as m` from `$lib/paraglide/messages.js`.
    4. Use `m.snake_case_key()` in your Svelte components or TS files.
- **Rules**:
    - **Only** edit `en.json` by default. Do **NOT** edit other language files (`de.json`, `fr.json`, etc.) unless the user explicitly instructs you to do so.
    - Variable arguments: Use `{paramName}` in JSON (e.g., `"hello_user": "Hello {name}"`) and pass object used in code: `m.hello_user({ name: 'User' })`.

## Project Description

This project is the **Ace Blocker** marketing and subscription website. It uses full-stack SvelteKit for public pages, accounts, subscriptions, and REST APIs. Better Auth handles authentication. DodoPayments handles payments. BunnyCDN hosts files. The website supplies site packs, Resistance scripts, and binary releases to Ace Engine.

## UI Identity

**Before any task that creates, redesigns, or materially alters visible UI, read `docs/ui-identity.md`.** It is the approved target identity for the website and keeps the public site aligned with the desktop app.

Use a more expressive version of the shared Ace visual language on the website:

- Signal amber (`#FFB000`) for intervention/commitment/attention;
- warm Ink/Paper neutrals instead of blue-slate defaults;
- IBM Plex Sans / Condensed / Mono;
- firmer geometry and modest radii;
- borders, rules, and inset surfaces over floating shadow cards;
- actual Ace concepts — policies, schedules, locks, resistance, site packs — used as the visual material;
- product-UI previews may simplify, but must stay visually faithful to the current desktop app domain components instead of inventing a separate pseudo-app language;
- theme-dependent brand artwork should follow the CSS `.dark` state rather than hydration-time JavaScript theme guesses, so the correct asset is present on first paint and refresh;
- Use official brand files from the sibling `ace-blocker-logo` repository. For visible site branding, **use `ace-lockup-{light,dark}-no-tagline-transparent.svg`**. For email branding, use `ace-lockup-{light,dark}-transparent.png`. For UI favicons, use `ace-icon-*-transparent.svg`. SVGs must not contain background rectangles. PNGs must retain transparency. The desktop navbar must keep the no-tagline logo legible at a height of 48 px.
- restrained, explanatory motion.

Do not reuse the old generic marketing layout. Avoid centered gradient heroes, blurred blobs, release pills, three equal feature cards, rounded icon tiles, hover-lift cards, and generic premium glow or crown effects.

For visible marketing changes, use the required `frontend-design`, `design-taste-frontend`, and `ui-ux-pro-max` skills. For implementation, use `svelte-code-writer`, `svelte-core-bestpractices`, and `svelte-components`. For final review, use `web-design-guidelines` and real screenshots in light and dark modes. For dense account/admin product UI, treat `frontend-design` + `ui-ux-pro-max` as primary; `design-taste-frontend` must not override product-UI semantics.

## Features walkthroughs (2026-11-09)

- Public feature routes: `/features/network-blocks` and `/features/resistance`.
- Marketing demos live in `src/lib/components/marketing/{NetworkBlockDemo,ResistanceDemo}.svelte`. They are deterministic, isolated illustrations: never connect them to the desktop engine, browser user settings or any account mutations.
- DemoPlayback.svelte.ts and DemoPointer.svelte implement finite guided walkthroughs: move pointer -> hover -> press -> change state -> settle. Do not change state before simulated clicking. Preserve no autoplay on mount, manual interaction priority and reduced motion.
- Marketing NetworkBlockDemo.svelte preserves compact action buttons, a Categories/Rules divider, week schedule preview, and a deliberate lock setup and confirmation step. Locked blocks retain read-only View.
- End the non-compact Network Block walkthrough with a local simulated browser scene. Show these actions in order: click to open, enter the configured custom domain, and navigate. Show HTTP 404 only if the configured rule applies at the fixed example time (Monday 10:30).
  The preview must not make external requests or use an iframe. Show the final network response as a passive timed cue, not as an invented click. Keep manual Back/Play/Replay, reduced-motion support, and the unchanged compact homepage demo.
- ResistanceDemo.svelte uses real intervention catalog IDs and defaults, CAPTCHA opt-in and per-site effects; never apply one site’s script to another website preview.
- Give the replica preview most of the Resistance demo width. On the compact homepage version, use about 30% for controls and 70% for the preview, below a full-width editorial heading. On the feature page, use about 35% for controls and 65% for the preview.
  Show Before/After side by side in wide previews. Use a switch in narrow preview containers. **Use the named `resistance-layout` CSS container query (<=760px component width)** instead of a viewport media query. Stack controls above the preview and show the collapsible panel at this width. This must also protect the compact demo inside `/get-pro` on desktop viewports.
  Start compact controls collapsed and full walkthrough controls expanded. Reopen controls during guided playback as needed. Preserve preview interactions and prevent category text overflow.
- For visual QA screenshots, use the real theme control. Verify that the browser reports no horizontal overflow or console errors.
- The live desktop `ace-blocker/apps/ace-app` controls and `boredom-engine` intervention catalog are authoritative for product claims. Keep Free and Pro Gambling/Streaming variants distinguishable.
- When feature-page text changes, update EN/IT/DE/ES messages and the SEO locale gate together. Check each translation for accuracy.
- Run focused browser tests with `bun x playwright test --config e2e/marketing-features.config.ts` and repeatable visual QA with `bun scripts/capture-marketing-demos.ts` (32 local PNG screenshots, ignored under `test-results/marketing-demos`).

## Public language selection (2026-11-06)

The desktop navbar and mobile menu offer English / Italiano selection.
Paraglide detects the locale from the URL first. The selector keeps the current
pathname, query, and fragment. It changes the document location so that SSR,
metadata, and headings use the same locale. Other configured languages remain accessible through their existing URLs.
Do not add them to the selector before their translations are complete.
The Italian message catalog covers public, account/admin, and email strings;
Privacy and Terms page bodies use Paraglide message keys. Obtain independent professional review of localized legal text before publication.
See `docs/ITALIAN_TERMINOLOGY.md` for the shared IT glossary, unresolved
English-source ambiguities and the `src/lib/utils/count-message.ts` pattern
for zero/singular/plural agreement.

## Installer-release artifact policy (2026-11-10)

- Admin installer uploads accept only `AceBlocker-VERSION.msi` (Windows x64)
  or `AceBlocker-VERSION-linux-x64.tar.gz` (Linux x64). GitHub Actions
  downloads include ZIP wrappers. Upload the platform package inside the ZIP,
  not the wrapper.
- Authoritative target names are in `src/lib/installer-release-policy.ts`.
  Server-side structural checks (MSI header, bounded safe tar/gzip with x64
  ELF binaries and mandatory files) live in
  `src/lib/server/installer-artifact-validation.ts`. Never trust MIME or
  filename alone.
- Successful validation records `ace_blocker_installer.artifact_validated_at`.
  Old rows remain NULL/unverified. `src/lib/server/installer-release-publication.ts`
  re-fetches staged legacy installer bytes from storage and verifies file
  content, size and SHA-256 before publication.
- Signed Windows publication requires a validated Linux companion of the
  same version; one database transaction publishes both download flags.
  Withdrawal disables both. Only the signed desktop publication endpoint may
  approve Windows; the generic legacy toggle cannot.
- The Linux website does **not** verify Authenticode. The trusted
  native Windows signing/verifier stage and offline Ed25519 release signature
  remain separate required gates. Do not claim signed Linux manifests or
  unattended MSI installation exist. See `docs/DESKTOP_UPDATES.md`.

## Installer publication UI environments (2026-11-11)

- The admin installer page explains why an action is disabled. It also shows
  whether publication runs in development or production mode.
- Unsigned/manual installers can be published only in a SvelteKit development
  build with `NODE_ENV=development` and local PostgreSQL, as guarded by
  `src/lib/server/installer-publication-mode.ts`. Even there, the server
  requires validated x64 installer bytes and the signed Windows/Linux pair
  remains atomic.
- In production, reject ordinary Windows MSI uploads, even if the MSI header is valid. Production Windows releases enter only via the trusted
  Authenticode-verified, Ed25519-signed CI/offline pipeline and private staging,
  then appear as staged candidates in the admin list. The admin can upload
  the matching validated Linux bundle and publish the signed Windows row.
  Never treat a manually supplied MSI as signed based solely on its filename
  or compound-file header. See `docs/DESKTOP_UPDATES.md`.
- `src/lib/installer-publication-ui.ts` explains action availability only in
  the browser. Enforce the authoritative gates in
  `src/lib/server/api/routers/admin/installers.ts` and
  `src/lib/server/desktop-update-service.ts`.

## Download page primary installer actions (2026-11-11)

- The public `/download` hero contains **one selected-platform installer card**. It offers the direct installer button and matching terminal command together, above the other-builds list.
- Make the Windows/macOS/Linux tabs update both actions from the same published `platformRows` metadata. An explicit `?arch=` link must select the requested OS even if no installer is available.
  Generate commands with `src/routes/download/_components/installer-command.ts`. For Windows, download the MSI and invoke `msiexec`. For Linux, download the validated tar.gz bundle and invoke its included `install.sh`. Never copy stale CDN URLs or show a command for an unpublished installer.
- If no release is available, show both actions in a disabled state. Show `Not currently available`. Preserve responsive stacking, horizontal scrolling for long commands, and correct copy feedback. Other platform builds and checksum validation remain in their lower sections.
- Display the selected release version and file size in the installer's footer. Release notes are deferred; see `docs/FEATURE_BACKLOG.md`. Do not show an external release-notes placeholder.
- macOS installer downloads are **inactive** pending validation on a Mac. Keep macOS implementation and components for future activation, but exclude macOS from public `/download` tabs, other builds and metadata; `/download/macos_universal` must return 404 even if a release row exists. Toggle only `src/lib/public-download-platforms.ts` after testing.

## Pro product page visibility (2026-11-11)

- `/get-pro` has two subscription-aware hero paths: Free visitors see the upgrade introduction; active Pro accounts see the activation/linking panel. The price/billing comparison and checkout calls to action remain **Free-only**.
- **Both** Free and Pro users must see the Resistance and Categories marketing sections. Active Pro accounts additionally see a concise list of included Pro features (all curated categories, Custom Lists, Resistance, cloud backup, and Network Blocks) without prompting them to purchase again.
- Do not treat a website subscription as proof of desktop activation. Pro linking continues through `ProActivationPanel`; only the desktop app confirms import. The browser component tests in `src/routes/get-pro/page.svelte.spec.ts` cover both branches.

## HTTPS desktop device linking (2026-11-11)

- Start the preferred license and account handoff at **Ace Blocker Desktop → Settings → License → Connect account**. Do not start it by opening an `aceblocker://` URL from the website.
  Tauri's native Rust process starts and polls a one-time HTTP(S) device challenge. The browser route `/connect` displays the code entry and explicitly authorizes the signed-in, email-verified user.
- Implement `/api/device-link/{start,poll,approve}` as **native SvelteKit** routes. Exempt them from the Elysia API interceptor in `src/hooks.server.ts`; otherwise, they return 404.
  Never put raw device secrets or unclaimed API keys in browser URLs. Store device challenges only as hashes. Expire challenges after 10 minutes. Poll no more often than every 5 seconds. Consume each approval atomically and only once.
- After native redemption, the Tauri process imports the account key through the existing capability-protected engine remoc `setApiKey` RPC. Never introduce a browser-accessible engine HTTP listener or transmit its privileged capability to JavaScript.
- `drizzle/0003_tearful_ultimates.sql` creates `device_links`; deploy the migration **before** deploying native clients and the website. Keep edge rate limiting on unauthenticated start/poll endpoints. See `docs/DEVICE_LINKING.md` for protocol and security gates.
- Legacy `aceblocker://` is available only through a **manual** fallback button. Do not auto-open it on `/signin`, `/get-pro`, or checkout completion. Tests: `src/lib/server/device-link.test.ts`, `e2e/device-link.spec.ts` and Pro activation component tests.

## Desktop account activation

- The engine exposes **typed remoc IPC, not a local browser HTTP endpoint**. Website sign-in, checkout completion, and Pro activation pass account keys to the allowlisted `aceblocker://account/api-key` handler, with credentials in the URI fragment rather than the query string.
- Opening the protocol only requests a handoff. The browser **cannot know** whether the desktop app imported the key or verified Pro. Never show a successful desktop activation without an explicit app-origin acknowledgement. Show a pending state with instructions to verify under Settings → License in Ace Blocker, and let the user retry. Website Pro entitlement may be shown as active independently.
- Linux development registers the handler in the user session as part of the desktop app's `bun run dev` / `tauri dev`; see `ace-blocker/apps/ace-app/docs/DEV_AUTOMATION.md`.

## Environment validation at startup

- **Development fails closed:** Before the development server listens, Vite's `configureServer` hook verifies that every required server environment variable exists and is not blank. `hooks.server.ts:init` repeats the check. Missing settings cause a clearly labeled `[ACE ENV ERROR]` with the missing variable names, not secret values. Fill in all required settings before starting development.
- `src/lib/server/config/development.ts` derives the required keys from the production schema, excluding runtime `NODE_ENV`, production-only `BETTER_AUTH_URL` and `ORIGIN`, and optional settings such as `ACE_RELEASE_INGEST_TOKEN`. Empty and whitespace-only values count as missing; it does **not** make network calls or prove API credentials are valid.
- **Keep builds, tests, migrations, and scripts import-safe.** Missing provider credentials must not cause errors when a module loads. Run Vite's startup validation only for the real development server, not Vitest. Email/CDN services still return explicit errors if invoked in a missing-key test. See `src/lib/server/optional-providers.test.ts`.
- Production retains strict syntax/security validation in `src/lib/server/config/production.ts` and `hooks.server.ts:init`. Never bypass production validation or insert dummy production credentials.
- In development, `BETTER_AUTH_URL` is not required: Better Auth resolves its base URL from `PUBLIC_BETTER_AUTH_URL` when absent. `ORIGIN` is read by the production SvelteKit Node adapter, not required by the Vite development server. Both remain strictly required by the production schema.

## SEO and AI-search conventions

- Production origin: `https://aceblocker.com`. Use `src/lib/seo.ts` for public indexable routes, canonical URLs, and language alternatives. Exclude private routes from the sitemap.
- Paraglide compilation must use URL-first locale detection in **both** `vite.config.ts` and the `paraglide:compile` script. Use `localizeHref` on public navigation links so the selected locale survives navigation.
- The `/faq` main content is fully localized in EN, IT, ES, and DE. Other indexable public pages are available in English and Italian, including the legal page bodies. Spanish and German still fall back to English on those pages and must not be advertised or indexed as fully translated. `localesForPath` is the SEO gate.
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
        - `ace-hosts-site-packs.ts`: At production startup and at 04:00 UTC on the second day of each month, fetch all 14 canonical SQLite site-pack ZIPs from the latest `Linea-Software/ace-hosts` GitHub release. Verify SHA-256 and skip unchanged assets. Mirror changed files to BunnyCDN. Serialize concurrent runs and expose in-process status through admin endpoints.
          Admins can start an asynchronous sync at `/admin/releases/site-packs`. GitHub never pushes site packs to the website. Retire the legacy Anime/Manga Extended pack only after syncing a release that omits it. See README.md.
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
- **Relations:** Define all `relations`, including `userRelations`, in `schema.ts`. This makes them visible across the application schema.

## API Development & Documentation

**Elysia** handles all API requests under `/api`.

- **Catch-all Route**: `src/routes/api/[...slugs]/+server.ts` forwards all requests to the Elysia app.
- **Type Safety**: The Elysia app exports an `AppType`. Use `@elysiajs/eden` in external projects to get full type safety and auto-completion.
- **OpenAPI / Swagger**:
    - In development mode, the interactive Swagger UI is available at `/api/docs`.
    - The raw OpenAPI specification is available at `/api/v1/openapi.json`.
- **Router pattern:** Use modular routers in `src/lib/server/api/routers/`.

## Payments (DodoPayments)

- **Country-based currency:** `/get-pro` and `/checkout` must read only `X-Ace-Visitor-Country` from Nginx. Never trust raw client-controlled `CDN-RequestCountryCode` or `CF-IPCountry`.
  Trust BunnyCDN country data only from IPs in `/etc/nginx/ace-bunny-edges.geo`, which uses Bunny's published edge feeds. Alternatively, trust Cloudflare data only from a trusted Cloudflare peer. The private `ace-infra/scripts/vps/refresh-bunny-edges.sh` maintains this allowlist; provisioning installs its daily cron job.
  Map countries to USD/EUR/GBP/INR. Use USD for unknown locations. When this path changes, deploy both the updated Nginx configuration and the application.

Always test mode: `dodoPayments = new DodoPayments({ environment: 'test_mode' })` in `src/lib/server/auth.ts`.

- **Signup/customer creation:** The Dodo Better Auth plugin auto-creates billing customers only in production (`shouldCreateDodoCustomerOnSignUp` in `src/lib/server/config/dodo.ts`). Local signup must never contact Dodo, even with a configured but rejected test-mode API key; in production, the API key remains required and customer synchronization remains enabled.
- **Price startup sync:** If Dodo returns a 401 or is offline, development logs a warning and leaves checkout products unavailable instead of aborting startup. Production still fails on these errors. Do not fake payment products or enable checkout with unverified prices.

- **Checkout**: `/get-pro` calls `authClient.dodopayments.checkoutSession({ slug })` → plugin endpoint `POST /api/auth/dodopayments/checkout-session` (Better Auth mounts plugin routes under its base path `/api/auth`). Returns `{ url, redirect: true }` — in test mode the host is `test.checkout.dodopayments.com`.
- **Webhooks**: Dodo deliveries arrive at `POST /api/auth/dodopayments/webhooks` — the Dodo dashboard endpoint must be `https://<host>/api/auth/dodopayments/webhooks`. Signature verification (Svix-style `webhook-id`/`webhook-timestamp`/`webhook-signature`) happens in the plugin via `@dodopayments/core/webhook`.
- **Idempotency**: webhook events are recorded in `dodo_webhook_events` (keyed by a payload digest, see `src/lib/server/webhook-events.ts`). Every `onSubscription*` handler in `auth.ts` is gated by `shouldProcessWebhook()`, so retried deliveries are no-ops and stale events (older timestamp for the same subscription) are rejected.
- **scheduled cancellation**: `subscription.cancelled` with `cancel_at_next_billing_date: true` keeps access until `next_billing_date` (matching the account page); only a final `subscription.expired`/`failed`/`on_hold`/`paused` clears it.
- **Billing identity after inline checkout:** Local signup does not create a Dodo customer in advance. An inline purchase can leave `user.dodoCustomerId` empty.
  `src/lib/server/billing-subscription.ts` reconciles active subscriptions against the signed-in user's **verified, exactly matching** email. It checks all customer pages and previously linked IDs. Sync and post-checkout verification save a discovered active customer ID.
  Missing billing linkage must not cause HTTP 400 or revoke a manually granted Pro license. Use the same lookup for cancellation.
- **Checkout confirmation:** `/checkout/completed` checks Pro at most four times, then shows an actionable delayed/error state with an explicit retry. A redirect is not confirmation of payment, and desktop protocol handoff still has no app-origin acknowledgement.
- **Checkout appearance:** `/checkout?theme=dark|light` updates the site's mode as well as Dodo's hosted checkout theme. The responsive mobile cost/renewal strip appears before the embedded form; the full order panel is desktop-only. Dodo owns its cross-origin payment fields: style them via Dodo customization/checkout options, not host-page CSS.
- **Testing:** Run `bun scripts/test-dodo-webhooks.ts` to sign real webhook payloads against the development server and verify Pro status changes. This test needs a running development server and database. Billing identity, API reconciliation and bounded confirmation are covered by corresponding Vitest tests; real dark/mobile checkout screenshots are saved in `test-results/`.

## Nomenclature & Design Patterns

- **Design tokens and UI consistency:** Follow the approved **target** visual direction in `docs/ui-identity.md`. The current token system is in `src/routes/layout.css` (Tailwind v4 `@theme`). [`docs/design-tokens.md`](docs/design-tokens.md) records current and legacy tokens and earlier consolidation work.
  The new palette is an approved direction. Migrate to it visually and in small steps. Never replace colors globally without checking screenshots.
- **Svelte components:** Name every `.svelte` file in `UpperCamelCase` (for example, `Button.svelte` or `UserCard.svelte`).
- **Typed Svelte props**: Use a type annotation on the destructuring (`let { foo }: { foo: string } = $props();`) rather than `$props<{ foo: string }>()`; the latter breaks the current `svelte-check --tsgo` CI typecheck.
- **Page-specific components:** Put them in the route's `./_components` directory or prefix their names with an underscore (for example, `_Component.svelte`). This distinguishes components from routes.
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
- Production VPS provisioning, host credentials, SSH and backup scripts are maintained separately in the private `ace-infra` repository.
- `db:start`: Starts the Docker database.
- `db:delete`: Stops the Docker database and deletes volumes.
- `db:push`: Pushes schema changes to the database (development).
- `db:migrate`: Runs migrations.
- `db:studio`: Opens Drizzle Studio.
- `provision-admin`: Promote an existing account without changing its password. Running the script again must have the same result. During interactive creation of a new account, prompt securely for a password and confirmation. Keep `--password-stdin` available for piped or noninteractive provisioning.
  Use the Better Auth runtime compatible with the lockfile. Repair known-bad 1.7.0–1.7.2 installations with `bun install --frozen-lockfile`. Do not restore the reverted `account.issuer` column.
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
- **Redaction:** The logger automatically removes sensitive fields from nested objects: `password`, `token`, `secret`, `apiKey`, `accessKey`, `headers.authorization`, and `headers.cookie`.
- **DO NOT use `console.log` or `console.error`** in server-side code. Always use `log.info(...)`, `log.error(...)`, `log.warn(...)`, or `log.debug(...)`.

## Agent Skills

Specialized **Skills** are in `./.agents/skills/` (managed by `npx skills`). Before complex tasks, check these directories for `SKILL.md`. Follow the project-specific patterns, instructions, and examples in these files.

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

Use the Svelte MCP documentation tools as follows:

### 1. list-sections

Use this first to find available documentation sections. It returns titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Fetch the full documentation for relevant sections. Request one or more sections per call.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyze Svelte code for issues and suggested changes.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generate a Svelte Playground link from the supplied code.
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
- `GET /api/v1/releases/desktop/latest` is anonymous and independent of accounts.
  It is disabled by default. It is **not** the legacy `/releases/latest` content feed.
  `ACE_DESKTOP_UPDATES_ENABLED` must remain unset until production signing
  and pinned Windows client checks are ready.
- Only `POST /api/v1/releases/ingest/desktop` takes a CI bearer token;
  `POST /api/v1/admin/installers/{publish-desktop,withdraw-desktop}` require
  Better Auth administrator sessions. The legacy
  `set-downloadable` route cannot promote signed desktop releases.

## Curated Free starter categories (2026-11-08)

The server catalog in `src/lib/server/ace-hosts-site-packs.ts` includes
`pack-gambling-free` and `pack-streaming-free`. The broader Pro lists remain
separate. The source-of-truth builder in sibling `ace-hosts`
publishes these as `site-pack-*-free.zip`; a release must be published
before the catalog can actually sync from GitHub. Do not claim availability
from catalog registration alone.
