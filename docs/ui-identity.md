# Ace Blocker Site: UI Identity

Status: **Approved design target** for the public website.
This guide applies to new and redesigned marketing and account UI in `ace-blocker-site`.
The website and desktop app share one brand identity. The website can use a more expressive presentation.

## 1. Relationship to the Desktop App

The website explains Ace Blocker's purpose and how it works.
The desktop app helps users configure and enforce decisions.

Use these shared visual elements:

- Signal amber.
- Mineral (light) and Gunmetal (dark) surface palettes.
- IBM Plex fonts.
- Firm shapes.
- Borders and rules instead of floating shadows.
- Visual representations of Network Blocks, schedules, locks, and Resistance.
- Limited motion with a clear purpose.

Do not create a separate generic premium-SaaS identity.
Marketing previews can simplify scale, data, and interaction.
Keep previews visually consistent with the current desktop app.
Use real product concepts: Network Blocks, Resistance controls, schedules, locks, and Site Packs.
Show simplified product UI, not a different fictional app.
Marketing diagrams can use other layouts when they are clearly diagrams.

## 2. Required Design Skills

For new marketing pages and visible marketing redesigns:

1. Read this guide.
2. Use `frontend-design`.
3. Use `design-taste-frontend`.
4. Use `ui-ux-pro-max`.
5. For Solid 2 `.tsx` implementation, read installed `.agents/skills/solid-2.0/SKILL.md`, `solidjs-v2` and `reactivity-diagnostics` as applicable; consult the official [Solid 2 documentation](https://docs.solidjs.com/llms-full.txt). Do not reuse old Svelte skills or Svelte MCP workflows.
6. Use `web-design-guidelines` for the final review when available; do not claim a skill is installed unless it is present in `.agents/skills/`.
7. Check real screenshots in light and dark modes, on desktop and mobile, and compare with the Svelte reference where necessary.

For account and admin UI, prioritize `frontend-design` and `ui-ux-pro-max`.
Do not let `design-taste-frontend` override the needs of dense product UI.

## 3. Palette

Shared Mineral / Gunmetal palette:

| Semantic surface      | Light     | Dark      |
| --------------------- | --------- | --------- |
| Workspace             | `#CDDCE5` | `#12171C` |
| Panel                 | `#E2EAF0` | `#212932` |
| Raised dialog / menu  | `#F0F5F8` | `#2C3641` |
| Modal header / footer | `#E2EAF0` | `#35414D` |
| Control               | `#D5E1E9` | `#414E5C` |
| Strong border         | `#647C8C` | `#94A4B3` |
| Primary text          | `#202E39` | `#E9EEF3` |
| Secondary text        | `#465A69` | `#BFCAD5` |

Brand amber remains `#FFB000` in both themes. Preserve intentional brand accents
in marketing; use the shared neutral surfaces for page structure and controls.
Success, danger and information use distinct semantic colors.

Use the tokens in `src/routes/layout.css`, not local theme-specific hard-coded
colors. In dark mode controls are brighter than their parent panels and dialogs.
Raised dialogs and menus have a distinct surface, strong edge and a dimmed
backdrop where modal. Avoid pure white for large page surfaces.

## 4. Typography

Use these fonts:

- **IBM Plex Sans:** Body text and UI.
- **IBM Plex Sans Condensed:** Major headings and state-driven displays.
- **IBM Plex Mono:** Technical data, schedules, counts, releases, and durations.

Use typography as a main part of the design.
Do not use the generic oversized, bold, gradient headline style from SaaS templates.

## 5. Marketing Composition

Avoid the old generic pattern:

- Centered hero and release pill.
- Oversized gradient text and blurred background shapes.
- Two generic call-to-action buttons.
- Three equal feature cards.
- Rounded icon tiles and hover-lift cards.

Start the page with a characteristic Ace concept: **commitment and Resistance**.
Possible visual ideas include:

- An enforcement timeline.
- An interactive policy object.
- A Resistance sequence.
- A Before/After demonstration of a distracting site becoming limited.
- An explanation of configuring a decision before a moment of temptation.

The hero does not have to be centered.
Make the product mechanism the main visual.

## 6. Surfaces and Geometry

Use modest corner radii and clear structure.
Prefer rules, borders, inset panels, editorial spacing, and direct product demonstrations.
Use one strong signature composition on each page.
Do not put every section in a rounded card.
The website can use more expressive scale, but it must use the same material logic as the app.

## 7. Pro and Pricing

Show prices and payment terms clearly.
Do not use generic luxury visuals as the Pro identity:

- A crown as the main graphic.
- An amber glow around the product.
- An oversized glowing action button.
- Repeated shine effects.
- A floating premium card.

Show Pro as an extension of Ace Blocker's enforcement functions.
Do not give Pro a different luxury-SaaS visual style.

## 8. Show Product Concepts

Use these actual Ace concepts in feature illustrations:

- Enforcement policies.
- Schedules.
- Locks.
- Site Packs.
- Resistance intervention categories.
- Engine state.
- The difference between a saved decision and a later attempt to reverse it.

Make product behavior the source of the visual identity.

## 9. Motion

Prefer one meaningful animation to many decorative effects.
Useful examples:

- A user controls an interactive explanation.
- A lock closes after a user action.
- A schedule changes its enforcement state.
- A Resistance preview changes after a control changes.

Do not use repeated entrance fades, hover lifts, moving background shapes, or looping premium shine.
Respect reduced-motion settings.

Walkthrough steps must follow a clear order:

1. Move the pointer from a stable position to the target.
2. Pause over the target.
3. Press the target.
4. Show the UI response.
5. Let the UI settle.

Use the same pointer across steps.
Vary cue durations. Stop automatic playback immediately after a visitor interacts.

The Network Block demo must match the app's compact actions, icon container, and readable header.
Keep its Categories/Rules divider, weekly schedule preview, and confirmed lock options.
Keep the View action available for a protected block.

Resistance has five intervention categories, optional CAPTCHA, and effects limited to each site.
A Reddit script must not change the YouTube preview.
On mobile, show one readable Before/After panel at a time.

## 10. Solid 2 UI primitives

Use the migrated/project-owned Solid `.tsx` primitives under `src/lib/components/ui/` for common controls and forms. They are implementation tools, not the brand identity. The older shadcn-svelte and Bits UI components belong to the Svelte reference implementation and must not be introduced into new Solid UI.

For important new UI components:

- Use Ace-specific structure, styling and actual product semantics.
- Check accessible Solid-compatible headless patterns if custom behavior is needed; verify APIs against Solid 2, not Solid 1 or React.
- Do not keep default shadcn visual styles without review.
- Do not let a component library determine information structure.
- Preserve visual/keyboard behavior and SSR/hydration consistency while porting; framework changes must not silently redesign the interface.

## 11. Accessibility and Verification

Provide keyboard interaction and visible focus.
Use semantic headings and controls.
Keep sufficient contrast.
Do not communicate state through color alone.
Support reduced-motion settings.
Use layouts that work on narrow screens.
Design mobile layouts for readability, not only as stacked desktop cards.

Compare real screenshots in light and dark modes after meaningful visual changes.

## 12. Recognition Check

The homepage must not look like a generic security or productivity landing page with a new logo.
Ask: Can users recognize Ace from its colors, fonts, structure, and product mechanism without the brand name?
