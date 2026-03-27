## Why

`person-item.tsx` and `team-item.tsx` share ~80% identical layout code (avatar + text + action slot, three-way Link/button/div wrapper, stopPropagation on action slot). This duplication makes consistent updates error-prone. The custom three-way wrapper pattern (Link/button/div) causes nested interactive element violations (`<button>` inside `<a>` or `<button>`) that fail axe accessibility audits. Additionally, the boundary between `ui/` and `custom/` folders lacks clear documentation.

## What Changes

- Install Shadcn Item component (`ui/item.tsx`) as the base list-item primitive, replacing the custom `ListItem` compound component
- Refactor `PersonItem` and `TeamItem` to compose Shadcn `Item` primitives, using `asChild` for navigation and two distinct item forms (navigable vs static-with-actions)
- Adopt a footer pattern for items that need both navigation and action buttons (e.g., invitation accept/reject), placing interactive buttons outside the navigable area to comply with a11y
- Co-locate skeleton exports within each item component file
- Relocate `LoadingCourt` from `custom/loading/court.tsx` into `custom/court/` (co-locate with its parent component)
- Keep `custom/loading/card.tsx` (LoadingCard) in place — will be replaced by per-component skeletons in future change (loading-states)
- Create `docs/architecture.md` documenting the `ui/` vs `custom/` component layer boundary (to be iteratively expanded by future changes)

## Capabilities

### New Capabilities

(none — Item is a Shadcn UI primitive; PersonItem/TeamItem are internal layout wrappers without business rules; their contracts are defined in design.md)

### Modified Capabilities

(none)

## Impact

- Affected code:
  - `src/components/ui/item.tsx` (new — Shadcn Item component installed via CLI)
  - `src/components/custom/list-item/` (remove custom ListItem, replace with thin wrappers composing Shadcn Item)
  - `src/components/custom/person-item.tsx` → `src/components/custom/list-item/person-item.tsx` (refactor to compose Item)
  - `src/components/custom/team-item.tsx` → `src/components/custom/list-item/team-item.tsx` (refactor to compose Item)
  - `src/components/custom/__tests__/person-item.test.tsx` (update tests)
  - `src/components/custom/__tests__/team-item.test.tsx` (update tests)
  - `src/components/user/invitations/index.tsx` (adopt footer pattern for accept/reject)
  - Consumers importing PersonItem/TeamItem (import path update)
  - `src/components/custom/loading/court.tsx` (relocate into `custom/court/`)
  - Consumers importing LoadingCourt (import path update)
  - `src/components/ui/sheet.tsx` (delete — zero consumers)
  - `src/components/ui/panel.tsx` (relocate to `custom/panel/` — only used in court-related pages)
  - `src/components/ui/flip-words.tsx` (relocate to `landing/` — only used in landing/hero)
  - `docs/architecture.md` (new)
