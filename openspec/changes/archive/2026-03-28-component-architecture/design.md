## Context

The project originally introduced `PersonItem` and `TeamItem` wrappers to unify list-row visuals. After implementation review, those wrappers proved too black-box for the actual usage patterns: consumers still needed to reason about layout variants, and the abstraction hid simple Shadcn composition behind extra files and tests.

The deeper issue was never "missing wrappers", but rather choosing the right primitive boundary. Shadcn `Item` already provides the correct base structure. What consumers need is direct access to that structure, plus a very small amount of shared boilerplate where it is truly domain-agnostic.

Shadcn/UI recently introduced an `Item` compound component (2025-10) that fits this need well: consumers choose the root element with `asChild`, and domain components own their data-fetching, loading, and action semantics.

The `custom/loading/` directory holds `LoadingCourt` and `LoadingCard` as standalone skeleton files. `LoadingCourt` is tightly coupled to the court component and should be co-located. `LoadingCard` is a generic skeleton used by 9+ consumers across domains — it stays in place and will be replaced by per-component skeletons in a separate change (future change `loading-states`).

There is no documented boundary between `ui/` (Shadcn-level primitives, zero domain knowledge) and `custom/` (VolleyBro-specific shared components with domain awareness).

## Goals / Non-Goals

**Goals:**

- Install Shadcn `Item` as the base list-item primitive in `ui/item.tsx`
- Let consumers compose `Item` primitives directly instead of routing through thin wrappers
- Add only the smallest domain-agnostic helper surface to `ui/item.tsx` where repetition is mechanical (`ItemAvatar`)
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

**Rationale**: Shadcn Item gives the project a single row-layout vocabulary without introducing another app-specific abstraction layer. It aligns with existing Shadcn patterns and keeps composition visible at the call site.

### Direct Consumer Composition

Consumers compose rows directly from `Item` primitives. The wrappers `PersonItem` and `TeamItem` are removed.

**Player rows** use direct composition with `ItemAvatar` for the only repeated generic piece:

```tsx
<Item asChild>
  <Link href={`/team/${teamId}/players/${player._id}`}>
    <ItemMedia variant="image">
      <ItemAvatar alt={player.name} fallback={<FiUser />} />
    </ItemMedia>
    <ItemContent>
      <ItemTitle>{player.name}</ItemTitle>
      <ItemDescription>{player.number != null && `#${player.number}`}</ItemDescription>
    </ItemContent>
  </Link>
</Item>
```

**Team rows** stay local to the consuming domain component because they own `useTeam(teamId)` and loading state:

```tsx
<Item asChild>
  <Button onClick={() => onClick(teamId)}>
    <ItemMedia variant="icon">
      <RiGroupLine />
    </ItemMedia>
    <ItemContent>
      <ItemTitle>
        {isLoading ? <Skeleton className="h-4 w-24" /> : team?.name}
      </ItemTitle>
    </ItemContent>
  </Button>
</Item>
```

**Rationale**: This keeps imports centralized around `ui/item` while avoiding black-box wrappers. Data-fetching and loading remain where the data is consumed, which makes behavior easier to understand and change.

### Invitation Overlay Pattern

Invitations need the entire item to navigate, except for accept/reject buttons. The final pattern keeps a link covering the row while placing the action buttons above it in stacking order:

```tsx
<Item className="relative items-start hover:bg-accent/50">
  <Link
    href={`/team/${teamId}`}
    className="absolute inset-0 z-0"
    aria-label="前往隊伍"
  />
  <ItemMedia variant="icon">
    <RiGroupLine />
  </ItemMedia>
  <ItemContent>
    <ItemTitle>Thunder</ItemTitle>
    <ItemFooter className="relative z-10 w-fit">
      <Button onClick={handleAccept}>Accept</Button>
      <Button onClick={handleReject}>Reject</Button>
    </ItemFooter>
  </ItemContent>
</Item>
```

**Rationale**: This preserves "whole row is a link except buttons" behavior while still satisfying axe, because the buttons are not descendants of the link element.

### LoadingCourt Relocation

Move `custom/loading/court.tsx` content into `custom/court/index.tsx` as a named export `LoadingCourt`. The court file already exports a `LoadingCard` sub-component used by `LoadingCourt`, so co-locating eliminates the cross-directory dependency.

Update 2 consumers:

- `src/components/team/lineup/index.tsx`
- `src/components/record/index.tsx`

### File Organization

```text
src/components/ui/
├── avatar.tsx                 # Shared avatar primitive
├── item.tsx                   # Shadcn Item + tiny shared helpers such as ItemAvatar
└── ...

src/components/custom/
├── court/
│   ├── index.tsx              # Court (barrel export LoadingCourt)
│   └── loading.tsx            # LoadingCourt (re-exported in index.tsx)
├── loading/
│   └── card.tsx               # LoadingCard (kept until future change `loading-states`)
└── ...

src/stories/
├── item.stories.tsx           # Item primitive composition examples, including invitations
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
| `custom/`   | `src/components/custom/`            | Allowed — Next.js Link, app hooks, data-testid | Court                             |
| `{domain}/` | `src/components/{team,record,...}/` | Full domain context                            | LineupPanel, InvitationList       |

**Rule of thumb**: Could be published as a generic npm package → `ui/`. Reused across 2+ domain folders with app-specific behavior → `custom/`. Used in only one domain → `{domain}/`.

This document will be iteratively expanded by future changes per the config.yaml task rule.

## Risks / Trade-offs

- **[Risk] Shadcn Item is a newer component (2025-10)**: May have less community battle-testing → Mitigation: it follows the same Radix Slot + CVA pattern as other established Shadcn components; the source code is copied into the project and can be modified if needed.
- **[Risk] LoadingCard left in `custom/loading/`**: The directory isn't fully cleaned up → Mitigation: future change `loading-states` will systematically replace all LoadingCard consumers with co-located skeletons, then delete the directory.
- **[Risk] Repeated consumer code**: Direct composition repeats some markup for avatar fallback and team loading → Mitigation: only generic repetition (`ItemAvatar`) is centralized; data-fetching and action layout stay local to improve readability.
- **[Risk] Overlay-link invitation pattern**: The clickable layer relies on stacking order → Mitigation: Storybook now documents this exact composition, and buttons explicitly sit above the link layer via `z-index`.
