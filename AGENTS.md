# Project Rules

## Package Management & Runtime

ALWAYS use **Bun** for all package management and script execution tasks.

- Use `bun install` instead of `npm install`
- Use `bun run` instead of `npm run`
- Use `bun` instead of `node`
- Do NOT use `npm`, `yarn`, or `pnpm` under any circumstances.
- **When installing packages**, use `bun add <package>` or `bun add -d <package>`.
- **Running Locally**: The development server is ALWAYS running at `https://localhost:5173/` during development. You do NOT need to run `bun run dev` yourself. Use this URL to test and verify changes.
- **Initial Setup**: Run `bun run setup` to automatically configure the `.env` file (including secrets), start the Docker database, and apply Drizzle migrations.
- **Database Management**: Run `bun run db:delete` to stop the Docker database and delete its associated volumes (virtual disk).
- **Development Credentials**: In development mode, a default admin user is automatically created:
    - **Email**: `dev@example.com`
    - **Password**: `dev-password`
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

This is the **Ace Blocker** marketing and subscription website — a full-stack SvelteKit application for product publicity, user management, subscriptions, and REST API access. It handles authentication (Better Auth), payments (DodoPayments), file hosting (BunnyCDN), and serves as the upstream content provider for the Ace Engine (site packs, resistance scripts, tracking scripts, and binary releases).

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
    - **Better Auth 1.7+**: requires `account.issuer` (e.g. `local:credential` for local accounts). After a Better Auth upgrade, re-run `bun run gen:auth-schema`, then `bun run db:generate` and review the migration before `bun run db:migrate` (the generated migration for `issuer` needs a backfill for existing rows).
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

Always test mode: `dodoPayments = new DodoPayments({ environment: 'test_mode' })` in `src/lib/server/auth.ts`.

- **Checkout**: `/get-pro` calls `authClient.dodopayments.checkoutSession({ slug })` → plugin endpoint `POST /api/auth/dodopayments/checkout-session` (Better Auth mounts plugin routes under its base path `/api/auth`). Returns `{ url, redirect: true }` — in test mode the host is `test.checkout.dodopayments.com`.
- **Webhooks**: Dodo deliveries arrive at `POST /api/auth/dodopayments/webhooks` — the Dodo dashboard endpoint must be `https://<host>/api/auth/dodopayments/webhooks`. Signature verification (Svix-style `webhook-id`/`webhook-timestamp`/`webhook-signature`) happens in the plugin via `@dodopayments/core/webhook`.
- **Idempotency**: webhook events are recorded in `dodo_webhook_events` (keyed by a payload digest, see `src/lib/server/webhook-events.ts`). Every `onSubscription*` handler in `auth.ts` is gated by `shouldProcessWebhook()`, so retried deliveries are no-ops and stale events (older timestamp for the same subscription) are rejected.
- **scheduled cancellation**: `subscription.cancelled` with `cancel_at_next_billing_date: true` keeps access until `next_billing_date` (matching the account page); only a final `subscription.expired`/`failed`/`on_hold`/`paused` clears it.
- **Testing**: `bun scripts/test-dodo-webhooks.ts` signs real webhook payloads against the dev server and asserts pro status changes (needs a running dev server + dev DB).

## Nomenclature & Design Patterns

- **Design tokens & UI consistency**: the token system lives in `src/routes/layout.css` (Tailwind v4 `@theme`). Audit results, the de-facto palette, and the pending consolidation decisions are in [`docs/design-tokens.md`](docs/design-tokens.md). Do not change color values or migrate hardcoded `amber-*`/hex usages to tokens without founder approval + visual verification.
- **Svelte Components**: All `.svelte` files MUST use `UpperCamelCase` naming convention (e.g., `Button.svelte`, `UserCard.svelte`).
- **Page-specific components**: These MUST reside in a `./_components` folder within the route directory OR be prefixed with an underscore (e.g., `_Component.svelte`) to differentiate them from routes.
- `/messages/`: Localization message files for Paraglide. During development, always prioritize English (`en`). Only translate when explicitly requested.
- `/scripts/`: Development and maintenance scripts. **ALWAYS use TypeScript** for these scripts.
- `/drizzle/`: Database migrations managed by Drizzle.

## Scripts

Use `bun run <script>` for these tasks:

- `setup`: Configures `.env`, starts Docker DB, and applies migrations.
- `db:start`: Starts the Docker database.
- `db:delete`: Stops the Docker database and deletes volumes.
- `db:push`: Pushes schema changes to the database (development).
- `db:migrate`: Runs migrations.
- `db:studio`: Opens Drizzle Studio.
- `check`: Runs Svelte-check for type safety and linting.
- `test`: Runs unit and E2E tests.
- `format`: Formats code with Prettier.

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
- **`shadcn`** (`shadcn/ui`) — shadcn UI component patterns.
- **`tailwind-design-system`** (`wshobson/agents`) — Tailwind CSS design system principles.
- **`tailwind-v4-shadcn`** (`secondsky/claude-skills`) — Tailwind v4 + shadcn integration.

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
