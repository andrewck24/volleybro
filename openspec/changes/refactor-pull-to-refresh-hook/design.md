# Design: Pull-to-Refresh Hook Refactor

## Context

The legacy `usePullToRefresh` hook (in `src/lib/hooks/`) was always coupled to `Main` (`src/components/layout/main.tsx`), which read its state from Redux (`global-slice`) to render a top-of-page spinner. The recent `persistent-tab-navigation` change replaced `Main` with `TabContainer`, leaving the hook orphaned: `game-history.tsx` and `team/index.tsx` still call it, but no UI consumes the resulting state.

Constraints:

- All four tab slots are mounted simultaneously under `TabContainer`. Anything bound to `window` will fire across hidden tabs.
- The protected app is intended to run as a PWA. In standalone mode, the browser's native pull-to-refresh is suppressed, so a custom implementation is needed; in regular browser mode, native pull-to-refresh exists and a custom one would double-fire.
- Each tab refreshes a different SWR key; there is no single global "refresh" verb.
- **All tabs share a single scroll area: `window`.** `TabContainer` does not introduce per-tab scroll containers; the active tab content is laid out in normal document flow under `window` scroll. This invariant must be preserved.
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

The damped `pullDistance` drives the **indicator's height** (and `progress` drives icon transform), not a `transform: translateY` on the consumer's content container. See "Indicator is a flow-layout sibling" below for why content does not move.

Alternative considered: hard cap (`Math.min(dy, MAX)`). Rejected — produces an abrupt, unphysical stop instead of progressive resistance.

### Apply CSS transition only on release, remove on `transitionend`

While the user is pulling, the indicator's `height` is updated every `touchmove`; any `transition` would smear those updates and produce visible lag behind the finger. On `touchend`, the hook adds `transition: height 0.2s ease-out` to the indicator element so the snap-back is animated, then a `transitionend` listener removes the transition so the next gesture starts in immediate-update mode.

Alternative considered: leaving `transition` permanently set. Rejected — finger tracking becomes laggy and the gesture feels broken.

### PWA-only gating via `matchMedia("(display-mode: standalone)")` plus iOS `navigator.standalone`

At hook mount, check both signals. If neither is true, return zero-state and skip listener registration. The browser's native pull-to-refresh continues to work in regular browser mode; the custom one only activates where native is suppressed.

Alternative considered: always-on with `event.preventDefault()` to suppress native. Rejected — `preventDefault` on `touchmove` requires a non-passive listener, which Chrome warns against and which conflicts with smooth scrolling.

### Indicator is a flow-layout sibling that pushes content down (not absolute, not transform-on-content)

Each consumer (`game-history.tsx`, `team/index.tsx`) renders `<PullRefreshIndicator state={state} />` as a **flow-layout sibling above** the content (not `position: absolute`). The indicator's outer wrapper has `height: <pullDistance>px` (or `0` when idle), so as the user pulls, the indicator wrapper grows and pushes the content below it down through normal document flow. Content itself is **not** translated; the hook does not write `transform` to any consumer DOM node.

This matches the legacy `Main`-based pattern (an in-flow indicator slot animated via `h-0 → h-12`) which worked correctly under window-scroll. It also resolves three issues with an absolute-positioned indicator:

1. The consumer's container starts directly under the fixed header, leaving no negative-margin headroom for an absolutely-positioned indicator to live above the content — so absolute placement (e.g. `top-2`) overlaps the first row.
2. Any `transform: translateY` on the consumer's container would translate the absolute child along with it, defeating the "indicator stays put while content slides down" intent.
3. Translating the consumer container does not match window-scroll semantics: there is no per-tab scroll viewport whose content is being "pulled"; the gesture target is the page itself, and the natural feedback is to insert a region at the top of the flow.

Hook still binds touch listeners to a passed `RefObject<HTMLElement>` (the consumer's outer wrapper) so hidden tabs do not fire. `TabContainer` is unchanged. `PullRefreshIndicator` lives per-consumer; only the active tab is `display: block`, so per-tab indicators do not stack.

Alternative considered: a `RefreshContext` letting any descendant register a mutate callback that `TabContainer` reads, with a single indicator hoisted to `TabContainer`. Rejected — adds context plumbing, indirection between mutate site and gesture handler, and is undermotivated for two current consumers.

Alternative considered: keep `transform: translateY` on the consumer container plus `position: absolute; top: -<pullDistance>px` on the indicator so they move in lock-step from "above the viewport" into view. Rejected — equivalent visual to flow-layout height animation but requires two coordinated style writes per frame and breaks the moment a consumer wraps the ref in any `overflow: hidden` ancestor.

### Indicator visual: volleyball icon with rotate + scale during pull, spin + bounce during refresh

Reuses `MdOutlineSportsVolleyball` (already in the codebase). During pull, `rotate`, `scale`, `opacity` interpolate against `progress` (0 → 1). During refresh, two CSS animations layer: `animate-spin` plus a custom `animate-volleyball-bounce` keyframe (`translateY(0 ↔ -16px)`). The icon is centered inside the height-animated wrapper described above, so it appears to slide down with the wrapper while the content below moves down by the same amount.

Alternative considered: arc/progressive stroke (Strict Mode-style) or three-dot trail. Rejected — the volleyball variant has higher product brand identity and matches an existing icon already used for scores.

### Hook returns `{ isPulling, isRefreshing, pullDistance, progress }` as React state, drives indicator height via the same state

State is held in `useState` so the indicator component re-renders when values change. `pullDistance` is the post-damping value; `progress = pullDistance / threshold` clamped to `[0, 1]`. The hook does **not** mutate any consumer DOM node directly; the indicator reads `pullDistance` from state and applies it to its own wrapper `height` via inline style. The snap-back transition is also applied to the indicator wrapper (not to a consumer container) on `touchend` and removed on `transitionend`.

Per-pixel re-renders during pull are acceptable: only the indicator wrapper and icon re-render, both are leaf nodes with cheap inline-style updates, and React 19 batches `touchmove`-driven `setState` calls efficiently. If profiling later shows render thrash, an opt-in escape hatch (imperative `ref` write to the indicator wrapper) can be added without changing the public hook contract.

Alternative considered: hybrid React state + direct DOM mutation on the consumer's container (the original design). Rejected because the consumer's container is no longer the animated element — the indicator wrapper is — and the indicator already lives in a leaf component where state-driven rendering is cheap.

## Risks / Trade-offs

- **Risk: PWA detection misfires on edge browsers (Firefox PWA, desktop Edge PWA).** → Mitigation: `matchMedia` is the W3C standard and is the same signal Serwist uses; iOS `navigator.standalone` is a well-known Apple-specific fallback. Document the gate clearly in a JSDoc on the hook so future devs know when it activates.
- **Risk: Per-`touchmove` `setState` could cause render thrash.** → Mitigation: only the leaf `PullRefreshIndicator` and its icon re-render; `pullDistance` flows through `useState` and the indicator wrapper applies it via inline style. If profiling shows real cost, an imperative escape hatch on the indicator ref is a backwards-compatible follow-up.
- **Risk: Removing `global-slice` could surprise future developers expecting global UI state to live there.** → Mitigation: This change deletes the slice file outright; any future global UI state will need its own slice with a clear consumer.
- **Risk: `transitionend` listener could leak if `touchcancel` fires before `touchend`.** → Mitigation: `touchcancel` runs the same cleanup path as `touchend`, including removing the temporary `height` transition on the indicator wrapper immediately rather than waiting for `transitionend`.
- **Risk: Layout shift when the indicator wrapper's `height` animates may visually jitter `IntersectionObserver`-based infinite scroll triggers (e.g., `lastItemRef` in `game-history.tsx`).** → Mitigation: indicator only animates while a touch gesture is active or refresh is in flight; observers re-evaluate on layout change but cannot fire spuriously without the sentinel actually crossing the viewport boundary, which the gesture itself does not cause.

## Migration Plan

1. Land the new hook + indicator alongside the old hook (no consumer change yet) — verify type-check.
2. Migrate `game-history.tsx` and `team/index.tsx` to the new hook + indicator.
3. Delete `src/lib/hooks/usePullToRefresh.ts`, `src/lib/features/global-slice.ts`, and `src/components/layout/main.tsx`. Update `src/lib/redux/store.ts` to drop `globalReducer`.
4. Verify build, lint, typecheck, tests pass.
5. Manually verify on a PWA-installed instance (iOS Safari add-to-home-screen + Android Chrome PWA): pull works, snap-back smooth, indicator animates, refresh fires once.
6. Verify in regular Chrome/Safari mobile browser: hook is inactive, native browser pull-to-refresh continues to work normally.

Rollback: revert the change. The legacy hook code path is fully removed by step 3, so rollback is a single revert.

### Minimum refresh display via concurrent Promise.all

When `onRefresh()` resolves very quickly (e.g., warm SWR cache), the volleyball bounce animation flashes too briefly for users to perceive that a refresh happened. A `minRefreshDisplay` option (default `1000` ms) guarantees the animation stays visible for at least that duration while still waiting for the refresh to fully complete.

Implementation: replace `await onRefreshRef.current()` with:

```ts
await Promise.all([
  onRefreshRef.current(),
  new Promise(r => setTimeout(r, minRefreshDisplay)),
]);
```

`Promise.all` waits for **both** the refresh callback and the timer to settle. `isRefreshing` stays `true` until both are done — meaning the animation is always shown for at least `minRefreshDisplay` ms, and always waits for the data to finish loading regardless of how long it takes. `isRefreshingRef.current` remains `true` throughout, so the concurrent-gesture guard continues to work.

No changes are needed in `PullRefreshIndicator` — it renders the animation as long as `isRefreshing` is `true`.

Alternative considered: tracking `Date.now()` at refresh start and computing remaining time in the `finally` block. Rejected — more complex and equivalent in effect; the `Promise.all` idiom directly expresses "wait for the longer of the two."

Alternative considered: enforcing the minimum in `PullRefreshIndicator` by delaying the visual transition. Rejected — hook state would reset before the animation ends, allowing a concurrent refresh to begin while the previous animation is still playing.

### Refresh error surfaces to consumer via `onError` callback and `refreshError` state

When `onRefresh()` rejects (network failure, server error) or the `refreshTimeout` elapses before both the callback and the minimum-display timer settle, the hook surfaces the failure through two mechanisms:

1. **`onError?: (error: unknown) => void`** option — called synchronously in the catch block with the raw error. Consumers use this to show a toast when stale data is already displayed.
2. **`refreshError: unknown`** added to the returned state — set to the caught error and reset to `null` when the next pull gesture begins. Consumers use this to render `<ServerErrorState>` when no cached data exists.

Consumer decision logic:

- `if (hasData && refreshError) → showErrorToast(error, toast)` via `onError`
- `if (!hasData && (swrError || refreshError)) → <ServerErrorState />`

The two mechanisms are complementary: `onError` fires immediately (ephemeral toast), `refreshError` persists in state until the next gesture (fallback UI when there is nothing to show).

Alternative considered: a single `onError` callback with no `refreshError` state, requiring consumers to manage their own local error state. Rejected — every consumer would duplicate the same `useState(null)` + `useEffect` pattern; returning `refreshError` from the hook keeps that logic in one place.

### Timeout via `Promise.race` wrapping the existing `Promise.all`

The `refreshTimeout` option (default `8000` ms) caps the total wait time for a refresh. The existing `Promise.all([callback, minDisplayTimer])` is wrapped in a `Promise.race` against a timeout promise. Both timers use stored IDs so `clearTimeout` can be called in `finally` — this prevents the 8 s timeout setTimeout from lingering as a dangling callback after a normal refresh completes:

```ts
export class RefreshTimeoutError extends Error {
  constructor() { super("refresh timeout"); this.name = "RefreshTimeoutError"; }
}

let minDisplayId: ReturnType<typeof setTimeout> | undefined;
let timeoutId: ReturnType<typeof setTimeout> | undefined;
const minDisplayTimer = new Promise<void>(r => { minDisplayId = setTimeout(r, minRefreshDisplay); });
const timeoutTimer = new Promise<never>((_, reject) => {
  timeoutId = setTimeout(() => reject(new RefreshTimeoutError()), refreshTimeout);
});

try {
  await Promise.race([
    Promise.all([onRefreshRef.current(), minDisplayTimer]),
    timeoutTimer,
  ]);
} catch (error) { /* onError, refreshError */ } finally {
  clearTimeout(minDisplayId);
  clearTimeout(timeoutId);
  /* reset isRefreshing state */
}
```

`clearTimeout(timeoutId)` is the critical call: every successful refresh (which finishes before 8 s) would otherwise leave an 8 s dangling `setTimeout` that fires unnecessarily — a cumulative drain on the mobile event loop. `clearTimeout(minDisplayId)` is a no-op in most paths (the 1000 ms timer has already fired) but is included for symmetry and correctness on the timeout path.

When `timeoutTimer` wins the race, the hook catches a `RefreshTimeoutError`, calls `onError`, and sets `refreshError`. The underlying SWR `mutate()` remains in-flight; SWR 2.x does not pass an `AbortSignal` to fetchers, and all PTR-triggered calls are idempotent GET revalidations, so the in-flight request completing later is safe — SWR updates its cache and triggers a re-render normally. Re-entry (a second pull while the timed-out request is still in-flight) is accepted: each `onTouchEnd` closure writes to `isRefreshingRef` independently, and SWR processes both GET responses without data inconsistency. `AbortController` support is deferred to a separate change if mutation-style callbacks are ever introduced.

`RefreshTimeoutError` is an exported class so that `showErrorToast` can branch on it: `error instanceof RefreshTimeoutError → "連線逾時，請稍後再試"`. No new `onTimeout` callback is introduced — unified `onError` with type discrimination avoids premature abstraction.

### Unified `onError` with `showErrorToast` branching rather than split `onTimeout`

A single `onError` callback handles both refresh failures and timeouts. `showErrorToast` (in `src/lib/api/error-toast.ts`) gains a `RefreshTimeoutError` branch that renders "連線逾時，請稍後再試" — consistent with its existing server-error and operational-error branches.

A dedicated `onTimeout` callback was considered. Rejected: at the current two-consumer scale, splitting the API adds indirection with no concrete benefit. The abstraction should be introduced if three or more call sites produce identical `onTimeout` implementations.

### `game-history.tsx` conditional rendering flattened to early returns

`game-history.tsx` previously used an inline `renderContent()` helper to manage five conditional states (loading, error, no team, no data, data). This pattern adds a layer of indirection — readers must locate the helper definition before understanding the render tree.

The component is refactored to use early returns at the top of the component body, matching the pattern used in `team/index.tsx`. Each early-return branch includes `<PullRefreshIndicator>` as the first child so the indicator is always present at the same DOM position. The `refreshError` check is naturally expressed as one of these early returns:

```tsx
if (!hasData && (error || refreshError)) return (
  <div ref={containerRef}>
    <PullRefreshIndicator state={refreshState} />
    <ServerErrorState onRetry={() => mutate()} />
  </div>
);
```

The `renderContent()` function is deleted entirely.

## Open Questions

None. All design choices have been resolved through prior discussion.
