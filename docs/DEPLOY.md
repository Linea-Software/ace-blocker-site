# Production deployment

VPS provisioning, host configuration, and production update procedures are maintained in the private **Linea-Software/ace-infra** repository.

This website repository contains the **application** and local development tools. It does not own production SSH settings, UFW rules, Nginx, Certbot, database backup jobs or systemd unit files.

## Application-owned deployment interfaces

- `bun scripts/setup-env.ts` — configure and validate the production environment. Creates or reuses a persistent production entitlement-signing key pair; do not rotate this pair during ordinary deployments.
- `bun run db:migrate` — safely apply reviewed database migrations; a read-only guard refuses to replay the regenerated initial `0000` on databases with old migration history. Require an independently restorable pre-migration backup.
- `bun run build` — build the production SvelteKit application.
- `bun run provision-admin` — initial administrator provisioning; not an ordinary deployment step.
- `compose.yaml` — the versioned PostgreSQL development template and source input for root-owned production Compose configuration.
- `Dockerfile` — container packaging option. The current documented production path uses the Bun application service.

Do **not** run `bun run setup` against a production database. It is for local development only.

### New migration baseline

The current `drizzle/0000` is a clean initial schema for an empty database,
not an incremental migration. Its `backups` table stores ciphertext, Argon2id
salt, and AES-GCM nonce in distinct non-null columns.

The production VPS has **not** been migrated or modified by this development
change. Before any future production rollout, review the actual database and
establish an appropriate deployment procedure; **do not** blindly replay
`drizzle-kit migrate` over existing tables. The built-in read-only migration
guard refuses incompatible histories.

## VPS runbooks

Authorized operators: consult the private `ace-infra/docs/BOOTSTRAP.md`, `ace-infra/docs/UPDATE.md`, and `ace-infra/docs/RECOVERY.md`. These cover new-server provisioning, updates, encrypted backups, verification and recovery.

The old `scripts/setup-vps.sh` and `scripts/vps/` directory were retired from this repository when infrastructure ownership moved. Their old versions may still exist in Git history; do not use an old commit as a new VPS installation guide.

Do not place host credentials, deployment secrets, TLS private keys or backup files into this repository.
