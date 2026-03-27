## Context

`PersonItem` and `TeamItem` in `src/components/custom/` share ~80% identical code: avatar/icon slot, text + metadata area, action slot with `stopPropagation` event isolation, and a three-way wrapper pattern (Link → button → div). Both use the same Tailwind classes (`h-12 flex items-center gap-3 rounded-md px-3`). The only differences are the leading visual (avatar image vs group icon) and data source (props vs `useTeam` hook).

The original custom `ListItem` compound component attempted to centralize the three-way wrapper (Link/button/div) based on `href`/`onClick` props. However, this approach causes nested interactive element violations: when the wrapper renders as `<button>` or `<div role="button">` and `ListItemAction` contains interactive buttons (e.g., accept/reject), axe reports `nested-interactive`. The `<a>` (Link) case has the same issue. This is a fundamental HTML/ARIA constraint — not solvable by changing the wrapper element type.

Shadcn/UI recently introduced an `Item` compound component (2025-10) that sidesteps this entirely through the `asChild` pattern: consumers choose the root element, and the two modes (navigable vs static-with-actions) are made mutually exclusive by design.

The `custom/loading/` directory holds `LoadingCourt` and `LoadingCard` as standalone skeleton files. `LoadingCourt` is tightly coupled to the court component and should be co-located. `LoadingCard` is a generic skeleton used by 9+ consumers across domains — it stays in place and will be replaced by per-component skeletons in a separate change (future change `loading-states`).

There is no documented boundary between `ui/` (Shadcn-level primitives, zero domain knowledge) and `custom/` (VolleyBro-specific shared components with domain awareness).

## Goals / Non-Goals

**Goals:**

- Install Shadcn `Item` as the base list-item primitive in `ui/item.tsx`
- Refactor `PersonItem` and `TeamItem` to compose Shadcn `Item` primitives with two distinct item forms
- Co-locate skeleton exports within each item component file
- Relocate `LoadingCourt` into `custom/court/`
- Document `ui/` vs `custom/` boundary in `docs/architecture.md`

**Non-Goals:**

- Replacing `LoadingCard` usages with per-component skeletons (future change `loading-states`)
- Adding loading/submitting animation to Button (future change `loading-states`)
- Refactoring table-based player lists to use Item (future work)
- Full `docs/architecture.md` coverage — only component layer section in this change

## Decisions

### Shadcn Item as Base Primitive

Replace the custom `ListItem` compound component with the official Shadcn `Item` component installed via `npx shadcn@latest add item`. The Shadcn Item provides:

- `Item` — root container with `asChild` support via Radix `Slot`
- `ItemMedia` — leading visual slot (icon, image, avatar variants)
- `ItemContent` — text area (title, description)
- `ItemTitle` / `ItemDescription` — semantic text primitives
- `ItemActions` — trailing slot for actions or status indicators
- `ItemFooter` — below-content area for secondary actions

**Rationale**: Shadcn Item solves the nested interactive problem by design — `asChild` lets consumers control the root element, making navigable and static-with-actions forms naturally mutually exclusive. It also aligns with the project's existing Shadcn patterns (Button, Card, Badge).

### Two Item Forms

Items are categorized into two mutually exclusive forms based on whether the right side contains interactive elements:

| Form                    | Right side                                    | Clickable area                     | Root element                            | Footer                              |
| ----------------------- | --------------------------------------------- | ---------------------------------- | --------------------------------------- | ----------------------------------- |
| **Navigable**           | Status only (icons, badges — non-interactive) | Entire row                         | `Item asChild` → `<Link>` or `<button>` | Allowed (outside `asChild` wrapper) |
| **Static with actions** | `ItemActions` with interactive buttons        | None (row itself is not clickable) | `Item` (plain `<div>`)                  | Not applicable                      |

**Navigable form** — used when the item represents a navigation target:

```tsx
<Item asChild>
  <Link href="/team/123/players/456">
    <ItemMedia variant="icon">
      <FiUser />
    </ItemMedia>
    <ItemContent>
      <ItemTitle>Alice Chen</ItemTitle>
      <ItemDescription>#7 OH</ItemDescription>
    </ItemContent>
    <ItemActions>
      <Badge>先發</Badge>  {/* non-interactive status indicator */}
    </ItemActions>
  </Link>
</Item>
```

**Static with actions form** — used when the item has interactive controls on the right:

```tsx
<Item>
  <ItemMedia variant="icon">
    <RiGroupLine />
  </ItemMedia>
  <ItemContent>
    <ItemTitle>Thunder</ItemTitle>
  </ItemContent>
  <ItemActions>
    <Button variant="ghost" size="icon" onClick={handleEdit}>
      <FiSettings />
    </Button>
  </ItemActions>
</Item>
```

**Rationale**: This avoids nested interactive violations entirely. No `stopPropagation` hacks needed — if the row is navigable, actions are non-interactive; if actions are interactive, the row is static.

### Action Footer Pattern

For items that need both navigation AND action buttons (e.g., team invitation accept/reject), the action buttons are placed in a footer area **outside** the navigable `asChild` wrapper. This follows the Facebook notification pattern (image provided as reference):

```tsx
{/* Outer wrapper — visual grouping only */}
<div>
  <Item asChild>
    <Link href={`/team/${teamId}`}>
      <ItemMedia variant="icon">
        <RiGroupLine />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{teamName}</ItemTitle>
      </ItemContent>
    </Link>
  </Item>
  {/* Footer sits outside <Link>, no nested interactive */}
  <div className="flex gap-1 pl-12 pb-2">
    <Button onClick={handleAccept}>Accept</Button>
    <Button onClick={handleReject}>Reject</Button>
  </div>
</div>
```

The `pl-12` aligns the footer with the content area (past the media column). This pattern is encapsulated inside the `custom/` wrapper (e.g., `TeamItem` with a `footer` prop) so consumers don't need to manage the layout themselves.

**Rationale**: Places interactive buttons outside the navigable area entirely, eliminating nested interactive violations. The footer is a sibling to the link, not a child.

### PersonItem and TeamItem as Custom Wrappers

`PersonItem` and `TeamItem` remain in `custom/list-item/` as thin wrappers that compose Shadcn `Item` primitives. They provide domain-specific convenience:

- `PersonItem`: accepts `name`, `image`, `children` props; renders avatar/icon media, name title, metadata
- `TeamItem`: accepts `teamId`; uses `useTeam` hook internally; renders group icon media, team name title

Both accept `asChild` to let consumers control the root element for navigation. The `action` prop is removed — consumers use `ItemActions` or the footer pattern directly via composition.

### Skeleton Co-location

Each item component exports a named skeleton alongside its main export:

```tsx
// person-item.tsx
export function PersonItemSkeleton() {
  return (
    <Item>
      <ItemMedia variant="icon">
        <div className="h-4 w-4 rounded bg-muted animate-pulse" />
      </ItemMedia>
      <ItemContent>
        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
      </ItemContent>
    </Item>
  );
}
```

Two-column layout: `[(icon placeholder)(---text placeholder---)]`. Uses the same Item primitives so layout stays in sync.

### LoadingCourt Relocation

Move `custom/loading/court.tsx` content into `custom/court/index.tsx` as a named export `LoadingCourt`. The court file already exports a `LoadingCard` sub-component used by `LoadingCourt`, so co-locating eliminates the cross-directory dependency.

Update 2 consumers:

- `src/components/team/lineup/index.tsx`
- `src/components/record/index.tsx`

### File Organization

```text
src/components/ui/
├── item.tsx                   # Shadcn Item (installed via CLI)
└── ...

src/components/custom/
├── list-item/
│   ├── person-item.tsx        # PersonItem + PersonItemSkeleton (composes Shadcn Item)
│   ├── team-item.tsx          # TeamItem + TeamItemSkeleton (composes Shadcn Item)
│   └── __tests__/
│       ├── person-item.test.tsx
│       └── team-item.test.tsx
├── court/
│   ├── index.tsx              # Court (barrel export LoadingCourt)
│   └── loading.tsx            # LoadingCourt (re-exported in index.tsx)
├── loading/
│   └── card.tsx               # LoadingCard (kept until future change `loading-states`)
└── ...
```

### Component Relocations and Cleanup

Three `ui/` components violate the layer boundary rules documented below:

1. **Delete `ui/sheet.tsx`** — zero consumers in the codebase; unused Shadcn component
2. **Relocate `ui/panel.tsx` → `custom/panel/`** — only used in court-related pages (team/lineup, record/set-options, record/panel); contains domain-aware layout logic, not a generic primitive
3. **Relocate `ui/flip-words.tsx` → `landing/flip-words.tsx`** — only used in `landing/hero.tsx`; a single-domain animation component, not a reusable primitive

For panel relocation, update all 9 import paths:

- `src/components/team/lineup/panel/positions.tsx`
- `src/components/team/lineup/panel/player-info.tsx`
- `src/components/team/lineup/panel/substitutes.tsx`
- `src/components/team/lineup/panel/index.tsx`
- `src/components/team/lineup/panel/options/index.tsx`
- `src/components/record/set-options/panel/index.tsx`
- `src/components/record/set-options/panel/substitutes.tsx`
- `src/components/record/set-options/panel/options.tsx`
- `src/components/record/panel/index.tsx`

For flip-words relocation, update 1 import path:

- `src/components/landing/hero.tsx`

### Component Layer Boundary Documentation

Create `docs/architecture.md` with a component organization section:

| Layer       | Location                            | Domain Knowledge                               | Examples                          |
| ----------- | ----------------------------------- | ---------------------------------------------- | --------------------------------- |
| `ui/`       | `src/components/ui/`                | None — zero business logic                     | Button, Card, Badge, Dialog, Item |
| `custom/`   | `src/components/custom/`            | Allowed — Next.js Link, app hooks, data-testid | PersonItem, TeamItem, Court       |
| `{domain}/` | `src/components/{team,record,...}/` | Full domain context                            | LineupPanel, InvitationList       |

**Rule of thumb**: Could be published as a generic npm package → `ui/`. Reused across 2+ domain folders with app-specific behavior → `custom/`. Used in only one domain → `{domain}/`.

This document will be iteratively expanded by future changes per the config.yaml task rule.

## Risks / Trade-offs

- **[Risk] Shadcn Item is a newer component (2025-10)**: May have less community battle-testing → Mitigation: it follows the same Radix Slot + CVA pattern as other established Shadcn components; the source code is copied into the project and can be modified if needed.
- **[Risk] LoadingCard left in `custom/loading/`**: The directory isn't fully cleaned up → Mitigation: future change `loading-states` will systematically replace all LoadingCard consumers with co-located skeletons, then delete the directory.
- **[Risk] Skeleton drift**: Co-located skeletons may fall out of sync after visual changes → Mitigation: Skeletons compose the same Item primitives, so layout changes propagate automatically. Only placeholder dimensions (icon size, text width) could drift.
- **[Risk] Consumer migration**: Removing the `action` prop from PersonItem/TeamItem requires updating all consumers to use composition → Mitigation: only 4 consumers exist (invitations, user menu, players list, roster list), all identified and migration path documented.
