## ADDED Requirements

### Requirement: Pull-to-refresh hook activates only in PWA standalone mode

The system SHALL provide a `usePullToRefresh` hook that registers touch listeners only when the application is running in PWA standalone display mode. In all other contexts (regular browser tab, embedded webview without standalone), the hook MUST return inactive zero-state and MUST NOT register any DOM listeners.

The standalone detection MUST use `window.matchMedia("(display-mode: standalone)").matches` OR the iOS-specific `window.navigator.standalone === true`.

#### Scenario: Hook is inactive in regular browser

- **WHEN** the hook is invoked in a normal browser tab where neither `matchMedia("(display-mode: standalone)").matches` nor `navigator.standalone` is true
- **THEN** no `touchstart`, `touchmove`, or `touchend` listeners are registered on the ref element
- **AND** the returned state is `{ isPulling: false, isRefreshing: false, pullDistance: 0, progress: 0 }`
- **AND** the native browser pull-to-refresh continues to operate normally

#### Scenario: Hook activates in standalone PWA

- **WHEN** the hook is invoked while `matchMedia("(display-mode: standalone)").matches` returns true
- **THEN** a `touchstart` listener is registered on the ref element
- **AND** subsequent touch gestures on that element produce pull-to-refresh behavior

### Requirement: Hook binds touch listeners to the passed ref element

The hook SHALL accept a `RefObject<HTMLElement>` as its first argument and bind all touch listeners to that element, never to `window` or `document`. This ensures touch events from sibling DOM subtrees (for example, other tab slots in `TabContainer`) do not trigger the hook.

#### Scenario: Listener scope is element-bound

- **WHEN** two consumers each invoke the hook with different ref elements
- **THEN** a touch on element A triggers only consumer A's hook
- **AND** a touch on element B triggers only consumer B's hook

### Requirement: Hook attaches move/end listeners lazily

The hook MUST register `touchmove`, `touchend`, and `touchcancel` listeners only after `touchstart` fires, and MUST remove them when the gesture ends (`touchend` or `touchcancel`). At rest, only the `touchstart` listener is attached.

#### Scenario: Idle hook has minimal listener footprint

- **WHEN** the hook is mounted but no touch is in progress
- **THEN** only one listener (`touchstart`) is attached to the ref element

#### Scenario: Move and end listeners cleaned up after gesture

- **WHEN** a user completes a touch gesture (`touchend` fires) or the gesture is cancelled (`touchcancel` fires)
- **THEN** the corresponding `touchmove`, `touchend`, and `touchcancel` listeners are removed from the ref element

### Requirement: Pull motion uses exponential damping

While the user pulls down, the visual displacement of the ref element MUST follow `appr(dy) = MAX * (1 - exp(-k * dy / MAX))` where `dy` is the raw vertical distance from the initial touch, and the defaults are `MAX = 128` and `k = 0.4`. Both values MUST be configurable via hook options (`maxPull`, `resistance`).

Negative `dy` (upward motion) MUST NOT produce any displacement.

#### Scenario: Damped pull asymptotes to maxPull

- **WHEN** the user pulls down with raw `dy` values increasing without bound
- **THEN** the resulting displacement asymptotically approaches `maxPull` and never exceeds it

##### Example: damping behavior with defaults

| Raw dy | Damped pullDistance (MAX=128, k=0.4) |
| ------ | ------------------------------------ |
| 0      | 0                                    |
| 50     | ~36                                  |
| 100    | ~58                                  |
| 200    | ~85                                  |
| 500    | ~115                                 |
| 1000   | ~125                                 |

#### Scenario: Upward pull is ignored

- **WHEN** the user moves their finger upward (raw `dy < 0`)
- **THEN** the ref element's `transform` is not updated and `pullDistance` stays at 0

### Requirement: Refresh callback fires when threshold is crossed at release

The hook MUST invoke the `onRefresh` callback exactly once when the user releases their finger AND the post-damping `pullDistance` at release time is greater than or equal to `threshold` (default 80px, configurable via options). If `pullDistance` at release is below `threshold`, `onRefresh` MUST NOT be invoked.

While `onRefresh` is awaited (the returned `isRefreshing` state is `true`), additional touch gestures MUST NOT trigger another refresh until the current refresh completes.

#### Scenario: Refresh fires after threshold-crossed release

- **WHEN** the user pulls down to a damped `pullDistance >= threshold` and then releases
- **THEN** `onRefresh` is invoked exactly once
- **AND** `isRefreshing` becomes `true` until the awaited callback resolves

#### Scenario: Refresh does not fire when below threshold

- **WHEN** the user pulls down to a damped `pullDistance < threshold` and then releases
- **THEN** `onRefresh` is NOT invoked
- **AND** the ref element animates back to its initial position

#### Scenario: Concurrent refresh attempts are ignored

- **WHEN** `isRefreshing` is `true` (a refresh is in progress) and the user pulls down past `threshold` and releases again
- **THEN** `onRefresh` is NOT invoked a second time

### Requirement: Snap-back animation uses transient CSS transition

When the touch gesture ends, the hook MUST add a `transform` CSS transition to the ref element so the snap-back is animated smoothly. The hook MUST remove the transition on `transitionend` so subsequent `touchmove` updates apply immediately without lag.

The transition MUST NOT be applied during active pulling (between `touchstart` and `touchend`).

#### Scenario: Transition is added on release

- **WHEN** `touchend` fires
- **THEN** the ref element's inline `transition` style includes `transform`
- **AND** the inline `transform` is reset to `translateY(0)`

#### Scenario: Transition is removed after snap-back

- **WHEN** the snap-back animation completes (`transitionend` fires for the `transform` property)
- **THEN** the ref element's inline `transition` style is cleared

#### Scenario: No transition during active pull

- **WHEN** the user is actively pulling (between `touchstart` and `touchend`)
- **THEN** the ref element's inline `transition` style does not include `transform`

### Requirement: Hook returns observable React state

The hook SHALL return `{ isPulling, isRefreshing, pullDistance, progress }` where:

- `isPulling: boolean` is `true` between `touchstart` and `touchend` whenever `pullDistance > 0`.
- `isRefreshing: boolean` is `true` from the moment `onRefresh` is invoked until the returned promise resolves; `false` otherwise.
- `pullDistance: number` is the current damped vertical displacement in pixels.
- `progress: number` is `pullDistance / threshold`, clamped to `[0, 1]`.

These values MUST be exposed via React state so consumers re-render when they change.

#### Scenario: Progress reaches 1 at threshold

- **GIVEN** `threshold = 80`
- **WHEN** the user pulls to a damped `pullDistance` of 80 or greater
- **THEN** `progress` returns `1`

#### Scenario: Progress is clamped at 1

- **GIVEN** `threshold = 80` and `maxPull = 128`
- **WHEN** the user pulls past threshold to a damped `pullDistance` of 120
- **THEN** `progress` returns `1` (not 1.5)

### Requirement: PullRefreshIndicator component renders gesture and refresh visuals

The system SHALL provide a `PullRefreshIndicator` component that accepts the hook's returned state object and renders the `MdOutlineSportsVolleyball` icon with the following behavior:

- During pull (`isPulling` true, `isRefreshing` false): icon `opacity`, `scale`, and `rotate` interpolate based on `progress` (0 → 1). Specifically: opacity `0 → 1`, scale `0.6 → 1.0`, rotate `0deg → 180deg`.
- During refresh (`isRefreshing` true): icon plays continuous `animate-spin` (linear rotation) layered with a custom `animate-volleyball-bounce` keyframe (`translateY(0 ↔ -3px)` ease-in-out alternate).
- Inactive (`isPulling` false AND `isRefreshing` false): component renders nothing OR renders with `opacity: 0`; indicator MUST NOT visually obstruct content.

The component MUST be absolutely positioned so it does NOT move when the parent's content is translated downward by the hook.

The component MUST also wrap its visible output in a CSS guard equivalent to `@media not all and (display-mode: standalone)` → `display: none`, as a defense-in-depth fallback so the indicator never appears in non-PWA contexts even if the hook were misused.

#### Scenario: Indicator hidden when idle

- **WHEN** `isPulling` is `false` AND `isRefreshing` is `false`
- **THEN** the indicator is not visible to the user

#### Scenario: Indicator interpolates with progress during pull

- **WHEN** `isPulling` is `true` AND `progress` is `0.5`
- **THEN** the icon's rendered `opacity`, `scale`, and `rotate` values are halfway between their `progress=0` and `progress=1` endpoints

#### Scenario: Indicator spins and bounces during refresh

- **WHEN** `isRefreshing` is `true`
- **THEN** the icon has both `animate-spin` and `animate-volleyball-bounce` CSS animations active

#### Scenario: Indicator hidden in non-PWA via CSS guard

- **WHEN** the application runs outside `display-mode: standalone`
- **THEN** the indicator's CSS guard sets `display: none` regardless of state props