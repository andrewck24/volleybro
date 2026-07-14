## Summary

Redefine the app's background color tokens into a three-layer elevation model (page → modal → surface) and unify the Dialog layout on top of that foundation.

## Motivation

The current color system has a semantic defect: in light mode `--background`, `--card`, and `--popover` all share the same lightness (98.45%), collapsing the page layer and the surface layer into one value. To get any contrast between the page and cards, the app body was forced to use `bg-accent` — a token whose semantic role is hover/highlight, not page background. `docs/design-system.md` then documented this workaround as canonical ("`bg-accent` is the page body"), embedding the drift into the design rules.

This blocks consistent elevation: a Dialog has no background layer distinct from both the page and the cards it contains, so modal surfaces and the cards inside them cannot be visually separated without per-component hacks (e.g. suppressing Card ring/shadow only inside dialogs).

The fix is to make the background tokens mean what they say and introduce a true middle layer for modal surfaces, then rebuild the Dialog layout to sit on that foundation.

## Proposed Solution

**1. Three-layer background model** (elevation = lighter; each layer a distinct value):

| Layer | Role | Token | dark L | light L |
| --- | --- | --- | --- | --- |
| 0 | page body | `--background` | 4.9% (keep) | 95.6% (adopt current accent value) |
| 0.5 | non-overlay floating surfaces | `--popover` | ~10% (change) | ~97% (change) |
| 1 | card / item | `--card` | 14.5% (keep) | 98.45% (keep) |

- Body switches from `bg-accent` to `bg-background`.
- `--popover` is repurposed as the 0.5 layer for non-overlay floating surfaces only (Popover, Select/Dropdown content); their `shadow-md` keeps them visibly raised with no overlay to help. `Dialog` instead renders on `--background` (layer 0), matching the existing `AlertDialog` pattern — both rely on their dimming `Overlay`, not a distinct surface color, to separate from the page.
- `--accent` returns to its hover/highlight role (value unchanged; no longer used as body background).
- HSL values are starting points and may be tuned during implementation for perceived contrast.

**2. Dialog layout unification** (built on the new layers):

- `DialogContent` carries no padding, is `overflow-hidden`, uses `bg-popover`, and is a `flex` column.
- Three-section structure: `DialogHeader` → new `DialogBody` (the sole scroll container) → `DialogFooter`, each owning its own padding.
- Unified close/expand control group built into `DialogContent` (`absolute top-3 right-3`, `size-8` ghost icons); per-header hand-rolled buttons removed.
- `DialogTitle`/`DialogDescription` gain an `srOnly` prop, replacing scattered `className="sr-only"` and `aria-describedby={undefined}`.
- Each existing dialog migrates to the three-section structure.

**3. Documentation**: update `docs/design-system.md` to describe the three-layer model and correct every reference that names `bg-accent` as the page background.

## Non-Goals

- **Form item-ization** (replacing form `<Card>` wrappers with `ItemGroup`/`Item` inset-grouped structure) is explicitly deferred to a separate later change. Existing forms keep their current `<Card>` markup; on the new layers the Card pops correctly without changes.
- No change to brand/feedback/chart color tokens (`primary`, `destructive`, `success`, `warning`, `info`, `chart-*`).
- No new color token is introduced — the 0.5 layer reuses `--popover`.
- `AlertDialog` structural unification (header/body/footer split, unified controls, `srOnly`, size variants) — out of scope; only its background token alignment is relevant, and it already matches (`bg-background`), so no `AlertDialog` code changes are required.

## Alternatives Considered

- **New dedicated `--dialog` token for layer 0.5**: cleaner separation (Popover/Select stay at card-level layer 1), but adds a token. Rejected in favor of reusing `--popover`, accepting that floating surfaces drop to the middle layer (shadow still differentiates them).
- **Keep `bg-accent` as body, only patch the dialog Card problem with scoped globals.css**: treats the symptom, not the root token-semantics defect; leaves `background`/`card` collapsed. Rejected.

## Impact

- Affected specs:
  - New: `elevation-tokens` (three-layer background contract)
  - New: `dialog-layout` (Dialog structure, close/expand, srOnly contract)
- Affected code:
  - Modified:
    - src/app/globals.css
    - src/components/ui/dialog.tsx
    - src/components/layout/edit-dialog-container.tsx
    - src/components/game/options/index.tsx
    - src/components/game/set-options/index.tsx
    - src/components/game/sets/edit.tsx
    - src/components/team/team-switcher.tsx
    - src/components/layout/nav/action-button.tsx
    - src/components/game/new/index.tsx
    - src/components/user/menu/dark-mode.tsx
    - src/components/team/lineup/panel/options/libero-replace.tsx
    - src/components/team/lineup/panel/options/lineup-error.tsx
    - src/stories/ui/dialog.stories.tsx
    - docs/design-system.md
  - New: (none)
  - Removed: (none)
