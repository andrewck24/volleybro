## Why

The original list-row implementations mixed layout, navigation wrappers, and action-slot event isolation in bespoke components. This made a11y fixes and visual consistency harder to maintain. The project also lacked a clear boundary between `ui/` primitives and app-specific composition in domain components.

## What Changes

- Install Shadcn Item component (`ui/item.tsx`) as the base list-item primitive, replacing the custom `ListItem` compound component
- Add small domain-agnostic helpers to `ui/item.tsx` where they reduce repeated boilerplate, such as `ItemAvatar`
- Remove `PersonItem` / `TeamItem` thin wrappers and have consumers compose `Item`, `ItemMedia`, `ItemContent`, `ItemTitle`, `ItemDescription`, and `ItemFooter` directly
- Keep the invitations row fully linkable except for action buttons by using an overlay link plus higher-layer buttons, which preserves axe compliance without nested interactive descendants
- Relocate `LoadingCourt` from `custom/loading/court.tsx` into `custom/court/` (co-locate with its parent component)
- Keep `custom/loading/card.tsx` (LoadingCard) in place — will be replaced by per-component skeletons in future change (loading-states)
- Create `docs/architecture.md` documenting the `ui/` vs `custom/` component layer boundary (to be iteratively expanded by future changes)

## Capabilities

### New Capabilities

(none — Item remains a Shadcn UI primitive; this change clarifies composition guidance and file boundaries)

### Modified Capabilities

(none)

## Impact

- Affected code:
  - `src/components/ui/item.tsx` (new — Shadcn Item component installed via CLI)
  - `src/components/ui/avatar.tsx` (new — shared avatar primitive used by item consumers)
  - `src/components/team/players/list.tsx` (compose Item primitives directly for player rows)
  - `src/components/record/new/roster-list.tsx` (compose Item primitives directly for static roster rows)
  - `src/components/user/menu/index.tsx` (compose Item primitives directly for joined-team rows)
  - `src/components/user/invitations/index.tsx` (compose Item primitives directly; overlay link keeps the item clickable except buttons)
  - `src/components/custom/list-item/` (deleted — thin wrappers removed)
  - `src/components/custom/__tests__/list-item/` (deleted — wrapper tests removed with components)
  - `src/stories/item.stories.tsx` (Storybook coverage for Item primitives and invitation composition)
  - `src/components/custom/loading/court.tsx` (relocate into `custom/court/`)
  - Consumers importing LoadingCourt (import path update)
  - `src/components/ui/sheet.tsx` (delete — zero consumers)
  - `src/components/ui/panel.tsx` (relocate to `custom/panel/` — only used in court-related pages)
  - `src/components/ui/flip-words.tsx` (relocate to `landing/` — only used in landing/hero)
  - `docs/architecture.md` (new)
