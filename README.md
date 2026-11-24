# Ace Blocker Site

SolidJS 2.0 (SSR) marketing website, account portal, subscription checkout and API for Ace Blocker.

> **SolidJS 2 migration:** The website uses SolidJS 2 with Vite start mode. Legacy Svelte source, routing, tooling and browser tests have been removed. See the architecture document for verification scope and remaining deployment checks.

## Architecture

The website runs on **Bun + Vite 8** using **SolidJS 2.0** and `@solidjs/vite-plugin` start mode with SSR, server functions and a Node-compatible Bun production handler. `filesystem-routing` powers pages and selected HTTP handlers. `src/middleware.ts` delegates `/api/*` (except native device-link handlers) to **Elysia**; `/api/auth/*` is served by **Better Auth** through Elysia. PostgreSQL/Drizzle, Paraglide, DodoPayments and BunnyCDN provide persistence, localization, billing and distribution.

**Read [docs/SOLIDJS_2_ARCHITECTURE.md](docs/SOLIDJS_2_ARCHITECTURE.md)** for request routing, SSR/hydration, server/client boundaries, auth/payments, security invariants, testing and deployment. [AGENTS.md](AGENTS.md) documents product behavior and mandatory conventions; [docs/ui-identity.md](docs/ui-identity.md) defines the visual system. Start new components as Solid `.tsx` with `@lucide/solid`, not Svelte components or SvelteKit `+page` files.

## Local development

Install [Bun](https://bun.sh/) and Docker with the Docker Compose plugin. Start the Docker daemon, then run from the repository root:

```sh
bun install
bun run setup
bun run dev
```

`bun run setup` checks for NSS `certutil` (needed for trusting local HTTPS certificates), creates or updates `.env`, starts the local PostgreSQL container and applies database migrations. The development site is served at `https://localhost:5173/`. `vite.config.ts` validates the development environment before serving; `src/lib/server/bootstrap.ts` independently validates and initializes the site on first request. Do not start a second dev server if one is already running.

**Local development admin:** `bun run setup` also fills in missing or empty `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_USERNAME` and `DEFAULT_ADMIN_PASSWORD` settings. After `bun run dev` initializes the database, sign in at [https://localhost:5173/signin](https://localhost:5173/signin) with **`dev@example.com` / `dev-password`** (unless you provided custom credentials in `.env`). There is no separate provisioning command or manual email verification in development. Existing accounts are promoted to admin and verified without resetting their passwords; if the account already exists, continue using its original password. Never expose the development server or its default credentials on a public network.

Development fixtures run **only against a local PostgreSQL URL** (`localhost`, `127.0.0.1` or `::1`) and abort startup if the database is remote or the environment is marked as production. A custom `DEFAULT_ADMIN_EMAIL` requires a custom `DEFAULT_ADMIN_PASSWORD` (at least 12 characters); otherwise the setup aborts instead of assigning a publicly known password to a custom address. The production administrator must still be provisioned separately via `bun run provision-admin` / the VPS setup workflow.

On Linux the script detects the distribution through `/etc/os-release` (falling back to `/usr/lib/os-release`) and installs the missing NSS tools with the appropriate package manager:

| Distribution family                                 | Package manager | NSS tools package   |
| --------------------------------------------------- | --------------- | ------------------- |
| Debian, Ubuntu, Linux Mint and derivatives          | `apt`           | `libnss3-tools`     |
| Arch, Manjaro, EndeavourOS, CachyOS and derivatives | `pacman`        | `nss`               |
| Fedora, RHEL and derivatives                        | `dnf`           | `nss-tools`         |
| openSUSE                                            | `zypper`        | `mozilla-nss-tools` |
| Alpine                                              | `apk`           | `nss-tools`         |

If `certutil` is already installed, no system packages are changed. Installation may request a sudo password. Unsupported Linux distributions can install NSS `certutil` manually before running setup. On Arch, the script does not perform an automatic system-wide upgrade; if the package database is outdated, run `sudo pacman -Syu` yourself before retrying.

**Note:** VPS provisioning and updates live in the private `Linea-Software/ace-infra` repository. The app-owned production interfaces remain `scripts/setup-env.ts`, database migrations and the build. See `docs/DEPLOY.md` for the boundary. The private provisioning targets Debian/Ubuntu only.

The **development server will refuse to start** if any required environment variable is absent, blank or whitespace-only. It prints a `[ACE ENV ERROR]` message listing the missing keys (never their values). Configure `.env` before launching `bun run dev`; `bun run setup` creates the file, but empty credential placeholders must be filled in. This includes Dodo Payments, Resend and BunnyCDN credentials. In development, `BETTER_AUTH_URL` is unnecessary because Better Auth falls back to `PUBLIC_BETTER_AUTH_URL`, and `ORIGIN` is excluded from development validation; neither is required by the dev startup check. Both remain mandatory in the **current production schema**. Verify the trusted origin/proxy values with the Solid SSR server before deployment. Configure `PUBLIC_BETTER_AUTH_URL` for the local HTTPS origin. An absent optional `ACE_RELEASE_INGEST_TOKEN` or development-admin fixture credential does not block startup.

The startup check verifies **presence**, not that external API credentials work; production keeps its stricter URL/secret validation. Tests, builds and configuration scripts do not require live provider credentials. The database and Docker are still required.

### Single Drizzle baseline (development)

The Drizzle migration history has been regenerated into **one initial migration**:
`drizzle/0000_amazing_the_hand.sql`. It creates the full schema, including the
cloud-backup columns `data` (ciphertext), `salt` (Argon2id) and `nonce`
(AES-GCM), each NOT NULL. Old backup formats and old migration chains are
intentionally unsupported.

For a fresh **development** database, run `bun run setup` or `bun run
db:migrate`. The migration command checks the database history before
applying SQL; if it detects older migrations on an existing database, it
stops rather than attempting to create tables that already exist.

The current local development database has been aligned with this baseline.
If you recreate a local test environment, initialize a new empty database.
Never run the initial migration against an existing database without verifying
its contents. The VPS database is outside this development reset and has not
been changed by these instructions.

## Site pack synchronization

The production site **pulls** the canonical site-pack ZIPs from the latest public
[`Linea-Software/ace-hosts` GitHub Release](https://github.com/Linea-Software/ace-hosts/releases/latest).
The `ace-hosts` workflow only builds and publishes GitHub release assets; it
does **not** push them to the website. The site mirrors the 14 known
`site-pack-*.zip` assets to BunnyCDN using the existing site-pack paths and
database records. Each ZIP's SHA-256 must match its GitHub release digest or
`sha256_checksums.txt` entry before any upload. Already-matching hashes are
skipped, so regular syncs do not rewrite unchanged files. Once the consolidated
Anime/Manga Pro release is available and synced, the superseded Extended asset
is removed from BunnyCDN and its database catalog record is deleted.

- **Startup:** the production server runs a sync from `src/lib/server/bootstrap.ts:initializeSite()` during its first request initialization.
  Errors are logged without preventing startup; the existing cached records
  remain available.
- **Monthly:** while the production server runs, it schedules a sync on the
  **2nd day of each month at 04:00 UTC** (after the upstream 1st-day release).
  The timer is process-local: keep the app process running, or restart it to
  trigger startup sync after downtime.
- **On demand:** an administrator can select **Admin → Releases → Site Packs →
  Sync from GitHub**, which submits an async POST to
  `/api/v1/admin/site-packs/sync`. The protected
  `/api/v1/admin/site-packs/sync-status` endpoint reports progress and the
  result. A running job cannot be started a second time on the same process.

The existing administrator file-upload operation remains a separate manual
fallback; GitHub Actions does not invoke it. No GitHub write token or
GitHub-to-site upload webhook is required for site pack synchronization.
BunnyCDN storage credentials must be configured on the website.

## Verification

The current package scripts use Paraglide compilation and `tsc --noEmit` (not `svelte-check` or `svelte-kit sync`). Run after the code migration is complete:

```sh
bun run check
bun run lint
bun run test:unit -- --run
bun run build
bun run test:e2e
```

The Playwright runner creates a disposable PostgreSQL container, temporary HTTPS proxy, generated test keys and isolated provider fixtures. It builds and exercises the actual production server artifact without reading the local .env or using production services. Docker and Chromium must be installed. Run a subset with `bun run test:e2e -- e2e/device-link.spec.ts`. Verify direct SSR loads, localized pages, auth/admin denials, device-link HTTP endpoints, payment/webhook invariants, client hydration and mobile/light/dark UI parity; the migrated browser specs exercise Solid 2 components directly. See the [architecture verification matrix](docs/SOLIDJS_2_ARCHITECTURE.md#10-verification-gates-must-be-rerun-not-claimed-completed).

The commands above are **recommended checks**, not a claim of a green migration. See [docs/DEPLOY.md](docs/DEPLOY.md) for production application interfaces and the private `ace-infra` operations boundary.
