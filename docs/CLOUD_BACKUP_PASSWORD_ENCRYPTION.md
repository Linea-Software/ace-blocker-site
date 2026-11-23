# Password-encrypted cloud backups (client-side)

## Protocol, privacy and recovery

Starting with the new cloud backup format, the **Ace Engine** encrypts the
complete local `EngineBackup` before sending it over HTTPS. The backend does
not receive the plaintext backup or a copy of the password in the backup API.
It stores only encrypted ciphertext, salt, nonce, format version, and account
metadata in separate database columns, and returns a versioned JSON envelope.
The same password is requested for each explicit upload or restore on every device.

The versioned API envelope is assembled by the site from separate PostgreSQL
columns (`backups.data` ciphertext including GCM tag, `backups.salt` and
`backups.nonce`), rather than storing the full JSON object in one database cell.

The envelope is:

```json
{
	"format": "ace-cloud-e2ee",
	"formatVersion": 1,
	"algorithm": "aes-256-gcm",
	"kdf": "argon2id",
	"salt": "base64-16-byte-random-salt",
	"nonce": "base64-12-byte-random-nonce",
	"ciphertext": "base64-aes-gcm-output-including-16-byte-tag"
}
```

For each upload, Argon2id v=0x13, m=65536 KiB, t=3, p=1 derives 32 bytes
from the typed password and a new random 16-byte salt. AES-256-GCM uses a
new random 12-byte nonce, AAD
`ace-blocker-cloud-backup:aes-256-gcm:argon2id:v1`, and the full serialized
`EngineBackup`. The ciphertext includes the 16-byte GCM authentication tag.
Versions and algorithms are fixed and checked before key derivation.
Malformed envelopes and incorrect passwords fail closed before import.
No backup encryption key or password is persisted on the client by this flow.

**This is password-based client-side encryption, but not rigorously
zero-knowledge E2EE with the current account system.** The Better Auth email
and password login still sends the account password to the authentication
server over HTTPS, and a compromised server could capture it when the user
logs in. Backup API requests themselves transmit only ciphertext and the
desktop's existing API key. A later change to OPAQUE or another audited PAKE
would require coordinated authentication changes.

A new device can restore a backup with the password used when that backup was
created; it does not need the original device or an external KMS. Changing or
resetting the account password does not update old encrypted backups.
Without the old password, an old backup cannot be decrypted. Restoring an
old backup and uploading with a new account password is possible only while
the original password is known. Password-based encryption also exposes
weak passwords to **offline guessing** if encrypted backups leak; Argon2id
raises the cost but cannot make weak passwords safe.

## Single-baseline migration and rollout

- The Drizzle history is regenerated from scratch: a single `drizzle/0000`
  creates the current complete schema with separate NOT NULL `data`,
  `salt`, and `nonce` columns for cloud backups.
- The API only accepts and returns the current `ace-cloud-e2ee` v1 envelope.
  Old plaintext POSTs and legacy GET responses are **not supported**.
  Old desktop clients must be updated before uploading or restoring.
- The previous plaintext backup format is discontinued. New, non-production
  environments should use a fresh database with the single baseline.
  There is intentionally no compatibility migration for old backup rows.
- Historical PostgreSQL snapshots and remote database archives may still
  contain plaintext backups from before the change until their independent
  retention expires. They are not rewritten by the database migration.
- On upload, a previously encrypted backup must decrypt successfully using
  the entered password before it can be overwritten. This prevents replacing
  a recoverable backup because of a mistyped password.
- On the first encrypted upload, the backup API cannot prove that the
  entered password matches the current account password. Users must retain
  the password they used. Account password reset does not unlock earlier
  encrypted backups.
- Account authentication and Pro entitlement remain required. The server
  does not receive a backup decryption key via this API and does not attempt
  to decrypt or authenticate the encrypted payload itself. The client
  verifies integrity and password correctness using AES-GCM.
- Coordinate the new desktop and website before first production use.
  This clean-slate schema is intended for the current development environment;
  it is not a safe in-place migration for an already populated production database.

## Verification

- Site: `bun run check` and
  `bun x vitest run src/lib/server/api/routers/backups.test.ts`
- Engine: `cargo check -p ace-engine --lib` and
  `cargo test -p ace-engine --lib service::api::backup_encryption::tests`
- Desktop: `cd apps/ace-app && bun run check`, `bun run test:unit`
  and `cargo check -p ace-app --lib`.
- Test real signed-in uploads/restores on two separate devices with a Pro
  test account, including wrong passwords, password changes, fresh and adopted database schemas,
  timezones, tampered ciphertext, oversized payloads and concurrent uploads.

## Operations

No paid KMS or server encryption key is necessary for this feature.
Database snapshots and infrastructure backups retain their own at-rest
encryption and retention controls. Passwords must never be logged, cached
or stored in a settings store; keep them only for the active RPC request and
clear the password field after success, failure or cancellation.

Backup recovery must not silently bypass normal import validations or
locked-policy restrictions. UI and legal text must not call the current
Better Auth arrangement full zero-knowledge E2EE.
