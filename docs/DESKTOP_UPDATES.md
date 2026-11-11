# Ace Blocker desktop MSI releases — server contract (v1)

**Status: implemented, fail-closed, not enabled for production.**
This document defines the server contract. Read it with
`ace-blocker/docs/PRODUCT_UPDATES.md` and
`ace-blocker/crates/ace-update-security/src/lib.rs`.
This server does **not** execute MSI files with elevated privileges.
Unattended installation is not ready.
Never store an Ed25519 private release key on the server.

## Public API and backwards compatibility

`GET https://aceblocker.com/api/v1/releases/desktop/latest?os=windows&architecture=x64&channel=stable`

- **200:** Return the exact signed JSON envelope (`payload`, `signature`, `key_id`).
  Do not require a user session, API key, Pro entitlement, payment, signed URL,
  or download token.
- **304:** Return this status when `If-None-Match` matches the envelope ETag.
  `Cache-Control: public, no-cache, must-revalidate` requires shared caches
  to revalidate the response.
- **204:** Return no body if no release is approved or if the highest version
  ever distributed was withdrawn. **Never return an older version as fallback.**
- **400:** Reject unsupported targets or channels. v1 supports only Windows/x64/stable/MSI.
- **503:** Return this status if the operator has not enabled desktop updates
  or the signing trust configuration is missing. Do not challenge anonymous clients for authentication.
- Keep unexpected server and database failures as 5xx errors. Never interpret
  a failure as permission to deliver an unsigned update. The website process
  must never return MSI bytes.

**Client integration note:** The current Rust `fetch_verified_release` treats
an empty 204 response as a malformed envelope, not `UpToDate`.
Before production release, the desktop owner must handle 204 and 304 explicitly.
The desktop owner must also add a revocation and version-floor policy.
Do **not** return unsigned empty JSON or an older signed release as a workaround.

Keep `GET /api/v1/releases/latest` **unchanged**. It supplies the content
updater for site packs and Resistance Mode.
Keep legacy installer uploads, the admin toggle, and public manual downloads
compatible. A legacy installer with `canBeDownloaded=true` is **not** eligible
for signed desktop updates.

## Exact v1 signature contract

Response envelope:

```json
{
	"payload": "BASE64_OF_EXACT_SIGNED_UTF8_JSON_BYTES",
	"signature": "BASE64_OF_64_ED25519_SIGNATURE_BYTES",
	"key_id": "ace-stable-v1"
}
```

The following decoded payload is **fictional and invalid for production**.
Its digests are placeholders. It is not a valid signed release:

```json
{
	"architecture": "x64",
	"channel": "stable",
	"minimumInstalledVersion": null,
	"os": "windows",
	"packageUrl": "https://cdn.aceblocker.com/ace-blocker-installer/signed/windows/x64/1.10.0/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.msi",
	"publisherCertificateSha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
	"schemaVersion": 1,
	"sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
	"version": "1.10.0"
}
```

An **intentionally invalid illustrative signature** is
`AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==`.
Never copy this example into release metadata or a trust store.

1. Build the payload with exactly these **nine** camelCase fields.
   Use ASCII values. Reject unknown, missing, and duplicate keys.
   Serialize with sorted ASCII keys and no whitespace:
   `json.dumps(..., sort_keys=True, separators=(',', ':'), ensure_ascii=True)`.
2. Sign **exactly** this byte sequence with Ed25519:
   `ASCII("ace-blocker-windows-msi-release-v1") || 0x00 || payload_JSON_UTF8`.
   Never reserialize JSON after signature verification.
   Never sign a mutable HTTP response object.
   Put every critical field inside the signed payload.
3. Encode `payload` and `signature` with **padded standard RFC 4648 base64**.
   Use `key_id` to select a **client-embedded**, approved public key.
   Reject unknown key IDs. Limit signed payloads to 16 KiB.
4. Require strict stable three-part SemVer (`major.minor.patch`).
   Each component must be an unsigned 64-bit integer.
   Reject prerelease/build suffixes, lexical version ordering, and downgrades.
   Require the **exact** configured public CDN origin followed by
   `ace-blocker-installer/signed/windows/x64/<version>/<sha256>.msi`.
   Include the deployment's `dev/` prefix when applicable.
5. Match the approved publisher certificate's DER SHA-256 fingerprint to both
   the server policy and the desktop binary's pinned publisher identity.
   Before any installation, the client **must** verify the MSI content SHA-256
   **and** its Windows Authenticode signer.

**v1 compatibility limitation:** The checked-in Rust verifier uses
`deny_unknown_fields`. It does **not** accept `artifactId`, `fileSize`,
`publishedAt`, `packageType`, `minimumUpdaterVersion`, or a signed revocation
floor in the payload.
PostgreSQL stores the authoritative server values, but v1 clients do **not**
receive them as signed inputs. The client limits download size and verifies the
signed SHA-256. It does not verify a signed expected byte count.
Do not add these values to a v1 response as unverified safety claims.
To authenticate them, create an explicitly versioned v2 signature contract,
update the offline signer, and update the Rust verifier.
Resolve this limitation before claiming the complete extended metadata contract
has shipped.

## Preparation, CI upload, and signer custody

Required **server** settings (leave them unset until you verify production readiness):

| Environment variable                             | Meaning                                                                                                                |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `ACE_DESKTOP_UPDATES_ENABLED=true`               | Explicit enable after production readiness; default disabled                                                           |
| `ACE_DESKTOP_UPDATE_PUBLIC_KEYS`                 | JSON map of approved key IDs to 64-hex Ed25519 **public** keys, e.g. `{"ace-stable-v1":"<32-byte-public-key-in-hex>"}` |
| `ACE_DESKTOP_PUBLISHER_CERT_SHA256`              | Approved Authenticode signing certificate SHA-256, lowercase/uppercase hex                                             |
| `ACE_RELEASE_INGEST_TOKEN`                       | Existing token, exclusively for authenticated CI ingest                                                                |
| `ACE_DESKTOP_STAGING_ZONE`                       | Separate **private**, pull-zone-unattached Bunny Storage zone                                                          |
| `ACE_DESKTOP_STAGING_ACCESS_KEY`                 | Least-privilege storage access to that private zone                                                                    |
| `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_ACCESS_KEY` | Existing public release storage zone/access                                                                            |
| `BUNNY_CDN_BASE_URL`                             | Public HTTPS CDN host, no tokenized downloads                                                                          |

The **client build** pins `ACE_RELEASE_MANIFEST_PUBLIC_KEY_HEX`,
`ACE_RELEASE_PUBLISHER_CERT_SHA256`, and
`ACE_RELEASE_MANIFEST_URL=https://aceblocker.com/api/v1/releases/desktop/latest`.
The desktop repository documents these values.
Keep release signing separate from entitlement JWT signing.
Never send the private release-signing key to the VPS, website environment,
Git, a public CI job, or a debug log.
Use an operator-controlled offline signer or HSM. Require an independent
review by two people. Record signer provenance and approvals outside mutable
GitHub Actions claims.

**Procedure** for CI and trusted release operators:

1. Produce the final Authenticode-signed Windows/x64 MSI.
   On a trusted Windows runner, verify the pinned signing certificate.
   Compute SHA-256 of the _final_ signed bytes.
   Never use the checksum from an unsigned or pre-signing MSI.
2. Determine the immutable future public URL, for example:
   `https://cdn.aceblocker.com/ace-blocker-installer/signed/windows/x64/1.10.0/<sha256>.msi`.
   In the desktop repository, run `installer/release_manifest.py prepare`
   with that URL, version, and pinned publisher fingerprint.
   The command creates `release-payload.json` and the exact
   `release-signing-input.bin` for offline signing.
   Run `release_manifest.py assemble` with the detached Ed25519 signature
   and approved `key_id`. **Do not treat `assemble` as signature verification.**
   Independently verify the signature before submission.
3. Upload the MSI **directly** from the protected CI runner to the private
   Bunny Storage API. Use its dedicated AccessKey. Never send the MSI through
   the VPS:
   `PUT https://storage.bunnycdn.com/PRIVATE_ZONE/desktop-updates/<version>/<sha256>.msi`.
   Keep this zone separate from every public pull zone. A hard-to-guess URL
   does not make a public zone private.
4. POST a **small JSON** document to
   `https://aceblocker.com/api/v1/releases/ingest/desktop`, with
   `Authorization: Bearer <ACE_RELEASE_INGEST_TOKEN>` and:
    ```text
    {
        "envelope": {
            "payload": "<base64 canonical payload>",
            "signature": "<base64 detached Ed25519 signature>",
            "key_id": "ace-stable-v1"
        },
        "stagingKey": "desktop-updates/1.10.0/<sha256>.msi",
        "size": 12345678,
        "sourceRepository": "Linea-Software/ace-blocker",
        "sourceCommit": "<40-hex Git commit>",
        "sourceRunId": "<workflow run id>"
    }
    ```
    The server checks the token with constant-time comparison.
    Limit ingest to six authenticated requests per minute and two concurrent
    inspections per process. Limit JSON to 16 KiB.
    Send a valid explicit HTTP `Content-Length`. Without it, return HTTP 411.
    Reject chunked or unknown-length JSON before parsing the body.
    Enforce the same size limit in the reverse proxy.
    Treat CI provenance fields as **untrusted declarations** for audit only.
    Never use them as authority.
5. Before inserting the candidate and audit row in one database transaction,
   verify the signature, target, version, expected public URL, publisher pin,
   and staging key. Stream MSI bytes **from the private storage object**.
   Verify the MSI header, bytes, size, and SHA-256. Successful result:
   `201 {"success":true,"id":"<UUID>","state":"staged"}`.
   Return 400 for invalid input, 409 for duplicates, and 401 for authentication
   failures. Return 503 for disabled or failed Bunny storage.
   Return 413 or 429 for limit violations.
   A DB partial unique index prevents concurrent signed target/version
   reservations. Reuse of a legacy target/version is also rejected during
   normal ingest. Only a protected operator can approve publication.

Unlike the legacy `POST /api/v1/releases/ingest/installer`, the signed route
must **not** transfer large MSI files through SvelteKit/Bun or call
`file.arrayBuffer()`. Existing CI jobs can use the legacy route for legacy
candidates until migration.
The website still has a 100 MiB in-memory installer uploader. Never use it
for secure signed releases. PostgreSQL's 32-bit `size` column limits MSI files
to `2147483647` bytes (just under 2 GiB).

## Admin publication: local development versus production

Show publication requirements for each row in the admin installer list.
When **Make available** is disabled, show why. Possible reasons are an unverified
artifact, a withdrawn signed release, a missing Linux companion, a legacy build,
or a platform linked to a signed Windows release.

**Local development:** Allow manual Windows x64 MSI and Linux x64 tar.gz uploads
only in a SvelteKit development build with `NODE_ENV=development` and a
**local PostgreSQL database**.
Before upload, validate the installer's structure and format.
Mark a row downloadable only when `artifact_validated_at` is set.
Never promote an unsigned development release to the signed desktop update feed.
Store development files in the existing Bunny `/dev/` namespace.
Changing `NODE_ENV` must not enable manual publication in a production build.

**Production/release:** Allow **only Linux companion bundles** in the ordinary
admin upload form. The API must reject manual Windows MSI uploads. A valid MSI
file structure does not prove a valid Authenticode signature.
For Windows publication, use trusted external Windows Authenticode verification,
the offline Ed25519 signer, private staging upload, and
`POST /api/v1/releases/ingest/desktop`.
The verified candidate appears as `staged` in the admin installer list.
Upload exactly one validated Linux companion with the same version.
Select **Make available** on the signed Windows candidate.
Before publishing both artifacts atomically, the backend must revalidate the
staged MSI and Linux companion.

In production, the admin UI must not accept a bare "signed" checkbox,
a developer-supplied manifest signature, or unsigned Windows binaries.
The Linux website cannot independently verify Windows Authenticode.
Complete trusted Windows verification before signed ingest.
**Never replace that verification with an MSI-header check.**

## Required installer artifacts and publication readiness

The admin upload supports only **Windows x64 MSI**
(`AceBlocker-<version>.msi`) and **Linux x64 tar.gz**
(`AceBlocker-<version>-linux-x64.tar.gz`).
GitHub Actions downloads include a ZIP wrapper around the platform file.
Upload the platform file, not the ZIP wrapper.
Do not enable other architectures or macOS in this workflow.

Set `artifact_validated_at` only after the server inspects the uploaded file.
For Windows, check the MSI compound-file header.
For Linux, parse gzip/tar safely without extraction. Reject links, path
traversal, duplicate entries, and unsupported entries. Verify required payload
files and x64 ELF headers. Limit expanded bytes.
Do not rely only on file names or MIME types. Limit uploads to 100 MiB.
Keep existing rows **unverified** (NULL). Do not automatically approve them.

Before approval of a signed Windows desktop release, require **exactly one**
server-validated Linux tarball with the same version.
Recheck the Linux storage bytes, SHA-256, size, and structure.
Reject mismatched non-null CI source commits.
Commit Windows publication and the Linux public-download flag in one database
transaction. On withdrawal, disable both.
The server checks published Linux packages for structure, but no v1 Linux
manifest signs them separately. Do not call them authenticated Linux updates.

Do not publish legacy Windows MSI rows with the simple `set-downloadable`
toggle. Publish signed Windows releases only through `publish-desktop`, after
trusted external signing and approval of a signed envelope.
The website checks signed metadata and stored MSI bytes. It **does not verify
Windows Authenticode independently on Linux**.
Run the pinned Authenticode verifier in the trusted Windows signing stage
before ingest. Production signing and automatic installation remain separate
gated deliverables.

## Manual publication, withdrawal, audits

- An actual Better Auth `admin` session is required by the admin router
  **and checked again by** the signed-release actions:
  `POST /api/v1/admin/installers/publish-desktop` with
  `{"id":"<staged UUID>"}` and
  `POST /api/v1/admin/installers/withdraw-desktop` with the same body.
- Claim a staged row with an atomic `staged -> publishing` update.
  Use a partial PostgreSQL unique index to prevent concurrent publication of
  two versions for the same target/channel.
  Verify immutable row-to-signature consistency and revalidate the private MSI.
  Reject reuse of an older version that was already distributed.
  Stream the package once to its immutable public hash-based path.
  Rehash the **public storage bytes** and check the **anonymous public pull-zone HEAD**
  before committing and announcing `published`.
  After a failure, return the row to `staged`. Attempt best-effort deletion of
  partial CDN output, including after a failed database commit following promotion.
  A crash can leave a row in `publishing`. An operator must investigate it.
  Never promote such a row automatically after restart.
- After approval, let the legacy manual installer download route recognize
  the new content-addressed public MSI path.
  Never use the Bunny Storage API URL as a public download URL.
- Use `staged`, `publishing`, `published`, and `withdrawn` for signed release
  states. Migrate existing rows to `legacy`.
  Show only explicitly published, valid, signed versions in desktop discovery.
  The old `set-downloadable` toggle **must refuse** signed rows.
  Never delete signed historical records through the legacy installer route.
- Record release ID, actor (`ci:ingest-token` or Better Auth admin user ID),
  action, outcome, and UTC timestamp in persistent `desktop_release_audit` rows.
  Write errors to redacted Pino logs. Never log passwords, storage credentials,
  private signing keys, or bearer tokens.
- Withdrawal is permanent in v1. Invalidate both desktop and legacy installer
  caches when a release is withdrawn.
  Keep the withdrawn highest release as the **version floor** for feed selection.
  Never silently propose an older, potentially vulnerable release.
  To restore service, sign and publish a strictly **higher** version. This
  requirement also applies if that release intentionally reverts application changes.
- An API change cannot revoke an MSI already downloaded or stored in a CDN
  edge cache. For emergency removal, purge or remove CDN objects and publish
  security notices. Apply a _client-side privileged persistent revocation floor_
  before enabling automatic execution.
- Keep the website cache local to each process. Reload it at startup and
  invalidate it immediately after publication or withdrawal.
  Before scaling to multiple processes, implement inter-instance invalidation.
  Never deploy replicas with independent stale release caches.

## BunnyCDN and production gates

Serve **only** the approved final hash-addressed MSI from the existing public
Bunny CDN. Never require a token, signed expiry, login, or license check on
this signed update path. Never redirect to a user-supplied URL.
Configure public reads for `ace-blocker-installer/signed/` without Bunny URL
Token Authentication. Test anonymous HEAD and GET on the configured public host
before you enable the client.
Keep the staging storage zone **physically private** and separate from public
pull zones. Rate-limit and monitor authenticated staging operations.
CDN integrity at rest remains an operational responsibility. Each client must
independently verify the release signature, MSI hash, and Windows publisher
certificate.

Never rotate release-signing keys by returning an unauthenticated public key
from this server. A future trusted desktop build must embed or authorize the
new root. Distribute that build in a release signed by the previously trusted
root. Overlap old and new releases during the transition.
The current client verifier accepts one key. Server-only rotation is unsafe.
After key compromise, use a separately reviewed recovery and distribution
channel.

**Keep `ACE_DESKTOP_UPDATES_ENABLED` unset** until independent verification of
all production gates: offline/HSM Ed25519 signing, the pinned client release
key, the pinned Authenticode publisher, private staging storage, anonymous public
pull-zone downloads, signed CI packaging, manual approval, client 204 handling,
a client rollback floor, and a safe privileged MSI installer.
This code and its tests do **not** prove Windows installer safety, rollback
of installed software, or the integrity of production credentials.
Server tests use no VMs, manual Windows installation, or production releases.
