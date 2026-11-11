# Ace Engine: Project Context

This guide explains the ace-engine structure, main concepts, and development rules.

## Project Overview

Ace Engine blocks network traffic and programs.
It runs as a service and does not directly manage the user interface.
Client applications use its Axum REST API in `src/service/api/`.

The `engine-core` crate contains the core logic.
The `src/` directory contains the service, database management, and system-wide MITM proxy.
The proxy at `src/service/proxy.rs` evaluates URLs and coordinates script injection.

---

## Core Concepts

### Network Blocks

A **Network Block** groups rules that specify which sites to block and when to block them.

- **User-defined rules:** Regular expression rules in `engine-core/src/network_block/regex_rules.rs`.
- **Exceptions:** Rules that override blocks in `engine-core/src/network_block/mod.rs`.
- **Sites Lists:** Collections that contain millions of sites.
- **Schedule:** Rules that specify active weekdays and times.
- **Lock:** Rules that prevent users from weakening a Network Block.

- **Location:** `engine-core/src/network_block/mod.rs`
- **Storage:** Store metadata in SQLite with Diesel. Keep entries in memory or RocksDB.

### Sites Lists

Sites Lists contain static or dynamic records of sites and hosts to block.

- **Implementation:** Use RocksDB to look up millions of entries.
- **Location:** `engine-core/src/network_block/sites_list.rs`
- **Sync:** Import data from URLs or local files with `engine-core/src/network_block/importer/`.

### Schedules and Locks

- **Schedule:** Specify active periods with weekday bitmasks.
- **Lock:** Allow changes only to a stricter state, such as Unlocked to LockedUntilEnd.
- **Location:** `engine-core/src/common/schedule.rs` and `engine-core/src/common/lock.rs`.

### Resistance Mode

Resistance Mode injects JavaScript into selected sites to reduce distracting features, such as infinite scrolling.

- **Location:** `engine-core/src/common/resistance_mode.rs`
- **Management:** Use `ResistanceScriptTree` for fast script lookups by domain.

---

## Architecture and Data Management

### Database (SQLite and Diesel)

- **ORM:** Diesel RS.
- **Migrations:** Located in `/migrations`.
- **Schema:** Defined in `src/schema.rs`.
- **Repositories:** Keep database access in `src/db/`, including `sites_list_repo.rs` and `network_block_repo.rs`.
- **Policy:** Return Diesel models or the requested values. Use basic models when appropriate.

### Network Manager (`src/manager/network/`)

The Network Manager coordinates the system.

- **Policy:** **Use in-memory data for URI evaluation.** Load rules into memory at startup.
  Do not query the database while evaluating a URI.
- **Thread safety:** Store the manager in `Arc<RwLock<NetworkManager>>` within AppState.
- **Terminology:** Use “Sites List” instead of “Hosts List”. Use “Network Block” instead of “Net List”.

### Proxy Service (`src/service/proxy.rs`)

The MITM proxy intercepts traffic.
It asks the `NetworkManager` whether to block, allow, or modify each request with script injection.

---

## Tests and Documentation

- **REST API:** Open the generated Swagger UI at `/swagger-ui`.
- **Integration tests:** Check API and proxy behavior in `/tests`.
- **Unit tests:** Keep tests near the relevant source files.

---

## Further Documentation

- `docs/rest-api.md`: REST API endpoints.
- `docs/error-policies.md`: Error-handling rules.
- `docs/ROADMAP.md`: Future project goals.
