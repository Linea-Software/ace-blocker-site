# Project Rules

## Package Management & Runtime

ALWAYS use **Bun** for all package management and script execution tasks.

- Use `bun install` instead of `npm install`
- Use `bun run` instead of `npm run`
- Use `bun` instead of `node`
- Do NOT use `npm`, `yarn`, or `pnpm` under any circumstances.
- **Running Locally**: The development server is ALWAYS running at `http://localhost:5173/` during development. You do NOT need to run `bun run dev` yourself. Use this URL to test and verify changes.
- **Initial Setup**: Run `bun run setup` to automatically configure the `.env` file (including secrets), start the Docker database, and apply Drizzle migrations.
- **Development Credentials**: In development mode, a default admin user is automatically created:
  - **Email**: `dev@example.com`
  - **Password**: `dev-password`
- **Committing Changes**: Once you have finished a task and verified it, you MUST commit your changes using `git add .` and `git commit -m "..."` with a descriptive message.

## Self-Maintenance (IMPORTANT)

- **Maintain Context**: You MUST automatically edit this `GEMINI.md` file whenever significant changes occur in the project (e.g., new tools added, new core documentation links found, project structure changes, or new patterns established). Keep this document up-to-date as the "Source of Truth" for your behavior in this project.

## Core Documentation & Tech Stack

**IMPORTANT**: You MUST always read the relevant documentation below before performing tasks related to these technologies. Use the documented patterns and best practices.

- **Svelte 5 & SvelteKit**: [Documentation](https://svelte.dev/llms.txt) - Full-stack framework for the site. Use Svelte 5 runes (`$state`, `$derived`, `$effect`, etc.).
- **Drizzle ORM**: [Documentation](https://orm.drizzle.team/llms.txt) - Database management for Postgres.
- **Better Auth**: [Documentation](https://www.better-auth.com/llms.txt) - Handles authentication and session management.
- **Zod**: [Documentation](https://zod.dev/llms.txt) - Used to verify user request schemas and for type safety.
- **Paraglide**: Localization framework.
- **shadcn-svelte**: [Documentation](https://shadcn-svelte.com/llms.txt) - UI component library. Use `bun x shadcn-svelte@latest add -y <component-name>` to add new components.
- **Lucide Svelte**: Use `@lucide/svelte` for icons. Do NOT use `lucide-svelte` as it is deprecated.
- **DodoPayments**: [Documentation](https://docs.dodopayments.com/llms.txt) - Payments and license management.

## Project Description

**Ace Blocker** is a blocker application designed to help users overcome internet addictions. It blocks addictive network sites (porn, social media, betting, etc.) and provides a suite of scripts to make these sites less appealing and more boring.

This website is a full-stack SvelteKit application used for product publicity, managing users, subscriptions, and providing a REST API.

## Project Structure

- `/src/routes/`: Contains SvelteKit pages and API endpoints.
  - Standard routes include authentication (`signin`, `signup`) and functionality (`generate-checkout`, `demo`).
  - **Page-specific components** MUST reside in a `./_components` folder within the route directory.
- `/src/lib/`: Reusable components, utilities, and logic.
  - `/src/lib/components/`: **Global components** reused across the app.
  - `/src/lib/components/ui/`: Reserved ONLY for **shadcn-svelte** components.
  - `/src/lib/server/`: Server-only logic, including:
    - `auth.ts`: Better Auth configuration.
    - `db/`: Database schema (`schema.ts`, `auth-schema.ts`) and connection (`index.ts`) using Drizzle.
  - `/src/lib/paraglide/`: Auto-generated localization runtime.

## Nomenclature & Design Patterns

- **Svelte Components**: All `.svelte` files MUST use `UpperCamelCase` naming convention (e.g., `Button.svelte`, `UserCard.svelte`).
- `/scripts/`: Development and maintenance scripts. **ALWAYS use TypeScript** for these scripts.
- `/messages/`: Localization message files for Paraglide. During development, always prioritize English (`en`). Only translate when explicitly requested.
- `/drizzle/`: Database migrations managed by Drizzle.

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
