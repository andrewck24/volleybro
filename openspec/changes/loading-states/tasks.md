## 1. Button Loading Props (Presentation Layer)

- [x] 1.1 Write tests for Button `loading` and `loadingText` props behavior (TDD)
- [x] 1.2 Extend `src/components/ui/button.tsx` with Button Loading Props: add `loading?: boolean` and `loadingText?: string` per design, using `RiLoader4Line` spinner; ignore `loading` when `asChild` is true
- [x] 1.3 Verify: `npm test && npx tsc --noEmit && npm run lint && npm run build`

## 2. Submitting State Fixes — Auth & User (Presentation Layer)

- [x] 2.1 Write tests for sign-in and user invitations Submitting State Fix Pattern (TDD)
- [x] [P] 2.2 Fix `src/components/auth/sign-in/form.tsx`: add `isSubmitting` state and `loading` prop to Google OAuth button
- [x] [P] 2.3 Fix `src/components/user/invitations/index.tsx`: add `processingId` state for accept/reject buttons with `loading`/`disabled` props
- [x] 2.4 Verify: `npm test && npx tsc --noEmit && npm run lint && npm run build`

## 3. Submitting State Fixes — Record (Presentation Layer)

- [x] 3.1 Write tests for record panel Submitting State Fix Pattern (TDD)
- [x] 3.2 Fix `src/components/record/set-options/panel/options.tsx`: add `isSubmitting` state and `loading` prop
- [x] 3.3 Verify: `npm test && npx tsc --noEmit && npm run lint && npm run build`

## 4. Submitting State Fixes — Team (Presentation Layer)

- [x] 4.1 Write tests for membership Submitting State Fix Pattern (TDD)
- [x] [P] 4.2 Fix `src/components/team/players/membership-section.tsx` remove action: add `isRemoving` state and `loading` prop
- [x] [P] 4.3 Fix `src/components/team/players/membership-section.tsx` transfer action: add `isTransferring` state and `loading` prop
- [x] 4.4 Verify: `npm test && npx tsc --noEmit && npm run lint && npm run build`

## 5. Co-located Skeleton Pattern — Team Components (Presentation Layer)

- [x] 5.1 Create `LineupSkeleton` in `src/components/team/lineup/index.tsx` per Co-located Skeleton Pattern and LoadingCard Replacement Map, replace `LoadingCard` import
- [x] [P] 5.2 Create `PlayersListSkeleton` in `src/components/team/players/list.tsx`, replace `LoadingCard` import
- [x] [P] 5.3 Create `PlayerInfoSkeleton` in `src/components/team/players/info.tsx`, replace `LoadingCard` import
- [x] [P] 5.4 Create `PlayerEditFormSkeleton` in `src/components/team/players/edit-form.tsx`, replace `LoadingCard` import
- [x] [P] 5.5 Create `TeamInfoSkeleton` in `src/components/team/info/index.tsx`, replace `LoadingCard` import
- [x] 5.6 Verify: `npm test && npx tsc --noEmit && npm run lint && npm run build`

## 6. Co-located Skeleton Pattern — Record & Match Components (Presentation Layer)

- [x] 6.1 Create `RecordSkeleton` in `src/components/record/index.tsx` per Co-located Skeleton Pattern and LoadingCard Replacement Map, replace `LoadingCard` import
- [x] [P] 6.2 Create `MatchSetsSkeleton` in `src/components/match/sets/index.tsx`, replace `LoadingCard` import
- [x] [P] 6.3 Create `MatchSkeleton` in `src/components/match/index.tsx`, replace `LoadingCard` import
- [x] 6.4 Verify: `npm test && npx tsc --noEmit && npm run lint && npm run build`

## 7. Co-located Skeleton Pattern — Home Components and Cleanup (Presentation Layer)

- [x] 7.1 Create `HomeSkeleton` in `src/components/home/index.tsx` per Co-located Skeleton Pattern and LoadingCard Replacement Map, replace `LoadingCard` import
- [x] [P] 7.2 Create `MatchesSkeleton` in `src/components/home/matches.tsx`, replace `LoadingCard` import
- [x] 7.3 Delete `src/components/custom/loading/card.tsx` and `src/components/custom/loading/` directory
- [x] 7.4 Verify: `npm test && npx tsc --noEmit && npm run lint && npm run build`

## 8. Structural Fidelity Rework — Foundations (Presentation Layer)

- [x] 8.1 Add `src/components/ui/empty.tsx` Empty State Primitive: `Empty`, `EmptyHeader`, `EmptyMedia` (icon/default variants), `EmptyTitle`, `EmptyDescription`, `EmptyContent`
- [x] 8.2 useActiveTeamId API Refactor: change `src/hooks/use-data.ts` return type to `{ teamId, isLoading, error, mutate }` instead of bare ID; update all callers (`src/components/layout/nav/links.tsx`, `src/components/home/index.tsx`)
- [x] 8.3 Verify: `npm test && npx tsc --noEmit && npm run lint && npm run build`

## 9. Structural Fidelity Rework — Item Refactor and Empty States (Presentation Layer)

- [x] [P] 9.1 Item Refactor — PlayerInfo and TeamInfo (part 1): refactor `src/components/team/players/info.tsx` `PlayerDetails` info rows from raw divs to `Item`/`ItemContent` slots; apply Not-Found → Empty Pattern: replace "找不到球員" raw text with `Empty` component
- [x] [P] 9.2 Not-Found → Empty Pattern in `src/components/team/players/edit-form.tsx`: replace "找不到球員" raw text with `Empty` component
- [x] [P] 9.3 Item Refactor — TeamInfo: refactor `src/components/team/info/index.tsx` `TeamInfo` info rows from raw divs to `Item`/`ItemContent` slots
- [x] 9.4 Verify: `npm test && npx tsc --noEmit && npm run lint && npm run build`

## 10. Structural Fidelity Rework — Skeleton Rework (Presentation Layer)

- [x] [P] 10.1 Rework `PlayerInfoSkeleton` in `src/components/team/players/info.tsx`: mirror `PlayerDetails` `Item`/`ItemContent` slot structure per Structural Fidelity Standard; apply `my-*` to text-mirroring `Skeleton` elements
- [x] [P] 10.2 Rework `TeamInfoSkeleton` in `src/components/team/info/index.tsx`: mirror `TeamInfo` `Item`/`ItemContent` slot structure per Structural Fidelity Standard; apply `my-*` to text-mirroring `Skeleton` elements
- [x] [P] 10.3 Rework `PlayerEditFormSkeleton` in `src/components/team/players/edit-form.tsx`: add `<form>` wrapper, use `Label`-matching `Skeleton` rows, apply `my-*` to text-mirroring elements per Structural Fidelity Standard
- [x] [P] 10.4 Rework `LineupSkeleton` in `src/components/team/lineup/index.tsx`: replace panel raw div with slot-mirroring structure per Structural Fidelity Standard; apply `my-*` to text-mirroring `Skeleton` elements
- [x] [P] 10.5 Rework `RecordSkeleton` in `src/components/record/index.tsx`: replace generic preview/panel blocks with slot-mirroring structures for `RecordPreview` and `RecordPanel` per Structural Fidelity Standard; apply `my-*` to text-mirroring elements
- [x] [P] 10.6 Rework `MatchSetsSkeleton` in `src/components/match/sets/index.tsx`: replace inner raw divs with slot-mirroring structures per Structural Fidelity Standard; apply `my-*` to text-mirroring elements
- [x] [P] 10.7 Rework `MatchSkeleton` in `src/components/match/index.tsx`: replace raw div header and generic Card blocks with slot-mirroring structures per Structural Fidelity Standard; apply `my-*` to text-mirroring elements
- [x] 10.8 Verify: `npm test && npx tsc --noEmit && npm run lint && npm run build`

## 11. Home Matches Refactor (Presentation Layer)

- [x] 11.1 Refactor `src/components/home/matches.tsx`: `TeamMatches` → self-contained `Matches` (own team ID resolution via `useActiveTeamId`, error state via `ServerErrorState`, empty state via `GuidesForNewUser`/`NoMatches`)
- [x] 11.2 Rework `MatchesSkeleton` and `MatchSkeleton` per Structural Fidelity Standard (reference implementation): `MatchSkeleton` uses `Item`/`ItemHeader`/`ItemContent`/`ItemFooter`; per-content `Skeleton` with `my-*` for text elements; `MatchesSkeleton` wraps in `ItemGroup`
- [x] 11.3 Remove `MatchResult` from `src/components/record/match.tsx` (moved inline to `home/matches.tsx`)
- [x] 11.4 Simplify `src/components/home/index.tsx` to single-line wrapper
- [x] 11.5 Verify: `npm test && npx tsc --noEmit && npm run lint && npm run build`

## 12. Final Verification and Documentation

- [ ] 12.1 Full verification: run `/simplify`, and verify `npm test && npx tsc --noEmit && npm run lint && npm run build`
- [ ] 12.2 Review whether `docs/`, `README.md`, `openspec/config.yaml`, and `CLAUDE.md` need updating based on this change
