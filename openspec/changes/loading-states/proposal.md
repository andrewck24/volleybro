## Why

Users receive no visual feedback during form submissions and async actions across multiple components, leading to potential double-submits and a degraded UX. Additionally, 10 components use a generic `LoadingCard` skeleton that provides no context-specific loading indication. The Button component has no built-in loading prop, forcing each consumer to independently manage disabled state and loading text.

## What Changes

- Extend the existing Shadcn `Button` component with `loading?: boolean` and `loadingText?: string` props for standardized submission feedback
- Fix 5 submitting-state gaps: sign-in (Google OAuth button), user invitations (accept/reject), record set-options, membership remove, membership transfer-ownership; record substitutes, opponent moves, and match info form are excluded as they use optimistic updates or pure local state
- Replace all 10 `LoadingCard` consumers with per-component co-located skeletons that match each component's actual layout
- Delete `src/components/custom/loading/` directory entirely (both `card.tsx` and directory)

## Capabilities

### New Capabilities

(none — this is a UX improvement with no new business capabilities)

### Modified Capabilities

(none)

## Impact

- Affected code:
  - `src/components/ui/button.tsx` (add `loading`/`loadingText` props)
  - `src/components/auth/sign-in/form.tsx` (add submitting state)
  - `src/components/user/invitations/index.tsx` (add processing state for accept/reject)
  - `src/components/record/set-options/panel/options.tsx` (add submitting state)
  - `src/components/team/players/membership-section.tsx` (add loading states for remove/transfer)
  - `src/components/team/lineup/index.tsx` (replace LoadingCard with co-located skeleton)
  - `src/components/team/players/list.tsx` (replace LoadingCard)
  - `src/components/team/players/info.tsx` (replace LoadingCard)
  - `src/components/team/players/edit-form.tsx` (replace LoadingCard)
  - `src/components/team/info/index.tsx` (replace LoadingCard)
  - `src/components/record/index.tsx` (replace LoadingCard)
  - `src/components/match/sets/index.tsx` (replace LoadingCard)
  - `src/components/match/index.tsx` (replace LoadingCard)
  - `src/components/home/index.tsx` (replace LoadingCard)
  - `src/components/home/matches.tsx` (replace LoadingCard)
  - `src/components/custom/loading/` (delete directory)
- Dependencies: `component-architecture` (ListItem skeletons defined there; `custom/loading/court.tsx` already relocated)
