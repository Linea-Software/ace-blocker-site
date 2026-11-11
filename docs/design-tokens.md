# Ace Blocker: Design Tokens and UI Consistency

Status: Token audit and consolidation plan.
The system uses Tailwind CSS v4 and shadcn-svelte.
This document records the tokens, code that does not use them, and required migration decisions.

> Protect the approved visual identity.
> Do not change the values without founder approval.
> Verify all color migrations in a browser or screenshots. Do not infer visual results from source code.

## 1. Token System

The tokens are defined in `src/routes/layout.css`.
Tailwind v4 `@theme inline` maps CSS variables to `--color-*` and `--radius-*` utilities.

- Radius: `--radius: 0.625rem`; derive `sm/md/lg/xl` values from this token.
- Light and dark surfaces: use `:root` and `.dark` `oklch` variables.
  These include `--background`, `--foreground`, `--card`, `--popover`, `--primary`,
  `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`,
  `--ring`, `--chart-*`, and `--sidebar-*`.
- Base styles: `* { border-border outline-ring/50 }` and `body { bg-background text-foreground }`.

In light mode, `--primary` is amber: `oklch(0.795 0.185 79.1)`.
In dark mode, it is pale slate-blue: `oklch(0.929 0.013 255.508)`.
Thus, `primary` does **not** always mean marketing brand amber.
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

### Token Inconsistencies

1. The site uses three distinct amber sources: light-mode `--primary`, marketing `amber-500`/`#FFBF00`, and hover/gradient `amber-400/600/700`.
   These values are visually different. Do not replace them without a palette decision.
2. `#0B0B0F` is hardcoded instead of using `--background` or `--card`.
   The site also uses `#0B0F19`, `#111827`, `#1F2937`, and `#0F172A` for dark surfaces.
   These values appear to represent similar surfaces.
3. Raw slate colors `#64748B`, `#CBD5E1`, and `#E2E8F0` duplicate `muted` or `border` roles.
4. Radii vary across pages. The site uses `rounded-lg`, `rounded-xl`, `rounded-2xl`,
   `rounded-3xl`, `rounded-[22px]`, and `rounded-md`.
   Different values make card and button corners inconsistent.
## 3. UI Primitives

`src/lib/components/ui/` contains shadcn-svelte controls.
These include buttons, inputs, cards, dialogs, badges, tabs, separators, sheets, menus, alerts, toasts, and labels.
Many components add one-off styling such as `bg-amber-500` or `rounded-xl border border-border bg-card p-6`.
Repeated styling is a larger problem than missing primitives.
Shared `Panel` and `EmptyState` components can reduce these repeated styles.
## 4. Approved Decisions (Round 5)

1. Use `amber-500` (`#f59e0b`) as the canonical brand amber in `--color-brand`.
2. Use `--background`, `--card`, and `--muted` for dark surfaces.
   Map each existing value before changing it.

## 5. Migration Status

### Completed and Committed

- Added `--color-brand: #f59e0b` to `layout.css` `@theme`.
- Changed `amber-500` to `brand` (247 uses) and `[#FFBF00]` to `brand` (46 uses) across 17 `.svelte` files.
  The `amber-500` change keeps the same value.
  Built CSS confirmed `.bg-brand{background-color:#f59e0b}`.
  The `#FFBF00` change uses the approved, slightly darker brand color in the hero.
- Changed `dark:bg-[#0B0B0F]` and `dark:bg-[#0B0F19]` to `dark:bg-background`.
  Changed `dark:bg-[#111827]` to `dark:bg-card`.
  Changed two inline `background-color:#0b0b0f` and `#0b0f19` rules to `var(--background)`.
  Pixel comparisons showed an approximately 8.4 delta on a 64px header strip.
  Card appearance did not change significantly.

### Round 6 Decisions and Completed Work

- Keep Tailwind `amber-400`, `amber-600`, and `amber-700` for hover and gradient states.
  Replacing them with `brand` would remove hover feedback.
  New derived shades would change the palette.
  The `layout.css` `@theme` comment records this decision.
- The two page-level `:global(body) { color: #0f172a }` rules on get-pro and about now use `var(--foreground)`.
  Preserve raw `#0F172A` in `src/lib/server/email.ts`. Email HTML does not use site tokens.
- Change small icon boxes on get-pro, download, and about from `rounded-2xl` to `rounded-xl`.
  Keep larger radii on marketing feature and platform cards.
  These are intentional accents. Do not change them without founder approval.
- Added `src/lib/components/Panel.svelte` for `rounded-xl border … p-6`.
  Its `variant="surface"` supports the light admin surface.
  Added `src/lib/components/EmptyState.svelte`.
  Admin release pages now use these components for statistics and empty tables.

### Remaining Constraint

The account page still passes the card recipe as a `class` to `Tabs.TabsContent`.
A wrapper would change the tab-panel DOM structure.
Consider a shared class constant before you change that structure.
Verify later changes visually in both light and dark themes.
