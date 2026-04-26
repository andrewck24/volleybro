# Design: Pull-to-Refresh Hook Refactor

## Context

The legacy `usePullToRefresh` hook (in `src/lib/hooks/`) was always coupled to `Main` (`src/components/layout/main.tsx`), which read its state from Redux (`global-slice`) to render a top-of-page spinner. The recent `persistent-tab-navigation` change replaced `Main` with `TabContainer`, leaving the hook orphaned: `game-history.tsx` and `team/index.tsx` still call it, but no UI consumes the resulting state.

Constraints:

- All four tab slots are mounted simultaneously under `TabContainer`. Anything bound to `window` will fire across hidden tabs.
- The protected app is intended to run as a PWA. In standalone mode, the browser's native pull-to-refresh is suppressed, so a custom implementation is needed; in regular browser mode, native pull-to-refresh exists and a custom one would double-fire.
- Each tab refreshes a different SWR key; there is no single global "refresh" verb.
- The project already imports `react-icons/md` (used in `src/components/game/header/scores.tsx` for the volleyball glyph), so we can reuse `MdOutlineSportsVolleyball` rather than ship custom SVG.

Stakeholders: end users running the app as a PWA on iOS/Android.

## Goals / Non-Goals

**Goals:**

- Re-establish working pull-to-refresh behavior on `home` and `team` tabs after the tab-navigation refactor.
- Make the hook safe under the parallel-routes tab architecture (no cross-tab leakage).
- Provide finger-tracking visual feedback during the pull gesture, not just post-threshold spinner state.
- Avoid duplicate refresh behavior in non-PWA browsers.
- Eliminate `global-slice` (no other consumers exist).

**Non-Goals:**

- Adding pull-to-refresh to `/game` recording pages (custom touch gestures need separate analysis).
- Centralizing pull-to-refresh in `TabContainer` (each tab owns its own SWR key; central coordination is over-engineered for two consumers).
- Replacing `touchstart`/`touchmove`/`touchend` with Intersection Observer (different problem domain).
- Implementing haptic feedback (`navigator.vibrate`) — inconsistent PWA support.
- Dev-mode override flag for forcing pull-to-refresh in browser mode.

## Decisions

### Bind touch listeners to a ref-passed element, not `window`

The hook accepts a `RefObject<HTMLElement>` and binds `touchstart` / `touchmove` / `touchend` to that element. Under the tab-container architecture, multiple tabs may instantiate the hook; window-bound listeners would fire on all of them simultaneously regardless of which tab is visible. Element-scoped listeners only fire when the user touches the actual tab content.

Alternative considered: binding to `document` and gating on `display: none` checks. Rejected — fragile, requires every consumer to understand the visibility contract.

### Lazy attach `touchmove` / `touchend` only after `touchstart`

`touchstart` is the only listener registered at mount. `touchmove` and `touchend` are registered inside `touchstart` and removed inside `touchend` (and `touchcancel`). This keeps idle pages cheap (one passive listener) and avoids a permanent move-handler that runs on every scroll-bottom touch.

Alternative considered: keeping all three listeners always. Rejected — the legacy hook did this and processed every touch event globally on `window`, wasting cycles when no pull was in progress.

### Exponential damping for over-pull (`appr` function)

`pullDistance = MAX * (1 - exp(-k * dy / MAX))` with `MAX = 128` and `k = 0.4`. This produces a soft asymptote so the user can pull as hard as they want without the indicator running off-screen, and gives a tactile "rubber band" feel matching native iOS/Android. Values are tunable through hook options.

Alternative considered: hard cap (`Math.min(dy, MAX)`). Rejected — produces an abrupt, unphysical stop instead of progressive resistance.

### Apply CSS transition only on release, remove on `transitionend`

While the user is pulling, `transform` is updated every `touchmove`; any `transition` would smear those updates and produce visible lag behind the finger. On `touchend`, the hook adds `transition: transform 0.2s ease-out` so the snap-back is animated, then a `transitionend` listener removes the transition so the next gesture starts in immediate-update mode.

Alternative considered: leaving `transition` permanently set. Rejected — finger tracking becomes laggy and the gesture feels broken.

### PWA-only gating via `matchMedia("(display-mode: standalone)")` plus iOS `navigator.standalone`

At hook mount, check both signals. If neither is true, return zero-state and skip listener registration. The browser's native pull-to-refresh continues to work in regular browser mode; the custom one only activates where native is suppressed.

Alternative considered: always-on with `event.preventDefault()` to suppress native. Rejected — `preventDefault` on `touchmove` requires a non-passive listener, which Chrome warns against and which conflicts with smooth scrolling.

### Per-tab indicator ownership instead of `TabContainer`-level

Each consumer (`game-history.tsx`, `team/index.tsx`) wraps its scroll content with a container `div` (the ref target) and renders `<PullRefreshIndicator state={state} />` as a sibling absolutely positioned to the top of the container. `TabContainer` itself is unchanged.

Alternative considered: a `RefreshContext` letting any descendant register a mutate callback that `TabContainer` reads. Rejected — adds context plumbing, indirection between mutate site and gesture handler, and is undermotivated for two current consumers.

### Indicator visual: volleyball icon with rotate + scale during pull, spin + bounce during refresh

Reuses `MdOutlineSportsVolleyball` (already in the codebase). During pull, `rotate`, `scale`, `opacity` interpolate against `progress` (0 → 1). During refresh, two CSS animations layer: `animate-spin` plus a custom `animate-volleyball-bounce` keyframe (`translateY(0 ↔ -3px)`). Indicator container is `absolute` positioned at the top of the parent; it does not move when the content slides down.

Alternative considered: arc/progressive stroke (Strict Mode-style) or three-dot trail. Rejected — the volleyball variant has higher product brand identity and matches an existing icon already used for scores.

### Hook returns `{ isPulling, isRefreshing, pullDistance, progress }` as React state

State is held in `useState` so the indicator component re-renders when values change. `pullDistance` is the post-damping value; `progress = pullDistance / threshold` clamped to `[0, 1]`. The hook also imperatively sets `transform` on the ref element via direct DOM mutation (not React state) on every `touchmove` to avoid render thrash on each pixel.

Alternative considered: pure-DOM with no React state, exposing values only via ref-callback. Rejected — the indicator needs React-driven rendering for `MdOutlineSportsVolleyball` props (`rotate` etc.) and React state is a more idiomatic boundary. The hybrid (state for UI thresholds, direct DOM for transform tracking) is a deliberate trade-off.

## Risks / Trade-offs

- **Risk: PWA detection misfires on edge browsers (Firefox PWA, desktop Edge PWA).** → Mitigation: `matchMedia` is the W3C standard and is the same signal Serwist uses; iOS `navigator.standalone` is a well-known Apple-specific fallback. Document the gate clearly in a JSDoc on the hook so future devs know when it activates.
- **Risk: Hybrid React state + direct DOM mutation could desync if a consumer reads `pullDistance` and tries to apply its own `transform`.** → Mitigation: JSDoc on the hook explicitly states the hook owns `transform` on the ref element; consumers must not set `transform` on it.
- **Risk: Removing `global-slice` could surprise future developers expecting global UI state to live there.** → Mitigation: This change deletes the slice file outright; any future global UI state will need its own slice with a clear consumer.
- **Risk: `transitionend` listener could leak if `touchcancel` fires before `touchend`.** → Mitigation: `touchcancel` runs the same cleanup path as `touchend`, including removing the temporary transition immediately rather than waiting for `transitionend`.

## Migration Plan

1. Land the new hook + indicator alongside the old hook (no consumer change yet) — verify type-check.
2. Migrate `game-history.tsx` and `team/index.tsx` to the new hook + indicator.
3. Delete `src/lib/hooks/usePullToRefresh.ts`, `src/lib/features/global-slice.ts`, and `src/components/layout/main.tsx`. Update `src/lib/redux/store.ts` to drop `globalReducer`.
4. Verify build, lint, typecheck, tests pass.
5. Manually verify on a PWA-installed instance (iOS Safari add-to-home-screen + Android Chrome PWA): pull works, snap-back smooth, indicator animates, refresh fires once.
6. Verify in regular Chrome/Safari mobile browser: hook is inactive, native browser pull-to-refresh continues to work normally.

Rollback: revert the change. The legacy hook code path is fully removed by step 3, so rollback is a single revert.

## Open Questions

None. All design choices have been resolved through prior discussion.
