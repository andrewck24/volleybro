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

- [x] 4.1 Delete `src/lib/hooks/usePullToRefresh.ts` (legacy hook and global-slice are removed)
- [x] 4.2 Delete `src/lib/features/global-slice.ts` and remove the `globalReducer` import + registration from `src/lib/redux/store.ts` (legacy hook and global-slice are removed)
- [x] 4.3 Delete `src/components/layout/main.tsx` (orphaned by the persistent-tab-navigation change; legacy hook and global-slice are removed)
- [x] 4.4 Run `pnpm typecheck` to verify no remaining imports of removed files

## 5. Verification

- [x] 5.1 Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `simplify` and confirm all pass
- [ ] 5.2 Manually verify in PWA standalone mode (iOS Safari add-to-home-screen + Android Chrome PWA): pull down on `home` and `team` tabs, indicator appears with damped motion, refresh fires on threshold crossed release, snap-back is smooth
- [ ] 5.3 Manually verify in regular mobile browser (Safari/Chrome, not standalone): hook is inactive, native browser pull-to-refresh works as expected, no custom indicator appears
- [ ] 5.4 Manually verify under `TabContainer`: pulling on the active tab does not affect hidden tabs; switching tabs and pulling on the new tab triggers only that tab's refresh

## 6. Indicator placement fix (flow-layout rework)

Context: post-implementation testing showed the absolute-positioned indicator overlaps the first content row because the consumer container starts directly under the fixed header, and the per-`touchmove` `transform: translateY` on the consumer container drags the absolute child along with it. Rework switches the indicator to a flow-layout sibling whose `height` animates with `pullDistance`, pushing content down through normal document flow. The hook stops writing any style to consumer DOM. See updated `design.md` decisions and `specs/pull-to-refresh/spec.md`.

- [ ] 6.1 Update `src/hooks/use-pull-to-refresh.ts`: stop writing `transform` (or any other style) to the ref element on `touchstart`/`touchmove`/`touchend`/`touchcancel`; the hook becomes pure-state (drives only the returned `pullDistance`, `progress`, `isPulling`, `isRefreshing`). Keep listener binding (hook binds touch listeners to the passed ref element), lazy attach (hook attaches move/end listeners lazily), PWA gating (pull-to-refresh hook activates only in PWA standalone mode), threshold-crossed callback semantics (refresh callback fires when threshold is crossed at release), and damping (pull motion uses exponential damping) unchanged. Update JSDoc to remove the "hook owns `transform` on the ref element" clause and replace it with "hook owns no DOM mutation; consumers render `<PullRefreshIndicator />` to visualize state". Implements design decision: bind touch listeners to a ref-passed element, not `window`; and: hook returns `{ isPulling, isRefreshing, pullDistance, progress }` as React state, drives indicator height via the same state.
- [ ] 6.2 Update `src/components/layout/pull-refresh-indicator.tsx`: remove `position: absolute` (and `top-2`, `left-0`, `right-0`, `z-50`); render as a flow-layout block whose outer wrapper sets inline `height: ${pullDistance}px` when `isPulling || isRefreshing`, else `0` (PullRefreshIndicator component renders gesture and refresh visuals as a flow-layout sibling). Keep the icon centered inside the wrapper. Apply inline `transition: height 0.2s ease-out` only while a snap-back is in progress, i.e., after `touchend`/`touchcancel` and until `transitionend` fires (snap-back animation uses transient CSS transition on the indicator wrapper); use `useEffect`/`useRef` inside the indicator to attach/clear the transition based on transitions of `isPulling` from true→false. Keep the `@media not all and (display-mode: standalone)` CSS guard. Implements design decision: indicator is a flow-layout sibling that pushes content down (not absolute, not transform-on-content).
- [ ] 6.3 Verify `src/components/home/game-history.tsx` and `src/components/team/index.tsx` still render `<PullRefreshIndicator />` as a sibling that appears **before** the scrolling content in source order (so flow layout pushes content down). Remove any `relative` wrapper class that was only there to anchor the absolute indicator if no longer needed; otherwise leave the consumer markup untouched.
- [ ] 6.4 Update existing unit/integration tests for the hook and indicator to match the new contract: hook does not call `setProperty('transform', ...)` on the ref element; indicator wrapper's `height` reflects `pullDistance`; snap-back transition is added to the indicator wrapper (not the consumer container). Add a test asserting the consumer's content container receives no inline style mutation from the hook.
- [ ] 6.5 Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `simplify` and confirm all pass.
- [ ] 6.6 Re-run the manual verifications from 5.2 / 5.3 / 5.4 and confirm: indicator no longer overlaps content; content is pushed down by the same height as the indicator wrapper; snap-back animation is on the indicator only; switching tabs mid-gesture does not leave a stuck transform on any consumer container.
