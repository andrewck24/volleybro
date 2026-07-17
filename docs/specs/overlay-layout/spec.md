# overlay-layout Specification

## Purpose

TBD - created by archiving change 'elevation-depth-system'. Update Purpose after archive.

## Requirements

### Requirement: Shared three-section overlay structure

Overlay-backed surface components — `Dialog`, `AlertDialog`, and `Drawer` — SHALL share a common content structure. The content element SHALL carry no padding, SHALL be `overflow-hidden`, SHALL render on the `--card` surface (the shared modal surface, separated from the page by the dimming overlay), and SHALL lay out its children as a vertical flex column. Content SHALL be organized into three sections — a header, a body, and a footer — each owning its own padding. The body section SHALL be the sole scroll container within the surface.

#### Scenario: Scrollbar sits at the window edge

- **WHEN** an overlay surface's content exceeds the available height on a desktop viewport
- **THEN** scrolling occurs within the body section and the scrollbar is flush against the surface window edge, because the content element itself does not scroll

#### Scenario: Sections own their spacing

- **WHEN** an overlay surface renders a header, body, and footer
- **THEN** padding is supplied by each section, and the content element contributes no padding or gap of its own

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

### Requirement: No container carries a decorative ring

Container components SHALL NOT apply a decorative ring or border to their content surface. Elevation SHALL be signaled by each kind's remaining cues: a component that renders its own dimming `Overlay` (`Dialog`, `AlertDialog`, `Drawer`) relies on the overlay; non-overlay floating surfaces (`Popover`, `Select`, `Dropdown` content) rely on the `--popover` background step plus `shadow-md`; in-flow surfaces (`Card`, `Item`) rely on the `--card` background step plus their shadow treatment. The `--ring` token SHALL be reserved for focus-visible states. Where a card-class element sits on a same-color surface, the compensation cue SHALL be shadow, not a ring.

#### Scenario: Overlay surface has no ring

- **WHEN** any of `Dialog`, `AlertDialog`, or `Drawer` is open
- **THEN** its content surface renders without a ring or border, relying on the dimming overlay for separation from the page

#### Scenario: Popover separates without a ring

- **WHEN** a `Popover` or `Select` content surface opens over live page content with no dimming overlay
- **THEN** it renders without a decorative ring, and its `--popover` background step plus `shadow-md` distinguish its edge from the content beneath

#### Scenario: Focus ring is preserved

- **WHEN** a control inside any container receives keyboard focus
- **THEN** the focus-visible ring renders normally — the no-decorative-ring rule does not remove accessibility focus indication

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

### Requirement: Unified close and expand controls

`DialogContent` SHALL render a single control group positioned `absolute` at `top-3 right-3` containing, when enabled, an expand button and a close button, each sized `size-8`. The close button SHALL be present by default and SHALL be controllable via a `closeButton` prop. An expand action SHALL be enabled by providing an `onExpand` callback, with an accessible label configurable via `expandLabel`. Individual dialog headers SHALL NOT hand-roll their own close or expand buttons. The header SHALL reserve horizontal space (`pr-20`) so a long title wraps to the left of the control group rather than beneath it.

`AlertDialog` SHALL NOT render this close/expand control group (see the dismiss-semantics requirement).

#### Scenario: Consistent control geometry

- **WHEN** any two dialogs that expose close and/or expand controls are compared
- **THEN** the controls appear at the same position (`top-3 right-3`) and the same size (`size-8`)

#### Scenario: Close routes through dialog open state

- **WHEN** the user activates the built-in close button on the edit dialog while the form is dirty
- **THEN** the close request propagates through the dialog's `onOpenChange(false)` handler and triggers the unsaved-changes discard confirmation

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

### Requirement: AlertDialog preserves dismiss semantics

`AlertDialog` SHALL adopt the shared three-section structure, the no-ring rule, the `--card` surface, and the `srOnly` accessibility prop, but SHALL NOT adopt `Dialog`'s dismissal affordances. `AlertDialog` SHALL NOT dismiss on outside-click or Esc, and SHALL NOT render a default top-right close button. Dismissal SHALL require an explicit footer action (cancel or confirm).

#### Scenario: Alert requires an explicit choice

- **WHEN** an open `AlertDialog` receives an outside click or Esc key
- **THEN** the dialog remains open and the user must choose an explicit cancel or confirm action to dismiss it

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

### Requirement: Accessible description without warnings

Every overlay surface SHALL include a title and a description. When no visible description is appropriate, the description SHALL be hidden via an `srOnly` prop on the title/description components rather than via ad-hoc `className="sr-only"` or `aria-describedby={undefined}`. Rendered overlay surfaces SHALL produce no Radix "Missing Description" or `aria-describedby` console warning.

#### Scenario: Hidden description satisfies a11y

- **WHEN** an overlay surface has no visible description and uses the description component with `srOnly`
- **THEN** the description is available to assistive technology, is visually hidden, and no accessibility warning is emitted

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
