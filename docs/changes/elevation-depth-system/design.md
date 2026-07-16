## Context

The app's surface colors are driven by shadcn-style CSS custom properties in `src/app/globals.css`. Two defects exist today:

1. **Collapsed layers.** In light mode `--background`, `--card`, and `--popover` are all `hsl(330, 10%, 98.45%)`. The page layer and the card/surface layer are indistinguishable.
2. **Token misuse.** Because page and card share a value, the `body` element uses `bg-accent` (`hsl(230, 20%, 95.6%)` light / `hsl(192, 5%, 5.5%)` dark) to gain contrast. `accent` is semantically a hover/highlight token. `docs/design-system.md` documents `bg-accent` as the page background, codifying the workaround.

Consequence: a Dialog has no surface layer distinct from both the page and the cards inside it. The previous iteration tried to patch this with a scoped `globals.css` rule that strips Card ring/shadow only inside dialogs — a symptom fix.

`bg-accent` appears in 8 files; `bg-card` in 19; `bg-popover` in 2 (Popover, Select). Blast radius is small.

## Goals / Non-Goals

**Goals:**

- Establish three visually distinct background layers: page (0), non-overlay floating (0.5), surface (1).
- Make `body` use `bg-background` and overlay surfaces (`Dialog`, `AlertDialog`, `Drawer`) use `bg-card`, so token names match their roles (page tokens for the page, surface tokens for raised surfaces).
- State the overlay-replaces-ring depth rule as a contract: a surface uses a dimming overlay _or_ a ring, never both.
- Rebuild the overlay components (`Dialog`, `AlertDialog`, `Drawer`) onto a shared three-section layout (`*Header` / `*Body` / `*Footer`) with a single scroll container and a unified close/expand control group.
- Existing form `<Card>` content renders correctly on the new layers without per-component shadow/ring suppression.
- Ship a rendered `design-system` reference page that documents the tokens and rules, replacing the misleading `docs/design-system.md` prose.

**Non-Goals:**

- Form item-ization (replacing form `<Card>` with `ItemGroup`/`Item`) — deferred to a later change.
- Revaluing brand/feedback/chart tokens — they are _documented_ on the design-system page but their HSL values are unchanged.
- Introducing any new color token.
- Changing `AlertDialog` dismiss semantics — it keeps requiring an explicit choice (no outside-click / Esc auto-dismiss, no default close button). Only its layout, background, ring, and `srOnly` converge with `Dialog` (see D6).

## Decisions

### D1: Layer assignment by surface role (existing tokens, no new token)

Layers are assigned by what the surface _is_ — the page plane, a non-overlay float, or a raised content surface — with all modal-class surfaces sharing the card layer:

- Layer 0 (`--background`): the page body only.
- Layer 0.5 (`--popover`): non-overlay floating surfaces only — `Popover`, `Select` content (and future `Dropdown`/`Tooltip`). These render directly over live page content with no dimming, so they require a value distinct from the page to register as a surface at all. Their `shadow-md` keeps them visibly raised despite sharing the middle-layer background with no overlay to help.
- Layer 1 (`--card`): `Card`/`Item` — and **all overlay-backed surfaces** (`Dialog`, `AlertDialog`, `Drawer`). An overlay surface is separated from the page by its dimming scrim (D5), not by color; giving every modal the card surface color keeps the system one-toned: the Drawer peek (which is in-flow beside the `bg-card` panel/header before any scrim exists) stays continuous with the page's card system across its whole lifecycle, and Dialog/AlertDialog match it so there is exactly one modal surface color. Consequence: card-class elements inside a modal sit on a same-color surface and are distinguished by **shadow** (per D5's compensation rule and the section-5 gate), not by a background step.

Decision history (2026-07-16): the original rule put every overlay-backed surface on layer 0 (`--background`), anchored on `AlertDialogContent`'s existing `bg-background` + nested Card. Rejected after the change design page's overlay lab: the Drawer's lifecycle breaks it — the peek state is in-flow beside `bg-card` surfaces with no scrim, so a layer-0 drawer either flashes color on expand or disappears into the page at peek. Rather than split modals across two surface colors, the user decided **all modal-class surfaces use `bg-card`**; `AlertDialogContent` migrates from `bg-background` to `bg-card` accordingly.

Alternative — uniformly putting all modal/floating surfaces, including `Dialog`, on `--popover` (the original framing of this decision) — was rejected: it would leave `Dialog` and `AlertDialog`, both overlay-backed and otherwise equivalent in elevation needs, on different layers for no causal reason. A dedicated `--dialog` token was also rejected to avoid token proliferation. Trade-off: none beyond the original D1 — `--popover` is now consumed by fewer components, but its value still must differ from both `--background` and `--card`.

### D2: Lightness assignments (elevation = lighter)

| Token          | dark (current → new) | light (current → new)  |
| -------------- | -------------------- | ---------------------- |
| `--background` | 4.9% → 4.9% (keep)   | 98.45% → 95.6%         |
| `--popover`    | 14.5% → ~10%         | 98.45% → ~97%          |
| `--card`       | 14.5% → 14.5% (keep) | 98.45% → 98.45% (keep) |

Light `--background` adopts the current `accent` lightness (95.6%) so the page keeps its present appearance while the token regains its correct meaning. `--accent` value is unchanged; it simply stops being used as `body` background. Concrete HSL strings are tuning knobs — implementer adjusts saturation/hue for clean perceived steps; the ordering (0 darkest-on-light / 0.5 mid / 1 lightest-on-light, inverted in dark) is the contract.

### D3: Dialog owns no padding; DialogBody is the only scroll container

`DialogContent` is `flex flex-col overflow-hidden` with `bg-card` (layer 1, per D1) and no ring (per D5). `DialogHeader` (`px-4 pt-4 pr-20 pb-2`), `DialogBody` (`flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-4`), and `DialogFooter` (`px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]`) each own spacing. `pr-20` reserves the 80px close+expand control width so long titles wrap left of the buttons.

### D4: Unified close/expand control + srOnly

`DialogContent` renders one `absolute top-3 right-3` group: optional `onExpand` ghost button + `closeButton` (default true) Radix Close, both `size-8`. `DialogTitle`/`DialogDescription` gain `srOnly?: boolean`, replacing `className="sr-only"` and `aria-describedby={undefined}`. The edit dialog's close routes through Radix Close → root `onOpenChange(false)` → existing discard guard, preserving dirty-state confirmation.

### D5: No container carries a ring (depth is signaled by scrim, background step, and shadow)

Modal, popover, and card components are all containers carrying other content, so their ring strategy is uniform: **no container carries a decorative ring/border**. Each kind signals elevation through its remaining cues:

- **Overlay-backed** (`Dialog`, `AlertDialog`, `Drawer` — renders a `bg-black/80` scrim): the scrim is the depth cue. This codifies the `entry-ui` observation (removing the ring looked better) as a rule so it isn't silently reverted.
- **Non-overlay floating** (`Popover`, `Select`, `Dropdown`): the `--popover` background step + `shadow-md`.
- **In-flow** (`Card`, `Item`): the `--card` background step (+ existing shadow treatment).

The `--ring` token remains for **focus-visible states only** — accessibility focus rings are not decorative borders and are untouched by this rule.

Decision history: the original formulation kept a ring on non-overlay floats ("the ring is the only edge separating them from live content"). Rejected (2026-07-16, via the change design page's Lab B comparison): the per-kind split left the three container classes inconsistent for no causal reason, and the rendered comparison showed the background step + `shadow-md` carries the popover edge on its own. "Ring everywhere" was also rejected — it contradicts the `entry-ui` observation. Consequence: scope includes `popover.tsx`, `select.tsx`, `card.tsx`, `item.tsx` decorative ring/border removal.

Where a card-class element must sit on a same-color surface (e.g. inside an overlay), the compensation cue is **shadow** (e.g. restoring `shadow-sm`), never a ring — keeping the no-ring rule unbroken.

### D6: AlertDialog and Drawer converge on the shared overlay shell (all modals on bg-card; AlertDialog keeps dismiss semantics)

Both are overlay-backed, so both adopt the D1 modal surface (`bg-card`), the D5 no-ring rule, the D3 three-section structure, and the D4 `srOnly` prop.

- **`AlertDialog`**: gains `AlertDialogBody` and the shared header/body/footer padding + `srOnly`. It **keeps its dismiss semantics** — no outside-click / Esc auto-dismiss and no default top-right close button; the footer's explicit Cancel/Action buttons remain the only way out. So it takes the shell but not the `Dialog` close/expand control group. Its surface migrates from `bg-background` to `bg-card` (revised D1), alongside the ring removal and structural edits.
- **`Drawer`**: adopts the no-ring rule and **keeps `bg-card`** — decided (2026-07-16) via the change design page's overlay lab: the peek state is in-flow with the page's card surfaces, and per revised D1 every modal shares the card color anyway. Its vaul snap-point peek behavior is unchanged; no background edit is needed.

### D7: The design-system page is a rendered deliverable of this change

The change ships a live `design-system` section in the blueprint (Fumadocs) that renders the real tokens and rules — brand assets, color (incl. brand/feedback/chart tokens, documented not revalued), typography by application role, spacing, radius, and elevation & depth. It supersedes the prose in `docs/design-system.md` (which taught the wrong `bg-accent` rule) as the source of truth, and its overlay-variant comparison doubles as the decision tool for D6's open Drawer-layer question. The blueprint carries the _complete_ section page structure (index + per-topic pages), not only a single decision page.

**Token sharing lifecycle:** while the token values are under active decision, the blueprint imports the app's `src/styles/tokens.css` directly (cross-app import) so the docs can never drift from the moving source. Once this change's token values are finalized at apply time, the tokens are frozen — the blueprint then takes a **local copy** of `tokens.css` and the cross-app import is cut, matching how the frozen brand components are already handled (copy for frozen assets, share only what is live).

## Implementation Contract

**Behavior observed after ship:**

- Every overlay surface (`Dialog`, `AlertDialog`, `Drawer`) renders on `--card`, separated from the page by the dimming overlay. The page (`--background`), non-overlay floats (`--popover`), and cards/surfaces (`--card`) each render a visibly different background, in both light and dark mode. Card-class elements inside a modal sit on the same color and are distinguished by shadow (section-5 gate).
- Inside any dialog, a `<Card>` (e.g. `TeamForm`) sits on the same-color `bg-card` surface and is distinguished by its shadow — one compensation rule (D5), no per-dialog special-casing.
- Every dialog has the same close/expand button geometry (`top-3 right-3`, `size-8`) and emits no Radix "Missing Description" / `aria-describedby` console warning.
- On desktop, the dialog scrollbar sits flush to the window edge (content scrolls within `DialogBody`, window is `overflow-hidden`).

**Interface / data shape:**

- CSS tokens live in `src/styles/tokens.css` — the shared token source imported by both the app's `src/app/globals.css` and the blueprint's stylesheet (D7): `--background`, `--popover` (both `:root`/`.light` and `.dark`) re-valued per D2.
- `body` class: `bg-accent` → `bg-background`.
- `src/components/ui/dialog.tsx` exports add `DialogBody`. `DialogContentProps` adds `onExpand?: () => void` and `expandLabel?: string`. `DialogTitle`/`DialogDescription` props add `srOnly?: boolean`. `dialogContentVariants` base keeps `bg-card`; `AlertDialogContent` migrates `bg-background` → `bg-card` to match (revised D1).

**Failure modes:**

- Items placed directly inside a dialog (not within a Card) — e.g. `TeamList` in `team-switcher`, lists in `game/options` — sit on the same-color `bg-card` dialog surface with shadow currently suppressed. With rings gone everywhere (D5), shadow is the only remaining cue, so the `[data-slot="DialogContent"] [data-slot="item"]` shadow-suppression entry is expected to be removed so they regain `shadow-sm`; the section-5 gate verifies this in both themes rather than assuming it.

**Acceptance criteria:**

- `pnpm type-check` and `pnpm build` pass.
- Manual: open each migrated dialog in light and dark mode; confirm the three-layer separation, Card elevation, button geometry, no a11y warning, and edit-dialog discard guard (close / Esc / overlay click when dirty).

**Scope boundaries:**

- In scope: the token re-valuing, `body` background, `dialog.tsx` structure, the 13 listed call sites, and `docs/design-system.md`.
- Out of scope: form internals, brand/feedback/chart tokens, any new token, item-grouped form redesign, `AlertDialog` structural changes (background token alignment only — already satisfied by existing code, no edit required).

## Risks / Trade-offs

- **Global visual shift.** Re-valuing `--background`/`--popover` affects every screen. Mitigated by adopting current accent lightness for light `--background` so the page looks unchanged; dialogs/popovers shift intentionally.
- **Floating menus one layer lower (D1).** Accepted; shadow-md differentiates.
- **Item-in-dialog contrast** may need the shadow-suppression entry removed (see Failure modes) — verified visually, not assumed.
- **design-system.md drift.** The doc currently teaches the wrong rule; failing to update it would re-introduce the defect. The doc update is in scope and required.
