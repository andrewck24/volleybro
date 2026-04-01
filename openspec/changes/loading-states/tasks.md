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

- [ ] 7.1 Create `HomeSkeleton` in `src/components/home/index.tsx` per Co-located Skeleton Pattern and LoadingCard Replacement Map, replace `LoadingCard` import
- [ ] [P] 7.2 Create `MatchesSkeleton` in `src/components/home/matches.tsx`, replace `LoadingCard` import
- [ ] 7.3 Delete `src/components/custom/loading/card.tsx` and `src/components/custom/loading/` directory
- [ ] 7.4 Verify: `npm test && npx tsc --noEmit && npm run lint && npm run build`

## 8. Final Verification and Documentation

- [ ] 8.1 Full verification: run `/simplify`, and verify `npm test && npx tsc --noEmit && npm run lint && npm run build`
- [ ] 8.2 Review whether `docs/`, `README.md`, `openspec/config.yaml`, and `CLAUDE.md` need updating based on this change
