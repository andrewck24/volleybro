## 1. Hook implementation

- [x] 1.1 Create `src/hooks/use-pull-to-refresh.ts` skeleton: accept `(ref, onRefresh, options?)` with `threshold`, `maxPull`, `resistance`, `pwaOnly` options; bind touch listeners to the passed ref element (not `window`)
- [x] 1.2 Implement PWA-only gating via `matchMedia("(display-mode: standalone)")` plus iOS `navigator.standalone`: hook activates only in PWA standalone mode; non-standalone returns zero-state and registers no listeners
- [x] 1.3 Implement lazy attach `touchmove` / `touchend` only after `touchstart`: register `touchstart` at mount; register `touchmove`/`touchend`/`touchcancel` inside `touchstart` and remove them on end/cancel
- [x] 1.4 Implement exponential damping for over-pull (`appr` function): apply `appr(dy) = MAX * (1 - exp(-k * dy / MAX))` to `dy` before setting `transform`; ignore upward (negative) `dy`; expose `MAX`/`k` via `maxPull`/`resistance` options (pull motion uses exponential damping)
- [x] 1.5 Implement React state observation so the hook returns `{ isPulling, isRefreshing, pullDistance, progress }` as React state with `progress` clamped to `[0, 1]` (hook returns observable React state)
- [x] 1.6 Implement refresh callback fires when threshold is crossed at release: invoke `onRefresh` exactly once on `touchend` when damped distance >= threshold; set `isRefreshing` true while awaiting; ignore concurrent gestures while refreshing
- [x] 1.7 Apply CSS transition only on release, remove on `transitionend`: add inline `transition: transform 0.2s ease-out` on `touchend`, attach a one-shot `transitionend` listener to clear it; ensure no transition during active pulling (snap-back animation uses transient CSS transition)
- [x] 1.8 Add JSDoc documenting the hook contract, including: hook owns `transform` on the ref element (consumers must not set it), hook activates only in PWA standalone mode, and the listener-scope guarantee (hook binds touch listeners to the passed ref element)

## 2. Indicator component

- [x] 2.1 [P] Create `src/components/layout/pull-refresh-indicator.tsx`: accept the hook's returned state object; render `MdOutlineSportsVolleyball` from `react-icons/md`; absolutely positioned at top of parent so it does not move when content is translated
- [x] 2.2 [P] Implement indicator visual: volleyball icon with rotate + scale during pull, spin + bounce during refresh — interpolate `opacity 0→1`, `scale 0.6→1.0`, `rotate 0deg→180deg` against `progress`; layer `animate-spin` plus a custom `animate-volleyball-bounce` keyframe (`translateY(0 ↔ -3px)`) when `isRefreshing` is true (PullRefreshIndicator component renders gesture and refresh visuals)
- [x] 2.3 [P] Add `@keyframes volleyball-bounce` and `animate-volleyball-bounce` utility to `src/app/globals.css`
- [x] 2.4 [P] Add CSS guard to indicator: `@media not all and (display-mode: standalone) { display: none }` so the indicator never appears in non-PWA contexts

## 3. Consumer migration

- [x] 3.1 Update `src/components/home/game-history.tsx`: import the new hook from `src/hooks/use-pull-to-refresh.ts`; create container ref; pass ref + `mutate`; render `<PullRefreshIndicator />` per per-tab indicator ownership instead of `TabContainer`-level
- [x] 3.2 Update `src/components/team/index.tsx`: import the new hook; create container ref; pass ref + `mutate`; render `<PullRefreshIndicator />` per per-tab indicator ownership instead of `TabContainer`-level

## 4. Legacy removal

- [ ] 4.1 Delete `src/lib/hooks/usePullToRefresh.ts` (legacy hook and global-slice are removed)
- [ ] 4.2 Delete `src/lib/features/global-slice.ts` and remove the `globalReducer` import + registration from `src/lib/redux/store.ts` (legacy hook and global-slice are removed)
- [ ] 4.3 Delete `src/components/layout/main.tsx` (orphaned by the persistent-tab-navigation change; legacy hook and global-slice are removed)
- [ ] 4.4 Run `pnpm typecheck` to verify no remaining imports of removed files

## 5. Verification

- [ ] 5.1 Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `simplify` and confirm all pass
- [ ] 5.2 Manually verify in PWA standalone mode (iOS Safari add-to-home-screen + Android Chrome PWA): pull down on `home` and `team` tabs, indicator appears with damped motion, refresh fires on threshold crossed release, snap-back is smooth
- [ ] 5.3 Manually verify in regular mobile browser (Safari/Chrome, not standalone): hook is inactive, native browser pull-to-refresh works as expected, no custom indicator appears
- [ ] 5.4 Manually verify under `TabContainer`: pulling on the active tab does not affect hidden tabs; switching tabs and pulling on the new tab triggers only that tab's refresh
