# Ace Blocker — Design Tokens & UI Consistency

Status: audit + consolidation plan. The token _system_ already exists (Tailwind
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

| Role                           | Value(s) actually used                     | Count     | Notes                          |
| ------------------------------ | ------------------------------------------ | --------- | ------------------------------ |
| Brand amber (marketing accent) | `amber-500` (`#f59e0b`)                    | 247×      | dominant CTA/accent            |
| Brand amber (bright)           | `#FFBF00`                                  | 31×       | home page hero/badges          |
| Brand amber (hover)            | `amber-600` (`#d97706`)                    | 51×       | hover states                   |
| Brand amber (lighter)          | `amber-400`                                | 29×       | gradients/hover                |
| Dark page background           | `#0B0B0F`                                  | 52×       | home + layout + navbar         |
| Dark surfaces (variants)       | `#0B0F19`, `#111827`, `#1F2937`, `#0F172A` | 8–9× each | inconsistent dark cards/panels |
| Light surface                  | `#F8FAFC` (slate-50)                       | 9×        | light panels                   |
| Neutrals (raw)                 | `#CBD5E1`, `#64748B`, `#E2E8F0`, `#94A3B8` | 1–8×      | borders/text                   |

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

## 4. Decisions (founder, round 5)

1. **Canonical brand amber = `amber-500` (`#f59e0b`)** → exposed as `--color-brand`.
2. **Dark surfaces unify onto `--background`/`--card`/`--muted`** (pending the value mapping, see §5).

## 5. Migration status

**Done (committed):**

- Added `--color-brand: #f59e0b` to `layout.css` `@theme`.
- Replaced `amber-500` → `brand` (247×) and `[#FFBF00]` → `brand` (46×) across 17
  `.svelte` files. `amber-500`→`brand` is value-identical (verified in the built
  CSS: `.bg-brand{background-color:#f59e0b}`); `#FFBF00`→`brand` is the approved
  brightness consolidation (slightly less bright hero accent).
- Unified dark surfaces onto tokens: `dark:bg-[#0B0B0F]`/`dark:bg-[#0B0F19]` →
  `dark:bg-background`, `dark:bg-[#111827]` → `dark:bg-card`, and the two inline
  `background-color:#0b0b0f`/`#0b0f19` rules → `var(--background)`. Pixel-diff
  verified (before/after): subtle ~8.4 delta on a 64px header strip, cards
  effectively unchanged — no regression.

**Pending (require visual verification, light + dark):**

- ~~`amber-400`/`amber-600`/`amber-700` remain as explicit **shade steps** for
  gradients and hover states — flattening them to `brand` would remove hover
  affordance; decide whether to keep them or derive dark/light brand shades.~~
  **Decision (round 6): keep them.** They are the Tailwind default ambers and
  every use is a hover state or gradient endpoint; flattening would remove the
  hover affordance and deriving new shades would be a palette change. The
  comment in `layout.css` `@theme` records this.
- ~~`#0F172A` occurrences are **light-mode inline text colors** (not dark surfaces)
  — normalize them to a text token/class or leave as-is (cosmetic).~~
  **Done (round 6):** the two page-level `:global(body) { color: #0f172a }`
  rules (get-pro, about) now use `var(--foreground)`; the email-template
  occurrences in `src/lib/server/email.ts` are intentionally left as-is
  (email HTML is not tokenized).
- ~~Radius normalization (`rounded-2xl/3xl/[22px]` outliers → the `--radius` scale).~~
  **Done (round 6), scoped:** small icon boxes on get-pro/download/about normalized
  `rounded-2xl` → `rounded-xl` (matching the icon-box radius used elsewhere on
  the same pages). Large marketing cards (about feature cards, download
  platform cards) keep their larger radii as deliberate accents — each page is
  internally consistent, and flattening them would change the marketing look
  without founder sign-off.
- ~~Extract the repeated `rounded-xl border … p-6` card recipe and an `EmptyState`
  primitive into shared components.~~
  **Done (round 6):** `src/lib/components/Panel.svelte` (the
  `rounded-xl border … p-6` recipe, `variant="surface"` for the admin
  light-surface recipe) and `src/lib/components/EmptyState.svelte` were added;
  the admin release pages (stats cards + table empty states) now use them.
  The account page's `Tabs.TabsContent` cards still pass the recipe as a
  `class` prop (a wrapper would alter the tabpanel DOM) — they can follow once
  the recipe is shared as a constant.
