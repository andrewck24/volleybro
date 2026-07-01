## Why

The current `usePullToRefresh` hook (in `src/lib/hooks/`) was rendered nonfunctional by the `persistent-tab-navigation` change: it was consumed exclusively through `Main` (`src/components/layout/main.tsx`), which `TabContainer` has fully replaced. As a result, no page in the protected layout currently shows a pull-to-refresh indicator, even though `game-history.tsx` and `team/index.tsx` still call the hook.

Beyond the regression, the existing implementation has long-standing design issues that are blocking us from re-enabling pull-to-refresh cleanly:

- Touch listeners are bound to `window`, which is incorrect under the new tab architecture (all tabs are simultaneously mounted in the DOM, so listeners fire across hidden tabs).
- Pull state (`isPulling`, `isRefreshing`, `isDisabled`) is stored in the Redux `global-slice`, but `isDisabled` is never written by anyone, and the state is purely ephemeral UI state that does not need global sharing.
- There is no visual feedback during the pull gesture itself — the page does not move with the finger, only a spinner appears once the threshold is crossed.
- The hook fires in any browser context, including environments where the browser already provides native pull-to-refresh, causing duplicate refresh behavior.

This change refactors the hook into a ref-scoped, PWA-aware, animation-driven implementation, deletes the now-vestigial `global-slice`, and re-wires `TabContainer` consumers so pull-to-refresh works again across the protected app.

## What Changes

- **NEW** `src/hooks/use-pull-to-refresh.ts` — ref-based hook accepting a target element ref, a refresh callback, and options (`threshold`, `maxPull`, `resistance`, `pwaOnly`). Returns `{ isPulling, isRefreshing, pullDistance, progress }` as local React state.
- **NEW** `src/components/layout/pull-refresh-indicator.tsx` — visual indicator using `MdOutlineSportsVolleyball`, rendered as a flow-layout sibling above the pulled content. The wrapper's `height` animates with `pullDistance` and pushes content down through normal document flow; the icon animates rotate/scale/opacity tied to pull progress and spins + bounces during refresh. The hook does not write `transform` to any consumer DOM node.
- Hook implementation details (informed by Strict Mode pull-to-refresh article and the legacy `Main` flow-layout pattern):
  - Lazy listener attach: `touchmove`/`touchend` are registered only after `touchstart`, removed on `touchend`.
  - Listeners bound to the passed `ref` element, not `window`.
  - Exponential damping: `appr(dy) = MAX * (1 - exp(-k * dy / MAX))` (default `MAX=128`, `k=0.4`) so over-pull asymptotes naturally; the damped value drives the indicator wrapper's `height` (not a `transform` on consumer content).
  - Dynamic CSS transition management: `height` transition is added to the indicator wrapper on `touchend`, removed on `transitionend`, so it does not interfere with the next gesture.
  - PWA-only gating via `matchMedia("(display-mode: standalone)")` and iOS `navigator.standalone`. Non-standalone environments early-return at mount and never register listeners.
- **BREAKING** Remove `src/lib/hooks/usePullToRefresh.ts` (replaced by `src/hooks/use-pull-to-refresh.ts`).
- **BREAKING** Remove `src/lib/features/global-slice.ts` and its `globalReducer` registration in `src/lib/redux/store.ts`. The slice has no other consumers.
- Update consumers `src/components/home/game-history.tsx` and `src/components/team/index.tsx` to pass a container ref into the new hook and render `<PullRefreshIndicator />`.
- Delete `src/components/layout/main.tsx` (already orphaned by the tab-navigation change).
- `TabContainer` (`src/components/layout/tab-container.tsx`) is **not** modified to render its own indicator. Each tab page owns its own refresh target and indicator placement, since each tab mutates a different SWR key.

## Non-Goals

- **No `/game` integration in this change.** Game-recording pages have custom touch gestures (swipe between sets, long-press, etc.) that need separate evaluation; adding pull-to-refresh there is left to a follow-up change.
- **No `TabContainer`-level indicator.** Centralizing the indicator in `TabContainer` would require a context or prop-drilled callback for each tab to register its own mutate target. This was rejected as over-engineered for two consumers; per-tab ownership is simpler and matches the existing structure.
- **No Intersection Observer rewrite.** Pull-to-refresh is a touch gesture, not a visibility detection; IO is not a viable replacement for `touchstart`/`touchmove`/`touchend`.
- **No haptic feedback on threshold-crossed.** `navigator.vibrate` support is inconsistent across iOS/Android PWA contexts; deferred until validated.
- **No dev-mode override flag** (e.g., `localStorage.getItem("force-pull-refresh")`). Can be added later if developer experience demands it.

## Capabilities

### New Capabilities

- `pull-to-refresh`: Hook + indicator component contract for triggering SWR refreshes via touch-pull gesture in PWA standalone mode, including damping, transition management, and visual feedback states.

### Modified Capabilities

(none)

## Impact

- Affected specs: new `pull-to-refresh` capability
- Affected code:
  - New: `src/hooks/use-pull-to-refresh.ts`, `src/components/layout/pull-refresh-indicator.tsx`
  - Modified: `src/components/home/game-history.tsx`, `src/components/team/index.tsx`, `src/lib/redux/store.ts`
  - Deleted: `src/lib/hooks/usePullToRefresh.ts`, `src/lib/features/global-slice.ts`, `src/components/layout/main.tsx`
- Affected dependencies: none (uses existing `react-icons/md` and Tailwind)
- Affected runtime behavior: pull-to-refresh becomes available again on `home` and `team` tabs in PWA standalone mode; non-PWA browsers continue to use the browser's native pull-to-refresh with no overlap.
