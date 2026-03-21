## Why

Multiple list-based UIs (team invitations, menu team list, player roster, match roster) each implement their own item layout with inconsistent visual styles. The invitations and menu components also display `player.name` instead of the actual team name, making them confusing for users. A unified set of list item components will standardize the visual language and fix the data display issues.

## What Changes

- Create `PersonItem` component — a generalized person list item with avatar, name, metadata slot, and action slot. Replaces the existing `ListItem` in team players list and `RosterTable` rows.
- Create `TeamItem` component — a team list item with the same visual structure as `PersonItem` but fetches team data internally via `useTeam(teamId)`. Replaces table rows in invitations and buttons in the menu team list.
- Refactor `Invitations` to use `TeamItem` in a flex list layout instead of `<Table>` structure.
- Refactor `Menu` team list to use `TeamItem`, displaying team name instead of player name.
- Refactor `PlayersList` to use `PersonItem` instead of `ListItem`.
- Rename `RosterTable` to `RosterList`, replacing `<Table>` structure with `PersonItem`.

## Capabilities

### New Capabilities

(none — this is a UI refactor using existing data and APIs)

### Modified Capabilities

(none — no spec-level behavior changes)

## Impact

- Affected code:
  - `src/components/custom/` — new `PersonItem` and `TeamItem` components
  - `src/components/user/invitations/index.tsx` — remove Table, use TeamItem
  - `src/components/user/menu/index.tsx` — replace Button with TeamItem, show team name
  - `src/components/team/players/list-item.tsx` — replaced by PersonItem
  - `src/components/team/players/list.tsx` — import change
  - `src/components/record/new/roster-table.tsx` — rename to roster-list, use PersonItem
  - `src/components/record/new/index.tsx` — import change
