# Ace Blocker — Design Tokens & UI Consistency

Status: audit + consolidation plan. The token *system* already exists (Tailwind
CSS v4 + shadcn-svelte); this document records it, catalogues where UI code
bypasses it, and lists the decisions needed before a mechanical migration.

> Visual identity is protected: none of the values below may be changed
> without founder approval, and any color migration must be verified visually
> (screenshots or a browser) — never inferred from source alone.

## 1. Token system

Defined in `src/routes/layout.css` (Tailwind v4 `@theme inline` mapping CSS
variables to `--color-*` / `--radius-*` utilities).

- Radius: `--radius: 0.625rem` with `sm/md/lg/xl` derived offsets.
- Light + dark surfaces via `:root` / `.dark` `oklch` variables:
  `--background`, `--foreground`, `--card`, `--popover`, `--primary`,
  `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`,
  `--input`, `--ring`, `--chart-*`, `--sidebar-*`.
- Base layer: `* { border-border outline-ring/50 }`, `body { bg-background text-foreground }`.

`--primary` is a light amber (`oklch(0.795 0.185 79.1)`); in dark mode it
becomes a pale slate-blue (`oklch(0.929 0.013 255.508)`) — i.e. the semantic
`primary` token does **not** represent the marketing brand amber.

## 2. De-facto palette (measured across `src/`, excluding `lib/components/ui`)

| Role | Value(s) actually used | Count | Notes |
|---|---|---|---|
| Brand amber (marketing accent) | `amber-500` (`#f59e0b`) | 247× | dominant CTA/accent |
| Brand amber (bright) | `#FFBF00` | 31× | home page hero/badges |
| Brand amber (hover) | `amber-600` (`#d97706`) | 51× | hover states |
| Brand amber (lighter) | `amber-400` | 29× | gradients/hover |
| Dark page background | `#0B0B0F` | 52× | home + layout + navbar |
| Dark surfaces (variants) | `#0B0F19`, `#111827`, `#1F2937`, `#0F172A` | 8–9× each | inconsistent dark cards/panels |
| Light surface | `#F8FAFC` (slate-50) | 9× | light panels |
| Neutrals (raw) | `#CBD5E1`, `#64748B`, `#E2E8F0`, `#94A3B8` | 1–8× | borders/text |

### Key inconsistency findings

1. **Three different "brand ambers"** with no single source of truth:
   `--primary` (light amber), `amber-500`/`#FFBF00` (marketing amber), and
   `amber-400/600/700` for gradients/hover. They are visually distinct
   shades, so this is a palette decision, not a mechanical swap.
2. **Dark background is hardcoded** (`#0B0B0F`) instead of using
   `--background`/`--card`, and **multiple dark surface hexes** coexist
   (`#0B0F19` vs `#111827` vs `#1F2937` vs `#0F172A`) — likely the same
   intent expressed four ways.
3. **Raw slate hexes** (`#64748B` text, `#CBD5E1`/`#E2E8F0` borders) duplicate
   the `muted`/`border` tokens.
4. **Radius mix**: `rounded-lg`/`rounded-xl` (the shadcn `--radius` scale) is
   used widely, but `rounded-2xl`, `rounded-3xl`, `rounded-[22px]` and
   `rounded-md` are also used ad hoc (esp. on cards/buttons), so card corner
   radii are inconsistent across pages.

## 3. UI primitives

`src/lib/components/ui/` holds the shadcn-svelte primitives (button, input,
card, dialog, badge, tabs, separator, sheet, dropdown-menu, select, alert,
sonner/toaster, label, …). Duplication risk is the **one-off styling applied
on top of** these primitives (raw `bg-amber-500`, `rounded-xl border
border-border bg-card p-6` blocks repeated inline) rather than missing
primitives. An `EmptyState` and a `Card`/`Panel` wrapper would remove the most
repeated inline `rounded-xl border … p-6` card recipe.

## 4. Decisions needed (founder)

1. **Canonical brand amber** — pick one (recommend `amber-500` as the accent;
   `#FFBF00` only for the hero if intentional), then define
   `--color-brand` + `--color-brand-foreground` and migrate all amber usages.
2. **Dark surface unification** — collapse `#0B0B0F` / `#0B0F19` / `#111827` /
   `#1F2937` / `#0F172A` into `--background`/`--card`/`--muted` (or a new
   `--surface` token), keeping the current dark background value.
3. **Radius scale** — confirm `rounded-xl` as the canonical card radius so the
   `rounded-2xl/3xl/[22px]` outliers can be normalized.

## 5. Migration plan (after decisions, with visual verification)

1. Add missing semantic tokens to `layout.css` (`--color-brand*`, `--surface*`)
   — new variables only, zero visual change.
2. Replace raw `amber-*`/hex usages with the new tokens page-by-page,
   screenshotting before/after each page.
3. Extract the repeated card/empty-state recipes into shared primitives.
4. Re-run `bun run check` + `bun run build` and a visual pass (light + dark).
