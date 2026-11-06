# Ace Blocker desktop MSI releases — server contract (v1)

**Status: implemented, fail-closed, not enabled for production.** This document
is the server-side counterpart of `ace-blocker/docs/PRODUCT_UPDATES.md` and
`ace-blocker/crates/ace-update-security/src/lib.rs`. It does **not** implement
privileged MSI execution or claim that unattended installation is ready.
The server never holds an Ed25519 private release key.

## Public API and backwards compatibility

`GET https://aceblocker.com/api/v1/releases/desktop/latest?os=windows&architecture=x64&channel=stable`

- **200**: exact signed JSON envelope (`payload`, `signature`, `key_id`).
  No user session, API key, Pro entitlement, payment, signed URL or download token.
- **304** when `If-None-Match` matches the envelope ETag. `Cache-Control:
public, no-cache, must-revalidate` requires revalidation even on shared caches.
- **204**, with no body: no approved release, or the highest historically
  distributed version has been withdrawn. **Never fall back to an older version.**
- **400** for any unsupported target/channel; v1 only supports Windows/x64/stable/MSI.
- **503** when the operator has not explicitly enabled desktop updates or when
  signing trust configuration is missing. No anonymous authentication challenges.
- Unexpected server/database failures remain 5xx and must not be treated as
  unsigned update permission. No MSI is ever returned by the website process.

**Client integration note:** The current Rust `fetch_verified_release` treats an
empty 204 body as a malformed envelope, rather than `UpToDate`. Before
production rollout, the desktop owner must add explicit 204/304 handling and a
revocation/version-floor policy. Do **not** work around this by serving an
unsigned empty JSON payload or an older signed release.

`GET /api/v1/releases/latest` is **unchanged** and still feeds the content
updater (site packs and Resistance Mode). The legacy installer upload,
admin toggle and public manual download remain compatible. Legacy installers
do not become eligible for signed desktop updates merely because
`canBeDownloaded=true`.

## Exact v1 signature contract

Response envelope:

```json
{
	"payload": "BASE64_OF_EXACT_SIGNED_UTF8_JSON_BYTES",
	"signature": "BASE64_OF_64_ED25519_SIGNATURE_BYTES",
	"key_id": "ace-stable-v1"
}
```

A **fictional, invalid-for-production** decoded payload, illustrated with
placeholder digests (not a valid signed release):

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

1. Build the payload from precisely these **nine** camelCase fields. Values
   must be ASCII. Reject unknown, missing or duplicate keys. The payload is
   serialized with sorted ASCII keys, no whitespace,
   `json.dumps(..., sort_keys=True, separators=(',', ':'), ensure_ascii=True)`.
2. Ed25519 signs **exactly**
   `ASCII("ace-blocker-windows-msi-release-v1") || 0x00 || payload_JSON_UTF8`.
   There is no JSON reserialization after signature verification, no
   signature over a mutable HTTP response object, and no unhashed critical
   field outside the payload.
3. `payload` and `signature` use **padded standard RFC 4648 base64**.
   `key_id` selects a **client-embedded**, approved public key. Unknown
   key IDs fail verification. Signed payloads are max 16 KiB.
4. Versions are strict three-component stable SemVer (`major.minor.patch`)
   with unsigned 64-bit components. Neither prerelease/build suffixes,
   lexical version ordering, nor downgrades are accepted. Package URL is
   **exactly** the configured public CDN origin followed by
   `ace-blocker-installer/signed/windows/x64/<version>/<sha256>.msi`,
   including the deployment's `dev/` prefix when applicable.
5. The approved publisher certificate's DER SHA-256 fingerprint must agree
   with both the server's configured policy and the desktop binary's pinned
   publisher identity. The client MUST verify the MSI content SHA-256 **and**
   its Windows Authenticode signer before any eventual install operation.

**v1 compatibility limitation:** The currently checked-in Rust verifier uses
`deny_unknown_fields` and does **not** accept `artifactId`, `fileSize`,
`publishedAt`, `packageType`, `minimumUpdaterVersion` or a signed
revocation floor in the payload. Their authoritative server-side values are
stored in PostgreSQL, but are **not signed v1 client inputs**. In particular,
the client bounds file downloads and checks their signed SHA-256, but does not
validate a signed expected byte count. Do not add them to a v1 response as
unauthenticated safety claims. A future explicitly versioned v2 signing
contract, updated offline signer and updated Rust verifier are required to
authenticate those fields. This limitation must be resolved before claiming
the complete extended metadata contract has shipped.

## Preparation, CI upload, and signer custody

Required **server** settings (leave absent/unset until thoroughly vetted):

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
`ACE_RELEASE_MANIFEST_URL=https://aceblocker.com/api/v1/releases/desktop/latest`
as documented in the desktop repo. Do not confuse release signing with
entitlement JWT signing. Never send a release-signing private key to the VPS,
website env, Git, a public CI job, or a debug log. Provision it via an
operator-controlled offline signer/HSM with independent two-person review;
record signer provenance and approvals outside mutable GitHub Actions
claims.

**Procedure** for CI and trusted release operators:

1. Produce a final, Authenticode-signed Windows/x64 MSI and verify the pinned
   signing certificate on a trusted Windows runner. Compute SHA-256 of the
   _final_ signed bytes. A checksum of a pre-signing MSI is invalid.
2. Determine the immutable future public URL, e.g.
   `https://cdn.aceblocker.com/ace-blocker-installer/signed/windows/x64/1.10.0/<sha256>.msi`.
   Use the desktop repository's
   `installer/release_manifest.py prepare` with that URL, version and pinned
   publisher fingerprint. It emits `release-payload.json` and the exact
   `release-signing-input.bin` to be signed offline. Use
   `release_manifest.py assemble` with the detached Ed25519 signature and
   approved `key_id`. Its `assemble` command is **not** a verification
   ceremony; independently verify the signature before submitting.
3. Upload the MSI **directly** from the protected CI runner into the private
   Bunny Storage API using its dedicated AccessKey (never via the VPS):
   `PUT https://storage.bunnycdn.com/PRIVATE_ZONE/desktop-updates/<version>/<sha256>.msi`.
   The zone must be separated from all public pull zones, not merely placed
   under a hard-to-guess public URL.
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
    The token is checked with constant-time comparison. Ingest is limited to
    six authenticated requests/minute and two concurrent inspections per
    process. The JSON payload is at most 16 KiB. Send an explicit valid HTTP
    `Content-Length` (HTTP 411 otherwise); chunked/unknown-length JSON is rejected
    before the request body is parsed. The reverse proxy must enforce the same limit. CI provenance fields are
    **untrusted declarations**, for audit only; they are not used as authority.
5. Server verifies the signature, target, version, expected public URL,
   publisher pin, staging key, streaming MSI header, bytes, size and SHA-256
   **from the private storage object** before inserting the candidate and
   audit row in one DB transaction. Successful result:
   `201 {"success":true,"id":"<UUID>","state":"staged"}`.
   Invalid input is 400, duplicates are 409, auth failure 401, disabled or
   failed Bunny storage 503, and overlimit requests 413/429.
   A DB partial unique index prevents concurrent signed target/version
   reservations. Reuse of a legacy target/version is also rejected during
   normal ingest. Only a protected operator can approve publication.

Unlike the historical `POST /api/v1/releases/ingest/installer`, this new
signed path does **not** transfer a large MSI through SvelteKit/Bun or call
`file.arrayBuffer()`. Existing CI jobs continue using the old route for
legacy candidates until migrated. The website still has the old 100 MiB
in-memory installer uploader: it must not be used for the secure signed
release path. MSI size is currently bounded by PostgreSQL's 32-bit
`size` column (`2147483647` bytes, or just under 2 GiB).

## Manual publication, withdrawal, audits

- An actual Better Auth `admin` session is required by the admin router
  **and checked again by** the signed-release actions:
  `POST /api/v1/admin/installers/publish-desktop` with
  `{"id":"<staged UUID>"}` and
  `POST /api/v1/admin/installers/withdraw-desktop` with the same body.
- Publishing claims the staged row through an atomic
  `staged -> publishing` update. A partial PostgreSQL unique index prevents
  simultaneous publication of two versions for the same target/channel. It checks immutable row-vs-signature
  consistency, revalidates the private MSI, refuses re-use of an older
  previously distributed version, copies the package once to the immutable
  public hash-based path by stream, and rehashes the **public storage bytes**
  and checks the **anonymous public pull-zone HEAD** before `published` is committed and announced. Failed publication returns
  the row to `staged`, with an attempted best-effort deletion of partial CDN
  output, including when the DB commit fails after promotion. A crash may leave `publishing`: this must be investigated by an
  operator; never auto-promote it on restart.
- The legacy manual installer download route also recognizes the new
  content-addressed public MSI path after approval; it never reuses the
  Bunny Storage API URL as the public download location.
- Signed release states are `staged`, `publishing`, `published`,
  and `withdrawn`; existing rows are migrated to `legacy`. Only the
  explicitly published, valid, signed version can appear in desktop discovery.
  The old `set-downloadable` toggle **refuses** signed rows. Signed
  historical records cannot be deleted through the legacy installer deletion
  path.
- Persistent `desktop_release_audit` rows record release ID, actor
  (`ci:ingest-token` or Better Auth admin user ID), action, outcome, UTC
  timestamp. Errors also go to redacted Pino logs. No passwords, storage
  credentials, private signing keys or bearer tokens are logged.
- Withdrawal is one-way in v1 and invalidates both desktop and legacy
  installer caches. A withdrawn highest release still forms the **version
  floor** for feed selection, so an older, potentially vulnerable release is
  not silently proposed. To restore service, sign and publish a strictly
  **higher** version, even if it intentionally reverts application changes.
- A previously downloaded MSI or CDN edge cache cannot be remotely revoked
  with an API change. For emergency removal, also purge/remove CDN objects,
  publish security notices, and apply a _client-side privileged persistent
  revocation floor_ before enabling automatic execution.
- The website cache is process-local, reloaded at startup and immediately
  invalidated after publish/withdraw. A multi-process deployment requires
  inter-instance invalidation before it is safe to scale replicas; do not
  deploy replicas with independent stale release caches.

## BunnyCDN and production gates

**Only** the approved final hash-addressed MSI is served from the existing
public Bunny CDN. No token, signed expiration, redirect to user-supplied URL,
login, or license check is permitted under the signed update path. Configure
public read access for `ace-blocker-installer/signed/` without Bunny URL
Token Authentication. Test anonymous HEAD/GET end-to-end on the configured
public host before enabling the client. Keep the staging storage zone
**physically private** and disconnected from public pull zones. Rate-limit
and monitor authenticated staging operations. CDN integrity at rest remains
an operational responsibility; every client must independently verify the
release signature and MSI hash (and Windows publisher certificate).

Release-signing keys cannot rotate by having this server return a new
unauthenticated public key. A future trusted desktop build must embed/authorize
the new root, distributed with a release signed by the previously trusted
root; overlap old/new releases for transition. With the current one-key
client verifier, server-only rotation is unsafe. Key compromise requires a
separately reviewed recovery/distribution channel.

**Keep `ACE_DESKTOP_UPDATES_ENABLED` unset** until the offline/HSM
Ed25519 signing process, pinned client release key, pinned Authenticode
publisher, private staging storage, anonymous public pull-zone downloads,
signed CI packaging, manual approval procedure, client 204 handling,
client rollback floor and privileged safe MSI installer have been independently
verified. This code and the tests do **not** establish Windows installer
safety, rollback of installed software, or integrity of production credentials.
No VMs, manual Windows installation, or production releases are used in
the server tests.
