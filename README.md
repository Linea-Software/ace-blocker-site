# Ace Blocker Site

SvelteKit website, account portal, and API for Ace Blocker.

## Local development

Install [Bun](https://bun.sh/) and Docker with the Docker Compose plugin. Start the Docker daemon, then run from the repository root:

```sh
bun install
bun run setup
bun run dev
```

`bun run setup` checks for NSS `certutil` (needed for trusting local HTTPS certificates), creates or updates `.env`, starts the local PostgreSQL container and applies database migrations. The development site is served at `https://localhost:5173/`.

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

**Note:** `scripts/setup-vps.sh` is a separate, Debian/Ubuntu-specific production server provisioning script. It has not been adapted to Arch or other server distributions; do not use it there.

The **development server will refuse to start** if any required environment variable is absent, blank or whitespace-only. It prints a `[ACE ENV ERROR]` message listing the missing keys (never their values). Configure `.env` before launching `bun run dev`; `bun run setup` creates the file, but empty credential placeholders must be filled in. This includes Dodo Payments, Resend and BunnyCDN credentials. In development, `BETTER_AUTH_URL` is unnecessary because Better Auth falls back to `PUBLIC_BETTER_AUTH_URL`, and `ORIGIN` is only used by SvelteKit's production Node adapter; neither is required by the dev startup check. Both remain mandatory in production. Configure `PUBLIC_BETTER_AUTH_URL` for the local HTTPS origin. An absent optional `ACE_RELEASE_INGEST_TOKEN` or development-admin fixture credential does not block startup.

The startup check verifies **presence**, not that external API credentials work; production keeps its stricter URL/secret validation. Tests, builds and configuration scripts do not require live provider credentials. The database and Docker are still required.

### Existing local databases and rebased migrations

If the Docker database already has an older Drizzle migration history, the checked-in `0000` migration may otherwise attempt to recreate existing tables. `bun run setup` now runs `bun scripts/db-baseline.ts` before `bun run db:migrate`. This local-only reconciliation:

- Verifies that the existing tables, columns, indexes, constraints and enums match the committed baseline.
- Preserves all existing migration records and adds the current baseline record only after validation.
- Removes the obsolete Better Auth `account.issuer` column only when its table has **zero rows**, inside the same transaction. If account records exist or the database has any unexpected schema differences, it refuses to change the database.
- Requires a local `DATABASE_URL` whose database name matches `POSTGRES_DB`; it cannot be used as a production migration repair mechanism.

Run `bun scripts/db-baseline.ts --dry-run` to inspect a legacy database without modifying it. Never delete the database or manually edit Drizzle history to resolve a rebase until you have checked the actual schema and made a backup.

## Site pack synchronization

The production site **pulls** the canonical site-pack ZIPs from the latest public
[`Linea-Software/ace-hosts` GitHub Release](https://github.com/Linea-Software/ace-hosts/releases/latest).
The `ace-hosts` workflow only builds and publishes GitHub release assets; it
does **not** push them to the website. The site mirrors the 15 known
`site-pack-*.zip` assets to BunnyCDN using the existing site-pack paths and
database records. Each ZIP's SHA-256 must match its GitHub release digest or
`sha256_checksums.txt` entry before any upload. Already-matching hashes are
skipped, so regular syncs do not rewrite unchanged files.

- **Startup:** the production server runs a sync during `hooks.server.ts:init`.
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

```sh
bun run check
bun run lint
bun run test:unit -- --run
bun run build
```

See [docs/DEPLOY.md](docs/DEPLOY.md) for supported production deployment instructions.
