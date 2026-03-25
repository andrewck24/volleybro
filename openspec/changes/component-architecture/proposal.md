## Why

`person-item.tsx` and `team-item.tsx` share ~80% identical layout code (avatar + text + action slot, three-way Link/button/div wrapper, stopPropagation on action slot). This duplication makes consistent updates error-prone. Additionally, the boundary between `ui/` and `custom/` folders lacks clear documentation.

## What Changes

- Extract a shared `ListItem` layout component from person-item and team-item into `custom/list-item/`
- Refactor `PersonItem` and `TeamItem` to compose on top of `ListItem`, with co-located skeleton states
- Relocate `LoadingCourt` from `custom/loading/court.tsx` into `custom/court/` (co-locate with its parent component)
- Keep `custom/loading/card.tsx` (LoadingCard) in place — will be replaced by per-component skeletons in future change (loading-states)
- Create `docs/architecture.md` documenting the `ui/` vs `custom/` component layer boundary (to be iteratively expanded by future changes)

## Capabilities

### New Capabilities

(none — ListItem is an internal layout primitive without business rules; its contract is defined in design.md)

### Modified Capabilities

(none)

## Impact

- Affected code:
  - `src/components/custom/list-item/` (new — shared layout component + tests)
  - `src/components/custom/person-item.tsx` (refactor to compose ListItem)
  - `src/components/custom/team-item.tsx` (refactor to compose ListItem)
  - `src/components/custom/loading/court.tsx` (relocate into `custom/court/`)
  - `src/components/custom/__tests__/person-item.test.tsx` (update tests)
  - `src/components/custom/__tests__/team-item.test.tsx` (update tests)
  - Consumers importing LoadingCourt (import path update)
  - `src/components/ui/sheet.tsx` (delete — zero consumers)
  - `src/components/ui/panel.tsx` (relocate to `custom/panel/` — only used in court-related pages)
  - `src/components/ui/flip-words.tsx` (relocate to `landing/` — only used in landing/hero)
  - `docs/architecture.md` (new)
