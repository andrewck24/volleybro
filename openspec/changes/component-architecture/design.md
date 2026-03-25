## Context

`PersonItem` and `TeamItem` in `src/components/custom/` share ~80% identical code: avatar/icon slot, text + metadata area, action slot with `stopPropagation` event isolation, and a three-way wrapper pattern (Link → button → div). Both use the same Tailwind classes (`h-12 flex items-center gap-3 rounded-md px-3`). The only differences are the leading visual (avatar image vs group icon) and data source (props vs `useTeam` hook).

The `custom/loading/` directory holds `LoadingCourt` and `LoadingCard` as standalone skeleton files. `LoadingCourt` is tightly coupled to the court component and should be co-located. `LoadingCard` is a generic skeleton used by 9+ consumers across domains — it stays in place and will be replaced by per-component skeletons in a separate change (future change `loading-states`).

There is no documented boundary between `ui/` (Shadcn-level primitives, zero domain knowledge) and `custom/` (VolleyBro-specific shared components with domain awareness).

## Goals / Non-Goals

**Goals:**

- Extract a `ListItem` compound component set with CVA variants
- Refactor `PersonItem` and `TeamItem` to compose ListItem primitives
- Co-locate skeleton exports within each item component file
- Relocate `LoadingCourt` into `custom/court/`
- Document `ui/` vs `custom/` boundary in `docs/architecture.md`

**Non-Goals:**

- Replacing `LoadingCard` usages with per-component skeletons (future change `loading-states`)
- Adding loading/submitting animation to Button (future change `loading-states`)
- Refactoring table-based player lists to use ListItem (future work)
- Full `docs/architecture.md` coverage — only component layer section in this change

## Decisions

### ListItem Compound Component Design

Follow the Shadcn compound component pattern (like `Card` / `CardHeader` / `CardContent`). ListItem is a set of composable primitives, not a single prop-driven component:

```tsx
// Compound primitives
ListItem          // Root wrapper — handles Link/button/div rendering + CVA variants
ListItemIcon      // Leading icon slot (fixed-size circle container)
ListItemImage     // Leading image slot (avatar with Next.js Image)
ListItemContent   // Text area — title, metadata, badges
ListItemAction    // Trailing action slot with stopPropagation event isolation
```

Usage by consumers:

```tsx
// PersonItem composes ListItem primitives
<ListItem href={href} onClick={onClick} variant="default">
  {image ? (
    <ListItemImage src={image} alt={name} />
  ) : (
    <ListItemIcon><FiUser /></ListItemIcon>
  )}
  <ListItemContent>
    <span className="truncate font-medium">{name}</span>
    {children}
  </ListItemContent>
  {action && <ListItemAction>{action}</ListItemAction>}
</ListItem>
```

**Rationale**: Compound components give consumers full control over composition. Each primitive is independently importable and styleable. This matches how `Card`, `Button`, and other Shadcn components work in this project.

### ListItem CVA Variants

Use `class-variance-authority` for visual variants on the root `ListItem`, following the same pattern as `Button`:

```tsx
const listItemVariants = cva(
  "flex w-full items-center gap-3 rounded-md px-3", // base
  {
    variants: {
      variant: {
        default: "",
        secondary: "bg-secondary/50",
        ghost: "",
      },
      size: {
        default: "h-12",
        sm: "h-10",
        lg: "h-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

Interactive variants (Link/button) automatically add `hover:bg-accent`. Static variant (div) gets no hover.

**Rationale**: CVA keeps variant logic declarative and type-safe. Starting with minimal variants — expand as needed.

### Three-Way Wrapper Pattern

`ListItem` root handles the wrapper logic internally based on props:

| Props provided | Renders as | Hover style |
|---|---|---|
| `href` | `<Link>` | `hover:bg-accent` |
| `onClick` (no href) | `<button>` | `hover:bg-accent` |
| neither | `<div>` | none |

This is the same priority logic currently in `PersonItem` and `TeamItem`, centralized once.

### ListItemAction Event Isolation

`ListItemAction` wraps children with `stopPropagation` on `onClick` and `onKeyDown`, with `role="presentation"`. This prevents action button clicks from triggering the parent Link/button navigation — the same pattern currently duplicated in both item components.

### Skeleton Co-location

Each item component exports a named skeleton alongside its main export:

```tsx
// person-item.tsx
export function PersonItemSkeleton() {
  return (
    <ListItem>
      <ListItemIcon>
        <div className="h-4 w-4 rounded bg-muted animate-pulse" />
      </ListItemIcon>
      <ListItemContent>
        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
      </ListItemContent>
    </ListItem>
  );
}
```

Two-column layout: `[(icon placeholder)(---text placeholder---)]`. Uses the same ListItem primitives so layout stays in sync.

### LoadingCourt Relocation

Move `custom/loading/court.tsx` content into `custom/court/index.tsx` as a named export `LoadingCourt`. The court file already exports a `LoadingCard` sub-component used by `LoadingCourt`, so co-locating eliminates the cross-directory dependency.

Update 2 consumers:
- `src/components/team/lineup/index.tsx`
- `src/components/record/index.tsx`

### File Organization

```
src/components/custom/
├── list-item/
│   ├── index.tsx              # ListItem, ListItemIcon, ListItemImage,
│   │                          # ListItemContent, ListItemAction + listItemVariants
│   ├── person-item.tsx        # PersonItem + PersonItemSkeleton (composes ListItem)
│   ├── team-item.tsx          # TeamItem + TeamItemSkeleton (composes ListItem)
│   └── __tests__/
│       └── list-item.test.tsx
├── court/
│   ├── index.tsx              # Court (barrel export LoadingCourt)
│   └── loading.tsx            # LoadingCourt (re-exported in index.tsx)
├── loading/
│   └── card.tsx               # LoadingCard (kept until future change `loading-states`)
└── ...
```

### Component Layer Boundary Documentation

Create `docs/architecture.md` with a component organization section:

| Layer | Location | Domain Knowledge | Examples |
|-------|----------|-----------------|----------|
| `ui/` | `src/components/ui/` | None — zero business logic | Button, Card, Badge, Dialog |
| `custom/` | `src/components/custom/` | Allowed — Next.js Link, app hooks, data-testid | ListItem, PersonItem, TeamItem, Court |
| `{domain}/` | `src/components/{team,record,...}/` | Full domain context | LineupPanel, InvitationList |

**Rule of thumb**: Could be published as a generic npm package → `ui/`. Reused across 2+ domain folders with app-specific behavior → `custom/`. Used in only one domain → `{domain}/`.

This document will be iteratively expanded by future changes per the config.yaml task rule.

## Risks / Trade-offs

- **[Risk] LoadingCard left in `custom/loading/`**: The directory isn't fully cleaned up → Mitigation: future change `loading-states` will systematically replace all LoadingCard consumers with co-located skeletons, then delete the directory.
- **[Risk] Skeleton drift**: Co-located skeletons may fall out of sync after visual changes → Mitigation: Skeletons compose the same ListItem primitives, so layout changes propagate automatically. Only placeholder dimensions (icon size, text width) could drift.