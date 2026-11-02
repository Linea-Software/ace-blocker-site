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

Development keys for Resend, BunnyCDN and Dodo Payments can be left unset, but their respective features will remain unavailable. The database and Docker are still required.

### Existing local databases and rebased migrations

If the Docker database already has an older Drizzle migration history, the checked-in `0000` migration may otherwise attempt to recreate existing tables. `bun run setup` now runs `bun scripts/db-baseline.ts` before `bun run db:migrate`. This local-only reconciliation:

- Verifies that the existing tables, columns, indexes, constraints and enums match the committed baseline.
- Preserves all existing migration records and adds the current baseline record only after validation.
- Removes the obsolete Better Auth `account.issuer` column only when its table has **zero rows**, inside the same transaction. If account records exist or the database has any unexpected schema differences, it refuses to change the database.
- Requires a local `DATABASE_URL` whose database name matches `POSTGRES_DB`; it cannot be used as a production migration repair mechanism.

Run `bun scripts/db-baseline.ts --dry-run` to inspect a legacy database without modifying it. Never delete the database or manually edit Drizzle history to resolve a rebase until you have checked the actual schema and made a backup.

## Verification

```sh
bun run check
bun run lint
bun run test:unit -- --run
bun run build
```

See [docs/DEPLOY.md](docs/DEPLOY.md) for supported production deployment instructions.
