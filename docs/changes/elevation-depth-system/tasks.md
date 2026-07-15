## 1. Token foundation

> Satisfies requirements "Three distinct background layers" and "Background tokens carry their semantic role"; implements design decisions D1 (layer assignment by overlay presence, not a modal/floating label) and D2 (lightness assignments, elevation = lighter).

- [x] 1.1 In `src/styles/tokens.css` `:root`, re-value `--background` from `hsl(330, 10%, 98.45%)` to the current accent lightness (`~hsl(230, 20%, 95.6%)`) so the page layer is the darkest of the three light surfaces; tune saturation/hue for a clean step. → verify: light page background visibly darker than `--card` (98.45%).
- [x] 1.2 In `:root`, re-value `--popover` from `hsl(330, 10%, 98.45%)` to a middle value between the new `--background` and `--card` (`~97%`). → verify: light `--background` < `--popover` < `--card` in lightness.
- [x] 1.3 In `.dark`, keep `--background` at `4.9%`, re-value `--popover` from `14.5%` to a middle value (`~10%`) between `--background` and `--card` (`14.5%`). → verify: dark `--background` < `--popover` < `--card`.
- [x] 1.4 Change the `body` utility in `src/app/globals.css` `@layer base` from `bg-accent` to `bg-background`, so background tokens carry their semantic role and the three distinct background layers (D1 three-layer model, D2 lightness assignments) hold. → verify: app shell renders on `--background`; grep shows no `body` reliance on `bg-accent`.

## 2. Dialog component

> Satisfies requirements "Three-section dialog structure", "Unified close and expand controls", and "Accessible description without warnings"; implements design decisions D3 (dialog owns no padding; DialogBody is the only scroll container) and D4 (unified close/expand control + srOnly).

- [ ] 2.1 In `src/components/ui/dialog.tsx`, set `dialogContentVariants` base to use `bg-background` (replacing `bg-card`), matching `AlertDialogContent`'s existing surface token; `overflow-hidden`, no padding/gap; `default` size adds `max-h-[85svh]`. → verify: dialog surface resolves to `--background`.
- [ ] 2.2 Establish the three-section dialog structure (D3): add `DialogBody` as the only scroll container (`flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-4`, `data-slot="DialogBody"`) and export it. Set `DialogHeader` to `px-4 pt-4 pr-20 pb-2` and `DialogFooter` to `px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end`. → verify: three sections each own padding; `DialogContent` has none.
- [ ] 2.3 Build the unified close and expand controls into `DialogContent` (D4): `absolute top-3 right-3` flex row with optional `onExpand` ghost button and default `closeButton` Radix Close, both `size-8`; add `onExpand?`/`expandLabel?` to `DialogContentProps`; import `Button`. Remove the old raw top-right Close. → verify: controls render at `top-3 right-3`, `size-8`.
- [ ] 2.4 Add `srOnly?: boolean` to `DialogTitle` and `DialogDescription` (applies `sr-only`) so dialogs get an accessible description without warnings (D4 srOnly). → verify: passing `srOnly` hides text but keeps it in the a11y tree.

## 3. Edit dialog container

- [ ] 3.1 Rewrite `src/components/layout/edit-dialog-container.tsx` to the three-section structure: `DialogContent size="lg" onExpand={…}` with built-in close, `DialogHeader` (`DialogTitle` + `srOnly` `DialogDescription`), `DialogBody` wrapping `children` (keep `data-testid="dialog-scroll-container"`). Remove hand-rolled header button row and `Button`/icon imports. → verify: dirty close / Esc / overlay click each trigger the discard confirmation; existing `edit-dialog-container` test passes.

## 4. Per-dialog migration

- [ ] 4.1 [P] `src/components/game/options/index.tsx`: wrap general-mode tabs in `DialogHeader` + `DialogBody`; keep `EntriesEdit` full-width directly under `DialogContent`; add `srOnly` description. → verify: tabs scroll within `DialogBody`, no a11y warning.
- [ ] 4.2 [P] `src/components/game/set-options/index.tsx`: three-section; `LineupCourt` + `SetOptionsPanel` inside `DialogBody`; add `srOnly` description. → verify: renders, scrolls, no a11y warning.
- [ ] 4.3 [P] `src/components/game/sets/edit.tsx`: general mode uses `DialogHeader` + `DialogBody` (`GameOptionsSummary`); editing mode keeps `EntriesEdit`; import `DialogTitle` from `@/components/ui/dialog`. → verify: both modes render; no a11y warning.
- [ ] 4.4 [P] `src/components/team/team-switcher.tsx`: add `DialogHeader` with `DialogTitle` + `srOnly` `DialogDescription`; wrap `TeamList` in `DialogBody`. → verify: previously-missing description warning is gone.
- [ ] 4.5 [P] `src/components/layout/nav/action-button.tsx` + `src/components/game/new/index.tsx`: remove `className="px-0 pb-0"` from `DialogContent`; convert `NewGameForm` main and sub views to three-section, removing self-rolled `bg-card`/`px-4`/`overflow-y-auto` wrappers; loading skeleton wrapped in a `DialogHeader`. → verify: new-game flow renders and scrolls within `DialogBody`.
- [ ] 4.6 [P] `src/components/user/menu/dark-mode.tsx`: `DialogHeader` (title + `srOnly` description) + `DialogBody` holding the three `DialogClose` options. → verify: renders, no a11y warning.
- [ ] 4.7 [P] `src/components/team/lineup/panel/options/libero-replace.tsx`: `DialogHeader` + `DialogBody` (Form) + `DialogFooter` (submit). → verify: submit still works; no a11y warning.
- [ ] 4.8 [P] `src/components/team/lineup/panel/options/lineup-error.tsx`: `DialogHeader` (title + `srOnly` description) + `DialogBody` (message). → verify: renders, no a11y warning.

## 5. Item-in-dialog contrast gate

- [ ] 5.1 With the new `bg-background` dialog surface live (same layer as the page, separated only by the dimming overlay), visually inspect dialogs that render `Item` directly (not inside a Card) — `team-switcher` `TeamList`, lists in `game/options`. If items read as flat, remove the `[data-slot="DialogContent"] [data-slot="item"]` entry from the shadow-suppression rule in `src/app/globals.css` so they regain `shadow-sm`; otherwise leave it. → verify: items in dialogs are clearly raised above the dialog surface in both themes.

## 6. Docs and stories

- [ ] 6.1 [P] Update `src/stories/ui/dialog.stories.tsx` to use `DialogHeader`/`DialogBody`/`DialogFooter` and demonstrate `srOnly`. → verify: stories render.
- [ ] 6.2 Rewrite the "Depth, Elevation & Edge Definition" chapter of `docs/design-system.md` as the canonical home of the three-layer model: document layer 0 = `--background` (page body and overlay-backed components — `Dialog`, `AlertDialog`, `Drawer` — which rely on their dimming overlay rather than a distinct surface color), layer 0.5 = `--popover` (non-overlay floating surfaces only — `Popover`/`Select`/`Dropdown`), layer 1 = `--card` (Card/Item); state the invariant that the three background values are distinct per theme and ordered by elevation (D1/D2), the overlay-replaces-ring depth rule (D5: overlay-backed surfaces drop the ring, non-overlay floats keep it), and that layer assignment follows overlay presence rather than a modal/floating label. Replace the old two-level (Level 1/Level 2) model and every reference that names `bg-accent` as the page body; correct the Token Lightness Reference and Hover State tables to name `bg-background` as the page background and restore `accent` to a hover/highlight role. → verify: design-system.md describes the three layers with their tokens (including the overlay-presence rule), and no text states `bg-accent` is the page/body background or that Dialog renders on `--popover`.
- [ ] 6.3 Disclose the three-layer model from related docs so it is discoverable rather than buried: add `docs/design-system.md` to the "See also" pointer in `CLAUDE.md` (alongside testing-strategy and maintenance-policy), describing it as the color/elevation reference. → verify: `CLAUDE.md` links to `docs/design-system.md`. (Note: this change's `design.md` and specs already cross-reference the model; on archive they become the historical record.)

## 7. AlertDialog convergence (keep dismiss semantics)

> Satisfies the `overlay-layout` requirements "Shared three-section overlay structure", "Overlay-backed surfaces carry no ring", "AlertDialog preserves dismiss semantics", and "Accessible description without warnings"; implements D5 (overlay replaces ring) and D6 (AlertDialog converges structurally but keeps explicit-choice dismissal).

- [ ] 7.1 In `src/components/ui/alert-dialog.tsx`: drop any ring/border from `AlertDialogContent` (D5); confirm it stays on `bg-background`; add `AlertDialogBody` (same `flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-4` as `DialogBody`) and export it; set header/footer padding to match Dialog. Do NOT add a close/expand control group and do NOT enable outside-click/Esc dismiss — keep the explicit Cancel/Action footer as the only exit. Add `srOnly?` to `AlertDialogTitle`/`AlertDialogDescription`. → verify: alert has no ring, no top-right close, still ignores outside-click/Esc; three sections own their padding.
- [ ] 7.2 [P] Migrate `src/components/team/players/membership-section.tsx` and `src/components/team/info/index.tsx` to the three-section shell (`AlertDialogHeader`/`AlertDialogBody`/`AlertDialogFooter`), adding `srOnly` descriptions where none is visible. → verify: both render; nested Card in team/info still pops; no a11y warning; dismissal still requires an explicit button.

## 8. Drawer convergence

> Satisfies `overlay-layout` "Overlay-backed surfaces carry no ring" and `elevation-tokens` "Overlay-backed surfaces share the page layer"; implements D5 and D6's Drawer clause. Layer choice confirmed by the design-system overlay comparison (section 9).

- [ ] 8.1 In `src/components/ui/drawer.tsx`: remove any ring/border from `DrawerContent` (D5); the vaul snap-point peek behavior is unchanged. → verify: drawer peek and expanded states render without a ring.
- [ ] 8.2 Set `DrawerContent` background per the section-9 decision — align to `bg-background` (D1 overlay rule) unless the rendered comparison rules for keeping `bg-card`. Re-check `src/components/game/summary-drawer.tsx` for any now-redundant surface/`sr-only` handling. → verify: drawer surface matches the confirmed layer in both themes; `GameSkeleton` peek still mirrors it (`src/components/game/index.tsx`).

## 9. design-system reference page (blueprint deliverable)

> Satisfies D7. A complete Fumadocs section (index + per-topic pages), not a single page. Depth section doubles as the D6 Drawer-layer decision tool.

- [ ] 9.1 Scaffold the `design-system` section pages in `blueprint/content/design-system/` and wire them into `blueprint/src/app/(docs)/design-system/[[...slug]]/page.tsx` (static module map + `generateStaticParams`): index overview + `brand`, `color`, `typography`, `spacing`, `radius`, `elevation-depth`, keeping the existing `components` page. → verify: each route renders under `/design-system/*`.
- [ ] 9.2 Build the unblocked sections from the real VolleyBro tokens: brand assets (logo-symbol/logo-type on light/dark/teal grounds), color (incl. brand/feedback/chart tokens, documented not revalued), typography by application role with Tailwind classes + per-context fonts, spacing, radius. → verify: values match `src/styles/tokens.css`; renders in both themes.
- [ ] 9.3 Build the elevation & depth section: the three background layers and the overlay-replaces-ring rule, plus an overlay-variant comparison rendering `Dialog`/`AlertDialog`/`Drawer` with ring vs no-ring × `bg-background` vs `bg-card`, so the open Drawer-layer question (D6) can be decided from the rendered result. → verify: comparison renders all variants; the Drawer-layer call is recorded back into section 8 / design.md D6.

## 10. Final verification

- [ ] 10.1 Run `pnpm type-check`, then `pnpm build`; open each migrated overlay (Dialog, AlertDialog, Drawer) in light and dark mode confirming three-layer separation, no ring on overlay surfaces, Card elevation, `top-3 right-3`/`size-8` controls on Dialog (absent on AlertDialog), AlertDialog still requiring an explicit choice, no a11y warning, and the edit-dialog discard guard. → verify: both commands pass; all checks above hold.
