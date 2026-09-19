# Ace Blocker Site — UI Identity

Status: **approved target direction** for the public website.

This document governs new and redesigned marketing/account UI in `ace-blocker-site`. It shares the same brand DNA as the desktop app, but the website may be more expressive.

## 1. Relationship to the desktop app

The site and app should feel like two modes of the same product:

- **Website:** expressive introduction to the Ace worldview and mechanism.
- **Desktop app:** restrained working instrument for configuring and enforcing decisions.

Shared DNA:

- Signal amber;
- warm Ink/Paper neutral palette;
- IBM Plex family;
- firmer geometry;
- borders/rules over floating shadows;
- structural representation of locks, schedules, blocks, and resistance;
- limited, deliberate motion.

The website must not invent a separate “premium SaaS” identity.

## 2. Mandatory design skills

For any visible marketing redesign or new marketing page:

1. Read this document.
2. Use `frontend-design`.
3. Use `design-taste-frontend`.
4. Use `ui-ux-pro-max`.
5. For Svelte implementation, use:
   - `svelte-code-writer`;
   - `svelte-core-bestpractices`;
   - `svelte-components`.
6. Use `web-design-guidelines` for final review.
7. Verify meaningful visual changes with real screenshots in light and dark themes.

For account/admin product UI, use `frontend-design` + `ui-ux-pro-max` as the primary design skills. `design-taste-frontend` is mainly a marketing/redesign skill and should not override dense product UX.

## 3. Palette

Target shared palette:

| Token | Hex |
| --- | --- |
| Signal | `#FFB000` |
| Signal Bright | `#FFC533` |
| Signal Deep | `#D58B00` |
| Ink | `#10100E` |
| Graphite | `#1A1A17` |
| Steel | `#292925` |
| Ash | `#8B8A82` |
| Paper | `#F3F0E8` |
| Paper Strong | `#FFFDF7` |
| Line | `#D7D2C7` |

Semantic colors remain exceptional and meaning-driven:

- Success: `#77A86A`
- Danger: `#DF5145`
- Information: `#668DB3`

The old/current site token audit in `docs/design-tokens.md` records `#f59e0b` as the previous canonical brand amber. This new identity brief supersedes that **as the target direction**, but the codebase has not yet been migrated. Do not perform a blind global replacement; migrate visually and verify page by page.

Amber means intervention/commitment/attention, not simply “brand-colored thing.”

## 4. Typography

Target:

- **IBM Plex Sans** — body and UI;
- **IBM Plex Sans Condensed** — major headings / state-driven display;
- **IBM Plex Mono** — selective technical data such as schedules, counts, releases, durations.

Typography should create much of the identity. Avoid generic “huge extra-bold gradient SaaS headline” composition.

## 5. Marketing composition

The current generic pattern to move away from is:

- centered hero;
- release pill;
- huge gradient text;
- blurred background blobs;
- two CTA buttons;
- three equal feature cards;
- rounded icon boxes;
- hover-lift card motion.

The replacement should begin with the most characteristic Ace idea: **the mechanism of commitment and resistance**.

Possible directions include:

- a live/illustrated enforcement timeline;
- an interactive policy object;
- a resistance progression;
- a before/after view of an addictive site becoming constrained/boring;
- a visual explanation of rational-moment configuration vs weak-moment enforcement.

The hero does not need to be centered. Prefer composition that makes the product mechanism the main visual.

## 6. Surfaces and geometry

Use modest radii and stronger structure.

Prefer:

- rules;
- borders;
- inset panels;
- editorial spacing;
- direct visual demonstrations;
- one strong signature composition per page.

Avoid making every section a rounded card.

The website may use more expressive scale and composition than the app, but it should preserve the same material logic.

## 7. Pro / pricing

Pricing information should remain easy to understand.

Do not use generic premium signals as the identity:

- crown as the primary visual;
- amber glow aura;
- giant glowing CTA;
- shine sweep;
- “premium card” floating above the page.

Ace Pro should feel like an extension of the same enforcement product, not a different luxury-SaaS skin.

## 8. Product concepts to show, not decorate around

When communicating features, use the actual Ace concepts as visual material:

- enforcement policies;
- schedules;
- locks;
- site packs;
- resistance intensity;
- engine state;
- the difference between a configured decision and a weak-moment attempt to reverse it.

Distinctiveness should come from the product itself.

## 9. Motion

Use one deliberate moment better than many decorative effects.

Good:

- interactive mechanism explanation;
- lock closing after direct user action;
- schedule/enforcement state changing;
- resistance preview changing with a control.

Avoid:

- entrance fade-up on every section;
- every card translating upward on hover;
- ambient blobs;
- looping “premium” shimmer.

Respect reduced motion.

## 10. Shadcn/Bits UI

Existing shadcn-svelte components can continue to provide behavior and common form patterns, especially in account/admin surfaces.

They are not the brand.

For new visually important components:

- prefer Ace-owned composition and styling;
- use Bits UI/headless primitives where appropriate;
- do not ship the default shadcn visual grammar unchanged;
- do not let the component library decide information architecture.

## 11. Accessibility and validation

Required:

- keyboard and focus support;
- semantic headings/controls;
- sufficient contrast;
- no state encoded only by color;
- reduced-motion support;
- responsive layouts;
- useful mobile composition rather than merely stacked desktop cards.

For meaningful visual changes, compare screenshots in light and dark mode before considering the task complete.

## 12. Recognition test

A successful redesigned Ace homepage should not look like a generic security/productivity landing page with the Ace logo pasted on.

Ask:

> If the words “Ace Blocker” disappear, do the palette, type, geometry, and product mechanism still identify the brand?
