# MYRA UI/UX Audit

Date: 2026-07-12
Routes: `/`, `/app/overview`, `/app/review`, `/app/timeline`, `/app/wrapped`
Viewports: 1440×900 and 390×844

## Findings by severity

### Critical

- None found. Navigation, primary content, and core routes remained usable.

### High

- Fixed: evidence cards discarded the API's `chunk` field and rendered the generic “Memory from this chapter” fallback. The timeline now shows the actual source excerpt.
- Fixed: the shared muted text token missed WCAG AA contrast across every route (4.42:1, and 4.2:1 on the timeline surface). The repaired token passes axe-core on all five routes.

### Medium

- Fixed: timeline date buttons exposed visual selection without programmatic `aria-pressed` state.
- Fixed: evidence deletion happened immediately. It now requires explicit confirmation.
- Fixed: the relationship check-in input lacked a `name` and autocomplete intent.
- Fixed: loading and truncated text used three periods instead of the ellipsis character.
- Fixed: the page lacked a meta description and theme color.

### Polish

- Fixed: the token layer now names typography, spacing, radii, shadow, z-index, and motion values instead of leaving those concepts implicit.
- Preserved: the editorial serif/neutral-palette direction, restrained atmospheric gradients, calm app shell, and existing Radix primitives.
- Deferred: the native edit prompt remains functional but cannot match the product visual language. Replace it with the existing Radix dialog pattern when editing becomes a primary workflow.

## Reusable design-system changes

- Color: `--ink`, `--body`, AA-safe `--muted`, surfaces, hairlines, atmospheric accents, and `--error`.
- Type: `--font-display` and `--font-body`.
- Spacing: `--space-1` through `--space-12` on the existing 4px scale.
- Shape: `--radius-sm`, `--radius-md`, `--radius`, `--radius-lg`.
- Elevation/layers: `--shadow-dialog`, `--layer-header`, `--layer-overlay`, `--layer-dialog`.
- Motion: `--motion-fast`, `--motion-base`; reduced-motion handling remains global.
- Shared primitives remain centralized in `src/styles.css`: buttons, inputs, cards, alerts, empty/loading states, accordions, drawer/dialog surfaces, and page layouts.

## Browser evidence

- All five routes tested at desktop and mobile widths after the changes.
- No horizontal overflow at either viewport.
- Zero console errors or warnings across the route matrix.
- axe-core: zero violations on all five routes after the changes.
- Mobile drawer opens, traps focus through Radix, closes with Escape.
- Timeline date selection updates both content and `aria-pressed` state.
- Timeline evidence now renders real excerpts; zero generic fallback labels observed.
- Production load sample: DOMContentLoaded 16ms, load 16ms on localhost. This is lab evidence, not field Core Web Vitals.
- Screenshots: `audit/screenshots/before/` and `audit/screenshots/after/`.

## How to build future UI

1. Compose the existing shell and page patterns: `.app-shell`, `.app-main`, `.page-header`, `.summary-card`, `.empty-state`, `.page-loading`, and `.global-error`.
2. Reuse button variants (`button`, `.button-link`, `.secondary`, `.icon-button`) and the shared input/focus rules. Do not introduce page-local button styling.
3. Use only the tokens at the top of `src/styles.css`. Add a token only when the value is reused or expresses a new semantic role.
4. Use Radix for dialogs, drawers, accordions, and sliders; keep visible labels, keyboard behavior, focus-visible states, and 44px touch targets.
5. Every remote-data surface must include loading, empty, error, and success feedback before it ships.
6. Browser-test new UI at 390px and 1440px, run axe-core, and require a clean console.
