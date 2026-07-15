## Summary

Redefine the app's background tokens into a three-layer elevation model (page → floating → surface), derive a single depth rule for overlay-backed surfaces (overlay replaces ring), unify the overlay component layout (`Dialog`, `AlertDialog`, `Drawer`) on that foundation, and ship a `design-system` reference page in the blueprint that documents the whole system.

## Motivation

The current color system has a semantic defect: in light mode `--background`, `--card`, and `--popover` all share the same lightness (98.45%), collapsing the page layer and the surface layer into one value. To get any contrast between the page and cards, the app body was forced to use `bg-accent` — a token whose semantic role is hover/highlight, not page background. `docs/design-system.md` then documented this workaround as canonical ("`bg-accent` is the page body"), embedding the drift into the design rules.

This blocks consistent elevation: a Dialog has no background layer distinct from both the page and the cards it contains, so modal surfaces and the cards inside them cannot be visually separated without per-component hacks (e.g. suppressing Card ring/shadow only inside dialogs).

Two further gaps compound this. First, the `entry-ui` change removed the ring/border from overlay-backed surfaces (Drawer/Dialog) and the result read _better_ — but that observation was never written down as a rule, so nothing stops the next component from re-adding a ring. Second, `entry-ui` added a `Drawer` (vaul bottom sheet) that renders its own dimming overlay yet sits on `bg-card`, an elevation the overlay model does not account for. And the design language itself has no single reference surface: `docs/design-system.md` is prose that already teaches the wrong rule.

The fix is to make the background tokens mean what they say, introduce a true middle layer for non-overlay floating surfaces, state the overlay-replaces-ring depth rule explicitly, rebuild the overlay components on that foundation, and publish a live reference page that renders the real tokens and rules.

## Proposed Solution

**1. Three-layer background model** (elevation = lighter; each layer a distinct value):

| Layer | Role                          | Token          | dark L        | light L                            |
| ----- | ----------------------------- | -------------- | ------------- | ---------------------------------- |
| 0     | page body + overlay surfaces  | `--background` | 4.9% (keep)   | 95.6% (adopt current accent value) |
| 0.5   | non-overlay floating surfaces | `--popover`    | ~10% (change) | ~97% (change)                      |
| 1     | card / item                   | `--card`       | 14.5% (keep)  | 98.45% (keep)                      |

- Body switches from `bg-accent` to `bg-background`.
- `--popover` is repurposed as the 0.5 layer for non-overlay floating surfaces only (Popover, Select/Dropdown content); their `shadow-md` keeps them visibly raised with no overlay to help.
- Overlay-backed surfaces (`Dialog`, `AlertDialog`, `Drawer`) render on `--background` (layer 0): they rely on their dimming `Overlay`, not a distinct surface color, to separate from the page.
- `--accent` returns to its hover/highlight role (value unchanged; no longer used as body background).
- HSL values are starting points and may be tuned during implementation for perceived contrast.

**2. Overlay-replaces-ring depth rule** (make the `entry-ui` observation a contract):

A surface signals its elevation with **either** a dimming overlay **or** a ring — never both, never neither:

- **Overlay-backed** surfaces (`Dialog`, `AlertDialog`, `Drawer` — anything with a `bg-black/80` scrim): no ring. The scrim is the depth cue.
- **Non-overlay floating** surfaces (`Popover`, `Select`, `Dropdown`): keep `ring` + `shadow-md`. With no scrim, the ring is the only edge that separates them from the live content beneath.
- **In-flow** surfaces (`Card`, `Item`): the `--card` background step is the cue.

**3. Unified overlay layout** (built on the new layers + depth rule), covering `Dialog`, `AlertDialog`, and `Drawer`:

- Content carries no padding, is `overflow-hidden`, uses `bg-background`, no ring, and is a `flex` column.
- Three-section structure: `*Header` → new `*Body` (the sole scroll container) → `*Footer`, each owning its own padding.
- Unified close/expand control group built into the content (`absolute top-3 right-3`, `size-8` ghost icons); per-header hand-rolled buttons removed.
- `*Title`/`*Description` gain an `srOnly` prop, replacing scattered `className="sr-only"` and `aria-describedby={undefined}`.
- `AlertDialog` adopts the same structural shell and tokens as `Dialog`, **but preserves its dismiss semantics**: no outside-click / Esc auto-dismiss, no default close button — it still requires an explicit action/cancel choice. Only its layout, background, ring, and `srOnly` converge with `Dialog`.
- `Drawer` (vaul) adopts the layer-0 background and drops any ring per the depth rule; its snap-point peek behavior is unchanged.

**4. `design-system` reference page** (a deliverable of this change): a live page in the blueprint that renders the real VolleyBro tokens and rules — brand assets, color (incl. brand/feedback/chart tokens), typography by application role, spacing, radius, and the elevation & depth model — replacing `docs/design-system.md` prose with a rendered source of truth. The depth section's overlay-variant comparison also serves as the decision tool for the open Drawer-layer question (see Impact).

**5. Documentation**: retire the misleading rules in `docs/design-system.md` (point it at the rendered page) and correct every reference that names `bg-accent` as the page background.

## Non-Goals

- **Form item-ization** (replacing form `<Card>` wrappers with `ItemGroup`/`Item` inset-grouped structure) is explicitly deferred to a separate later change. Existing forms keep their current `<Card>` markup; on the new layers the Card pops correctly without changes.
- **No revaluing of brand/feedback/chart color tokens** (`primary`, `destructive`, `success`, `warning`, `info`, `chart-*`). They are _documented_ on the design-system page but their HSL values are unchanged.
- **No new color token** is introduced — the 0.5 layer reuses `--popover`.
- **`AlertDialog` dismiss semantics** are deliberately _not_ changed: it keeps requiring an explicit choice (no outside-click/Esc dismiss). Only its layout/background/ring/srOnly converge with `Dialog`.

## Alternatives Considered

- **New dedicated `--dialog` token for layer 0.5**: cleaner separation (Popover/Select stay at card-level layer 1), but adds a token. Rejected in favor of reusing `--popover`, accepting that floating surfaces drop to the middle layer (shadow still differentiates them).
- **Keep `bg-accent` as body, only patch the dialog Card problem with scoped globals.css**: treats the symptom, not the root token-semantics defect; leaves `background`/`card` collapsed. Rejected.
- **Leave `AlertDialog`/`Drawer` out of scope** (original framing): rejected — they are overlay-backed and otherwise equivalent to `Dialog`; leaving them on different layouts/layers for no causal reason is exactly the inconsistency this change exists to remove.

## Impact

- Affected specs:
  - New: `elevation-tokens` (three-layer background contract + overlay-replaces-ring depth rule; names Drawer)
  - New: `overlay-layout` (shared overlay structure for Dialog + AlertDialog + Drawer: three-section, close/expand, srOnly, ring rule, AlertDialog dismiss carve-out)
- Affected code:
  - Modified:
    - src/app/globals.css
    - src/components/ui/dialog.tsx
    - src/components/ui/alert-dialog.tsx
    - src/components/ui/drawer.tsx
    - src/components/layout/edit-dialog-container.tsx
    - src/components/game/options/index.tsx
    - src/components/game/set-options/index.tsx
    - src/components/game/sets/edit.tsx
    - src/components/team/team-switcher.tsx
    - src/components/layout/nav/action-button.tsx
    - src/components/landing/cta-button.tsx
    - src/components/user/menu/dark-mode.tsx
    - src/components/team/lineup/panel/options/libero-replace.tsx
    - src/components/team/lineup/panel/options/lineup-error.tsx
    - src/components/team/players/membership-section.tsx (AlertDialog)
    - src/components/team/info/index.tsx (AlertDialog)
    - src/components/game/summary-drawer.tsx (Drawer)
    - src/stories/ui/dialog.stories.tsx
    - docs/design-system.md
  - New (design-system reference page, in blueprint):
    - blueprint/content/design-system/\* (brand, color, typography, spacing, radius, elevation-depth pages)
    - blueprint route/nav wiring for the new pages
  - Removed: (none)

### Impact recomputed against current dev (entry-ui merged)

This change was drafted (2026-06-20) before the `entry-ui` change landed on dev.
Re-deriving the real `<DialogContent>` inventory against current dev changes the
migration list and pulls two surfaces into scope that the original taxonomy excluded:

- **Dialog migration list — one swap, count unchanged (10 dialog surfaces + primitive + story):**
  - **Removed** `src/components/game/new/index.tsx` — it no longer renders its own
    `DialogContent`; the `contextual-edit-pages` change turned it into a modal/workspace
    route driven by `edit-dialog-container`.
  - **Added** `src/components/landing/cta-button.tsx` — a Dialog surface introduced
    after this change was drafted.

- **AlertDialog (now in scope):** `team/players/membership-section.tsx` and
  `team/info/index.tsx` render `AlertDialogContent`. They already sit on `bg-background`,
  so the token is correct; they migrate to the shared three-section shell / srOnly /
  ring rule, but **keep** their dismiss semantics (explicit choice required). The
  design.md D1 empirical anchor (team/info's `AlertDialogContent` with a nested Card)
  still holds — Card-on-background-under-overlay already works.

- **Drawer (now in scope) — `src/components/ui/drawer.tsx`, consumed by
  `src/components/game/summary-drawer.tsx`:** entry-ui added a vaul bottom sheet that
  renders its own dimming `DrawerOverlay` yet sits on `bg-card` (layer 1). By the overlay
  rule it belongs on layer 0 (`--background`) and carries no ring. Visual risk is low
  (`--card` is unchanged, so the sheet still pops over the dimmed page). **Open decision,
  resolved via the design-system page's overlay-variant comparison:** align Drawer to
  `bg-background` per the overlay rule, or keep it on `bg-card`. The blueprint depth
  section renders both for the final call.

- **`srOnly` migration scope** is the intersection {overlay surfaces} ∩ {existing
  `sr-only`/`aria-describedby={undefined}`}: `game/options`, `game/set-options`,
  `game/sets/edit`, `edit-dialog-container`, `nav/action-button`, `lineup-error`,
  `dark-mode`, plus `game/options/edit/index.tsx`. Unrelated `sr-only` (`custom/court`,
  `game/header`, `ui/form`) is out of scope; `summary-drawer`'s is re-evaluated under the
  Drawer migration.
