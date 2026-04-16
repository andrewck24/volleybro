## ADDED Requirements

### Requirement: Tab DOM persistence

The system SHALL keep all four tab component trees (Home, Team, Notifications, User) mounted in the DOM simultaneously. A tab's DOM SHALL be hidden via `display: none` when not active and shown via `display: block` when active. The system SHALL NOT unmount a tab's component tree when switching to another tab.

#### Scenario: Switch away from tab and return

- **WHEN** a user navigates within Tab A (e.g., opens a team detail page) and then switches to Tab B
- **THEN** Tab B becomes visible and Tab A's DOM remains mounted with its state preserved
- **WHEN** the user switches back to Tab A
- **THEN** Tab A displays the same page and scroll position as when the user left

#### Scenario: Data not refetched on tab return

- **WHEN** a user returns to a tab they previously visited
- **THEN** the tab SHALL display the previously loaded data without triggering a new network request (SWR cache serves the data)

### Requirement: URL synchronization on tab switch

The system SHALL call `router.replace` with the target tab's current route and `{ scroll: false }` whenever the user switches tabs. The URL in the browser address bar SHALL reflect the active tab's current route at all times. The viewport scroll position SHALL NOT reset on tab switch.

#### Scenario: Tab switch updates URL

- **WHEN** a user is on `/team/abc/players/123` in the Team tab and switches to the Home tab
- **THEN** the URL SHALL update to the Home tab's current route (e.g., `/home`) via `router.replace`

#### Scenario: Tab switch does not add history entry

- **WHEN** a user switches tabs multiple times
- **THEN** the browser history stack SHALL NOT accumulate tab-switch entries; pressing back SHALL navigate within the current tab's content history, not between tabs

#### Scenario: Scroll position preserved on tab switch

- **WHEN** a user scrolls down a page in Tab A, switches to Tab B, and switches back to Tab A
- **THEN** Tab A's scroll position SHALL remain at the same position as when the user left

### Requirement: Per-tab current route tracking

The system SHALL use URL as the single source of truth for both `activeTab` and `tabCurrentRoute`. The active tab SHALL be derived from `usePathname()` via a `resolveTabFromPath()` function, and SHALL NOT be held as independent local state. When the URL changes from any source (tab switch, browser back/forward, programmatic navigation, hard refresh), the system SHALL resolve the correct tab from the new pathname and update only that tab's entry in `tabCurrentRoute`. Non-active tabs SHALL NOT have their stored routes overwritten.

#### Scenario: Deep route preserved on tab switch and return

- **WHEN** a user navigates to `/team/abc/players/123` in the Team tab, switches to Home, and switches back to Team
- **THEN** the URL SHALL be `/team/abc/players/123` and the Team tab SHALL display that page

#### Scenario: Non-active tab routes are not corrupted

- **WHEN** a user navigates within the Team tab to `/team/abc/players/123`
- **THEN** the stored route for Home, Notifications, and User tabs SHALL remain unchanged

#### Scenario: Browser back/forward does not corrupt tabCurrentRoute

- **WHEN** a user switches from Team tab to Home tab (URL becomes `/home`) and then presses browser back (URL returns to `/team/abc/players/123`)
- **THEN** the system SHALL resolve the tab as "team" from the pathname and update `tabCurrentRoute["team"]` accordingly
- **THEN** `tabCurrentRoute["home"]` SHALL remain `/home` and SHALL NOT be overwritten with `/team/abc/players/123`

#### Scenario: Hard refresh resets non-active tabs

- **WHEN** the user performs a hard refresh while the Team tab is active at `/team/abc`
- **THEN** the Team tab SHALL restore to `/team/abc`, and all other tabs SHALL initialize to their root routes

### Requirement: Responsive navigation layout

The system SHALL render a bottom navigation bar on viewports narrower than 768px (`< md`) and a collapsible sidenav on viewports 768px or wider (`≥ md`). Both navigations SHALL be always visible regardless of the current route depth.

#### Scenario: Mobile viewport shows bottom nav

- **WHEN** the viewport width is less than 768px
- **THEN** the bottom navigation bar SHALL be visible at the bottom of the screen
- **THEN** the sidenav SHALL NOT be rendered

#### Scenario: Desktop viewport shows sidenav

- **WHEN** the viewport width is 768px or greater
- **THEN** the sidenav SHALL be visible on the left side of the screen
- **THEN** the bottom nav SHALL NOT be rendered

#### Scenario: Bottom nav iOS safe area

- **WHEN** the app runs as a PWA in standalone mode on iOS
- **THEN** the bottom nav SHALL apply `padding-bottom: env(safe-area-inset-bottom)` to avoid overlap with the home indicator

### Requirement: Collapsible sidenav

The sidenav SHALL support two states: expanded (icon + label, 200px wide) and collapsed (icon only, 40px wide). The collapsed state SHALL persist across page refreshes via `localStorage`. Tab switching behavior SHALL be identical to the bottom nav.

#### Scenario: Toggle sidenav collapse

- **WHEN** the user clicks the collapse/expand toggle button
- **THEN** the sidenav SHALL animate between expanded and collapsed states via a CSS `width` transition

#### Scenario: Collapse state persists across refresh

- **WHEN** the user collapses the sidenav and refreshes the page
- **THEN** the sidenav SHALL render in the collapsed state on load

### Requirement: Directional tab-switch animation

The system SHALL play a directional slide animation when switching tabs. Switching to a tab with a higher index (right) SHALL slide the new content in from the right and old content out to the left. Switching to a tab with a lower index (left) SHALL reverse the direction. The animation SHALL use the View Transitions API (`document.startViewTransition`) where available and SHALL fall back to an instant switch without animation on unsupported browsers.

#### Scenario: Forward tab switch animation

- **WHEN** the user switches from Home (index 0) to Team (index 1)
- **THEN** the Home content SHALL slide out to the left and the Team content SHALL slide in from the right over 300ms

#### Scenario: Backward tab switch animation

- **WHEN** the user switches from Team (index 1) to Home (index 0)
- **THEN** the Team content SHALL slide out to the right and the Home content SHALL slide in from the left over 300ms

#### Scenario: Animation fallback

- **WHEN** `document.startViewTransition` is not available (e.g., iOS < 18)
- **THEN** the tab switch SHALL complete instantly with no animation and no JavaScript error

### Requirement: Per-page Header

Each page SHALL render its own `<Header>` component using a shared shell. The shell SHALL provide consistent height, padding, backdrop-blur, and z-index. The shell SHALL accept a `title` string, an optional `backHref` string, and optional `children` for custom content.

#### Scenario: Header with title and back button

- **WHEN** a page renders `<Header title="球員資料" backHref="/team/abc" />`
- **THEN** the header SHALL display "球員資料" as the title and a back button that navigates to `/team/abc`

#### Scenario: Header with custom children

- **WHEN** a page renders `<Header><TeamSwitcherDrawerTrigger /></Header>`
- **THEN** the header SHALL display the custom component instead of a text title

#### Scenario: Back button fallback

- **WHEN** the user arrives at a page via direct URL (no browser history) and clicks the back button
- **THEN** the system SHALL navigate to `backHref` rather than calling `router.back()`

### Requirement: Slot default fallback

Every route segment directory inside a Parallel Routes slot SHALL contain a `default.tsx` file that renders `null`. This prevents Next.js from returning a 404 when a hard refresh URL does not match a slot's active segment.

#### Scenario: Hard refresh on non-active slot route

- **WHEN** the user hard-refreshes while on `/team/abc`
- **THEN** the Home, Notifications, and User slots SHALL render their `default.tsx` (null) without error
- **THEN** the Team slot SHALL render the matched route (`/team/abc`)
