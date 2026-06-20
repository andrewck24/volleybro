## Context

The app's surface colors are driven by shadcn-style CSS custom properties in `src/app/globals.css`. Two defects exist today:

1. **Collapsed layers.** In light mode `--background`, `--card`, and `--popover` are all `hsl(330, 10%, 98.45%)`. The page layer and the card/surface layer are indistinguishable.
2. **Token misuse.** Because page and card share a value, the `body` element uses `bg-accent` (`hsl(230, 20%, 95.6%)` light / `hsl(192, 5%, 5.5%)` dark) to gain contrast. `accent` is semantically a hover/highlight token. `docs/design-system.md` documents `bg-accent` as the page background, codifying the workaround.

Consequence: a Dialog has no surface layer distinct from both the page and the cards inside it. The previous iteration tried to patch this with a scoped `globals.css` rule that strips Card ring/shadow only inside dialogs — a symptom fix.

`bg-accent` appears in 8 files; `bg-card` in 19; `bg-popover` in 2 (Popover, Select). Blast radius is small.

## Goals / Non-Goals

**Goals:**

- Establish three visually distinct background layers: page (0), modal/floating (0.5), surface (1).
- Make `body` use `bg-background` and Dialog use `bg-popover`, so token names match their roles.
- Rebuild the Dialog into a three-section layout (`DialogHeader` / `DialogBody` / `DialogFooter`) with a single scroll container and a unified close/expand control group.
- Existing form `<Card>` content renders correctly on the new layers without per-component shadow/ring suppression.

**Non-Goals:**

- Form item-ization (replacing form `<Card>` with `ItemGroup`/`Item`) — deferred to a later change.
- Changes to brand/feedback/chart tokens.
- Introducing any new color token.

## Decisions

### D1: Three-layer model via existing tokens (no new token)

Repurpose `--popover` as the 0.5 layer rather than adding `--dialog`. Dialog, Popover, Select, and Dropdown all render on `bg-popover`. Their `shadow-md` keeps floating surfaces raised despite the middle-layer background.

Alternative — a dedicated `--dialog` token keeping Popover/Select at layer 1 — was rejected to avoid token proliferation. Trade-off: floating menus sit one layer lower than cards; acceptable because shadow remains the primary depth cue for transient floats.

### D2: Lightness assignments (elevation = lighter)

| Token | dark (current → new) | light (current → new) |
| --- | --- | --- |
| `--background` | 4.9% → 4.9% (keep) | 98.45% → 95.6% |
| `--popover` | 14.5% → ~10% | 98.45% → ~97% |
| `--card` | 14.5% → 14.5% (keep) | 98.45% → 98.45% (keep) |

Light `--background` adopts the current `accent` lightness (95.6%) so the page keeps its present appearance while the token regains its correct meaning. `--accent` value is unchanged; it simply stops being used as `body` background. Concrete HSL strings are tuning knobs — implementer adjusts saturation/hue for clean perceived steps; the ordering (0 darkest-on-light / 0.5 mid / 1 lightest-on-light, inverted in dark) is the contract.

### D3: Dialog owns no padding; DialogBody is the only scroll container

`DialogContent` is `flex flex-col overflow-hidden` with `bg-popover`. `DialogHeader` (`px-4 pt-4 pr-20 pb-2`), `DialogBody` (`flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-4`), and `DialogFooter` (`px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]`) each own spacing. `pr-20` reserves the 80px close+expand control width so long titles wrap left of the buttons.

### D4: Unified close/expand control + srOnly

`DialogContent` renders one `absolute top-3 right-3` group: optional `onExpand` ghost button + `closeButton` (default true) Radix Close, both `size-8`. `DialogTitle`/`DialogDescription` gain `srOnly?: boolean`, replacing `className="sr-only"` and `aria-describedby={undefined}`. The edit dialog's close routes through Radix Close → root `onOpenChange(false)` → existing discard guard, preserving dirty-state confirmation.

## Implementation Contract

**Behavior observed after ship:**

- Page body, dialog/popover surfaces, and cards/items each render a visibly different background in both light and dark mode.
- Inside any dialog, a `<Card>` (e.g. `TeamForm`) is raised above the dialog surface identically to how it appears full-page — no special-casing.
- Every dialog has the same close/expand button geometry (`top-3 right-3`, `size-8`) and emits no Radix "Missing Description" / `aria-describedby` console warning.
- On desktop, the dialog scrollbar sits flush to the window edge (content scrolls within `DialogBody`, window is `overflow-hidden`).

**Interface / data shape:**

- CSS tokens in `src/app/globals.css`: `--background`, `--popover` (both `:root` and `.dark`) re-valued per D2.
- `body` class: `bg-accent` → `bg-background`.
- `src/components/ui/dialog.tsx` exports add `DialogBody`. `DialogContentProps` adds `onExpand?: () => void` and `expandLabel?: string`. `DialogTitle`/`DialogDescription` props add `srOnly?: boolean`. `dialogContentVariants` base uses `bg-popover` (replaces `bg-card`).

**Failure modes:**

- Items placed directly inside a dialog (not within a Card) — e.g. `TeamList` in `team-switcher`, lists in `game/options` — previously sat on `bg-card` with shadow suppressed. On the new `bg-popover` dialog surface their contrast must be re-verified; if they read as flat, the `[data-slot="DialogContent"] [data-slot="item"]` shadow-suppression entry is removed so they regain `shadow-sm`. This is a verification gate, not an assumed edit.

**Acceptance criteria:**

- `pnpm type-check` and `pnpm build` pass.
- Manual: open each migrated dialog in light and dark mode; confirm the three-layer separation, Card elevation, button geometry, no a11y warning, and edit-dialog discard guard (close / Esc / overlay click when dirty).

**Scope boundaries:**

- In scope: the token re-valuing, `body` background, `dialog.tsx` structure, the 13 listed call sites, and `docs/design-system.md`.
- Out of scope: form internals, brand/feedback/chart tokens, any new token, item-grouped form redesign.

## Risks / Trade-offs

- **Global visual shift.** Re-valuing `--background`/`--popover` affects every screen. Mitigated by adopting current accent lightness for light `--background` so the page looks unchanged; dialogs/popovers shift intentionally.
- **Floating menus one layer lower (D1).** Accepted; shadow-md differentiates.
- **Item-in-dialog contrast** may need the shadow-suppression entry removed (see Failure modes) — verified visually, not assumed.
- **design-system.md drift.** The doc currently teaches the wrong rule; failing to update it would re-introduce the defect. The doc update is in scope and required.
