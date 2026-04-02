## Why

Users receive no visual feedback during form submissions and async actions across multiple components, leading to potential double-submits and a degraded UX. Additionally, 10 components use a generic `LoadingCard` skeleton that provides no context-specific loading indication. The Button component has no built-in loading prop, forcing each consumer to independently manage disabled state and loading text.

## What Changes

- Extend the existing Shadcn `Button` component with `loading?: boolean` and `loadingText?: string` props for standardized submission feedback
- Fix 5 submitting-state gaps: sign-in (Google OAuth button), user invitations (accept/reject), record set-options, membership remove, membership transfer-ownership; record substitutes, opponent moves, and match info form are excluded as they use optimistic updates or pure local state
- Replace all 10 `LoadingCard` consumers with per-component co-located skeletons that mirror each component's structural layout using the same slot components (e.g., `Item`/`ItemHeader`/`ItemContent`/`ItemFooter`, `Card`/`CardHeader`) — not generic blocks
- Delete `src/components/custom/loading/` directory entirely (both `card.tsx` and directory)
- Refactor `useActiveTeamId` to return `{ teamId, isLoading, error, mutate }` instead of a bare ID, enabling self-contained data-fetching in consuming components
- Add `src/components/ui/empty.tsx` — `Empty` UI primitive with `EmptyHeader`, `EmptyMedia`, `EmptyTitle`, `EmptyDescription`, `EmptyContent` slot components for consistent empty states
- Refactor `home/matches.tsx` `Matches` component to be self-contained (owns team ID resolution, error/loading states, empty state), making `home/index.tsx` a thin wrapper
- Refactor `team/players/info.tsx` (`PlayerDetails`) and `team/info/index.tsx` (`TeamInfo`) info rows to use `Item`/`ItemContent` slot components, enabling structurally-faithful skeletons
- Replace "找不到 ${資源}" raw text fallbacks in `team/players/info.tsx` and `team/players/edit-form.tsx` with `Empty` component

## Capabilities

### New Capabilities

(none — this is a UX improvement with no new business capabilities)

### Modified Capabilities

(none)

## Impact

- Affected code:
  - `src/components/ui/button.tsx` (add `loading`/`loadingText` props)
  - `src/components/ui/empty.tsx` (new: Empty UI primitive)
  - `src/components/auth/sign-in/form.tsx` (add submitting state)
  - `src/components/user/invitations/index.tsx` (add processing state for accept/reject)
  - `src/components/record/set-options/panel/options.tsx` (add submitting state)
  - `src/components/team/players/membership-section.tsx` (add loading states for remove/transfer)
  - `src/components/team/lineup/index.tsx` (replace LoadingCard with structurally-faithful skeleton)
  - `src/components/team/players/list.tsx` (replace LoadingCard)
  - `src/components/team/players/info.tsx` (replace LoadingCard; refactor info rows to Item; replace not-found text with Empty)
  - `src/components/team/players/edit-form.tsx` (replace LoadingCard; replace not-found text with Empty)
  - `src/components/team/info/index.tsx` (replace LoadingCard; refactor info rows to Item)
  - `src/components/record/index.tsx` (replace LoadingCard)
  - `src/components/match/sets/index.tsx` (replace LoadingCard)
  - `src/components/match/index.tsx` (replace LoadingCard)
  - `src/components/home/index.tsx` (thinned to a single-line wrapper)
  - `src/components/home/matches.tsx` (self-contained `Matches`, structurally-faithful `MatchSkeleton` — reference implementation)
  - `src/components/record/match.tsx` (removed `MatchResult` component, moved to `home/matches.tsx`)
  - `src/hooks/use-data.ts` (`useActiveTeamId` returns `{ teamId, isLoading, error, mutate }`)
  - `src/components/layout/nav/links.tsx` (destructure `useActiveTeamId` result)
  - `src/components/custom/loading/` (delete directory)
- Dependencies: `component-architecture` (ListItem skeletons defined there; `custom/loading/court.tsx` already relocated)
