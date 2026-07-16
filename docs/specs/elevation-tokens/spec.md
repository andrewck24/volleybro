# elevation-tokens Specification

## Purpose

TBD - created by archiving change 'elevation-depth-system'. Update Purpose after archive.

## Requirements

### Requirement: Three distinct background layers

The application SHALL define three background surface layers, each with a distinct color value in both light and dark themes, ordered by elevation where a higher layer is lighter than the layer beneath it in light theme and the ordering is inverted in dark theme.

- Layer 0 (page) SHALL be the `--background` token.
- Layer 0.5 (non-overlay floating surfaces) SHALL be the `--popover` token.
- Layer 1 (cards, items, and modal-class overlay surfaces) SHALL be the `--card` token.

No two of `--background`, `--popover`, and `--card` SHALL share the same color value within a single theme.

#### Scenario: Layers are visually separable

- **WHEN** the page body, a non-overlay floating surface (e.g., Popover), and a card are rendered together in either theme
- **THEN** each presents a different background color, and a card placed on any of these surfaces is distinguishable from that surface

#### Scenario: Overlay-backed surfaces share the card layer

- **WHEN** a Dialog, AlertDialog, or Drawer is open
- **THEN** its content surface renders on the `--card` token — the same surface color as cards, keeping one modal tone and keeping the Drawer peek continuous with the page's card surfaces — and the dimming overlay separates it visually from the page behind

##### Example: Lightness ordering

| Token          | Layer | dark lightness | light lightness |
| -------------- | ----- | -------------- | --------------- |
| `--background` | 0     | darkest        | darkest         |
| `--popover`    | 0.5   | middle         | middle          |
| `--card`       | 1     | lightest       | lightest        |


<!-- @trace
source: elevation-depth-system
updated: 2026-07-16
code:
  - blueprint/next.config.mjs
  - blueprint/content/design-system/elevation-depth/index.tsx
  - src/app/layout.tsx
  - src/app/auth/layout.tsx
  - src/app/game/[gameId]/sets/[setIndex]/entry/layout.tsx
  - CLAUDE.md
  - src/app/(tabs)/layout.tsx
  - src/components/game/header/index.tsx
  - public/manifest.json
  - src/components/brand/logo-type.tsx
  - src/components/custom/logo.tsx
  - blueprint/content/changes/archive/2026-07-16-elevation-depth-system/review.mdx
  - src/components/layout/tab-container.tsx
  - src/components/layout/body-backdrop.tsx
  - package.json
  - src/components/layout/header.tsx
  - src/components/layout/bg-handler.tsx
  - src/components/ui/chart.tsx
  - blueprint/src/components/brand/logo-type.tsx
tests:
  - src/app/apple-splash/__tests__/route.test.ts
  - src/components/ui/__tests__/dialog.test.tsx
  - src/components/game/__tests__/summary-drawer.test.tsx
  - src/components/ui/__tests__/alert-dialog.test.tsx
  - src/components/layout/__tests__/body-backdrop.test.tsx
  - src/app/apple-splash/__tests__/manifest.test.ts
  - src/components/ui/__tests__/drawer.test.tsx
  - src/components/layout/__tests__/edit-dialog-container.test.tsx
  - src/app/apple-splash/__tests__/devices.test.ts
-->

---
### Requirement: Background tokens carry their semantic role

The page `body` background SHALL use the `--background` token (`bg-background`), not `--accent`. The `--accent` token SHALL be reserved for hover and highlight states and SHALL NOT be used as a page or surface background.

Components that render their own dimming `Overlay` (Dialog, AlertDialog, Drawer) SHALL render their content surface on the `--card` token — the overlay separates them from the page behind. Floating surface components without a dimming overlay (Popover, Select content) SHALL render on the `--popover` token.

#### Scenario: Body uses background token

- **WHEN** the application shell renders
- **THEN** the `body` element's background resolves to `--background`, and no page-level container relies on `--accent` for its base surface

#### Scenario: Route-scoped PWA body backdrop

- **WHEN** a standalone PWA route needs translucent system chrome to match adjacent app chrome
- **THEN** that route MAY set `document.documentElement.style.backgroundColor` and `document.body.style.backgroundColor` from its own layout using the matching semantic token
- **AND** this inline body backdrop SHALL NOT be treated as the page content background, SHALL NOT use `--accent`, and SHALL be cleaned up when the route unmounts

#### Scenario: PWA launch fallback matches the page background

- **WHEN** a user agent uses the manifest color while launching the standalone PWA
- **THEN** the manifest `background_color` SHALL equal the light-mode `--background` color
- **AND** the fallback SHALL NOT introduce a separate near-white page layer

#### Scenario: Modal overlay respects the PWA system chrome boundary

- **WHEN** an overlay-backed modal (Dialog or AlertDialog) is open in standalone PWA mode
- **THEN** the modal overlay element SHALL cover the full web content viewport using `inset-0`
- **AND** it SHALL NOT mutate the route-scoped body backdrop to emulate the scrim in an iOS-owned status-bar region

#### Scenario: Expanded recording drawer respects the PWA system chrome boundary

- **WHEN** the recording summary drawer is expanded in standalone PWA mode
- **THEN** the drawer overlay element SHALL cover the full web content viewport using `inset-0`
- **AND** neither the expanded drawer nor the idle drawer peek SHALL mutate the route-scoped body backdrop

#### Scenario: Card inside a modal is distinguished by shadow

- **WHEN** a `<Card>` or `Item` component is rendered inside a Dialog, AlertDialog, or Drawer
- **THEN** it sits on the same-color `--card` surface and remains visually distinguishable through its shadow, with no decorative ring and no per-dialog special-casing beyond the single shadow rule

<!-- @trace
source: elevation-depth-system
updated: 2026-07-16
code:
  - blueprint/next.config.mjs
  - blueprint/content/design-system/elevation-depth/index.tsx
  - src/app/layout.tsx
  - src/app/auth/layout.tsx
  - src/app/game/[gameId]/sets/[setIndex]/entry/layout.tsx
  - CLAUDE.md
  - src/app/(tabs)/layout.tsx
  - src/components/game/header/index.tsx
  - public/manifest.json
  - src/components/brand/logo-type.tsx
  - src/components/custom/logo.tsx
  - blueprint/content/changes/archive/2026-07-16-elevation-depth-system/review.mdx
  - src/components/layout/tab-container.tsx
  - src/components/layout/body-backdrop.tsx
  - package.json
  - src/components/layout/header.tsx
  - src/components/layout/bg-handler.tsx
  - src/components/ui/chart.tsx
  - blueprint/src/components/brand/logo-type.tsx
tests:
  - src/app/apple-splash/__tests__/route.test.ts
  - src/components/ui/__tests__/dialog.test.tsx
  - src/components/game/__tests__/summary-drawer.test.tsx
  - src/components/ui/__tests__/alert-dialog.test.tsx
  - src/components/layout/__tests__/body-backdrop.test.tsx
  - src/app/apple-splash/__tests__/manifest.test.ts
  - src/components/ui/__tests__/drawer.test.tsx
  - src/components/layout/__tests__/edit-dialog-container.test.tsx
  - src/app/apple-splash/__tests__/devices.test.ts
-->