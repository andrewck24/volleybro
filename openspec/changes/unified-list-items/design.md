## Context

The app has multiple list-based UIs that display people or teams, each with its own ad-hoc layout:

- **Team Players List** (`team/players/list-item.tsx`): Uses a `<Link>` button with avatar circle + name + number + position. Clean but not reusable outside the players context.
- **Invitations** (`user/invitations/index.tsx`): Uses `<Table>` with `<TableRow>` per invitation. Displays `player.name` instead of team name — semantically wrong (user sees their own name, not the team they're invited to). Action buttons (accept/reject) are bare `<TableCell>` with click handlers.
- **Menu Team List** (`user/menu/index.tsx`): Uses `<Button size="wide">` per team. Also displays `p.name` (player name) instead of team name.
- **Match Roster** (`record/new/roster-table.tsx`): Uses `<Table>` with header row. Displays number, name, and a role badge (先發/自由).

## Goals / Non-Goals

**Goals:**

- Create `PersonItem` and `TeamItem` components with unified visual structure (avatar + name + metadata + action area)
- Fix invitations and menu to display team name (fetched via `useTeam(teamId)`) instead of player name
- Remove `<Table>` usage from invitations and roster where table semantics are inappropriate
- Maintain each component's specific interaction behavior (navigation, accept/reject, team switching)

**Non-Goals:**

- Shared abstract base component — PersonItem and TeamItem are visually similar but independent components
- Changing data fetching strategy — keep SWR with per-component `useTeam()` calls
- Modifying any API endpoints or backend logic
- Adding new features beyond the visual unification

## Decisions

### PersonItem component structure

PersonItem lives at `src/components/custom/person-item.tsx`. It accepts:

- `name: string` — displayed as primary text, truncated
- `image?: string` — avatar image URL; falls back to `FiUser` icon when absent
- `href?: string` — when provided, root element renders as `<Link>` (Next.js navigation)
- `onClick?: () => void` — when provided (and no `href`), root element renders as `<button>`
- `children?: ReactNode` — metadata area (right of name), for context-specific content like `#7 OH`
- `action?: ReactNode` — rightmost slot for buttons, badges, or other interactive elements

Navigation behavior follows an `asChild`-like pattern:
- `href` present → root is `<Link>`, styled like existing `list-item.tsx`
- `onClick` present → root is `<button>`
- Neither → root is `<div>` (static display)

When the root is interactive (`<Link>` or `<button>`), the `action` slot uses `e.stopPropagation()` and `pointer-events` isolation so nested buttons don't trigger the parent's navigation/click.

The component renders a horizontal flex container matching the existing `list-item.tsx` visual: `h-12`, avatar circle (h-9 w-9), truncated name, then optional metadata and action.

### TeamItem component structure

TeamItem lives at `src/components/custom/team-item.tsx`. It accepts:

- `teamId: string` — used to fetch team data via `useTeam(teamId)`
- `href?: string` — same navigation pattern as PersonItem
- `onClick?: () => void` — same navigation pattern as PersonItem
- `children?: ReactNode` — metadata area
- `action?: ReactNode` — rightmost slot

Internally calls `useTeam(teamId)` to resolve team name. Renders with the same visual structure as PersonItem but uses `RiGroupLine` as the default icon. Shows a skeleton/placeholder while loading.

### Invitations refactor to flex list

Replace `<Table>/<TableBody>/<TableRow>/<TableCell>` with a simple `<div className="flex flex-col">` containing `TeamItem` instances. Each TeamItem uses `href={/team/${teamId}}` for navigation. The `action` slot holds accept (check) and reject (close) icon buttons with `e.stopPropagation()` to prevent navigation when clicking actions. Per-invitation error messages render as a `<p>` below the TeamItem.

### Menu team list refactor

Replace `<Button size="wide">` items with `TeamItem`. Pass `onClick` for team switching. The active team gets a visual distinction (e.g., background highlight via className).

### RosterTable → RosterList

Rename file to `roster-list.tsx`. Replace `<Table>` structure with a flex column of PersonItem instances (no `href` or `onClick` — static display). The jersey number goes in `children` (metadata), and the `ListBadge` (先發/自由) goes in `action` slot. Remove the table header row — the PersonItem layout makes column headers unnecessary.

## Risks / Trade-offs

- [N+1 requests in TeamItem] Each TeamItem calls `useTeam(teamId)` independently → N requests for N teams. Mitigated by: SWR dedup (same teamId shares cache), and N is small (typical user has 1-3 teams, 0-5 invitations). Acceptable for current scale.
- [Nested interactive elements] When root is `<Link>` and action slot has buttons, need careful event handling (`stopPropagation`) to avoid navigation on action clicks. Well-established pattern in modern UI libraries.
- [Visual regression] Replacing Table layout with flex may shift spacing/alignment → verify each refactored component visually after implementation.
