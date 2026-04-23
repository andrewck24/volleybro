## Context

The current `(protected)` layout renders a single `{children}` slot with a `<Nav>` component using `<Link>` tags. Every tab switch triggers a full route change, unmounting the previous tab's component tree and resetting all state. This is standard Next.js App Router behavior but delivers a poor mobile UX.

The goal is to make VolleyBro behave like a native mobile app: each tab maintains its own navigation position and scroll state independently.

## Goals / Non-Goals

**Goals:**

- All four tabs (Home, Team, Notifications, User) remain mounted simultaneously
- Tab switching is instant with no data refetch or scroll reset
- URL reflects the current tab's active route at all times
- Directional slide animation on tab switch (left/right based on tab index order)
- Desktop (≥ md) shows a collapsible sidenav; mobile (< md) shows a bottom nav
- Nav is always visible regardless of route depth

**Non-Goals:**

- Per-tab browser history stack
- Swipe-back gesture interception
- Redux-managed routing
- Lineup page overlay (deferred to `lineup-overlay` change)
- SEO optimization for inner tab routes

## Decisions

### Parallel Routes as the tab container

Use Next.js Parallel Routes (`@home`, `@team`, `@notifications`, `@user` slots) in `src/app/(protected)/layout.tsx`. All four slots render simultaneously. The `(protected)` layout becomes a server component that passes all slots as props.

**Why over CSS-only single-slot approach:** A single `{children}` slot can only hold one route at a time. Parallel Routes is the correct Next.js primitive for mounting multiple independent route trees simultaneously.

**Why not a client-side tab container outside Next.js routing:** Would require abandoning file-based routing and SSR for all tab pages.

All deep routes (`/team/[teamId]/players/...`, `/user/invitations`) live inside their respective slot directory so navigating deep does not exit the parallel layout and unmount sibling tabs.

### CSS visibility toggle for active tab

The layout client component tracks `activeTab` state. Each slot wrapper gets `className={activeTab === tab ? "block" : "hidden"}`. Tailwind `hidden` maps to `display: none`.

**Why not `visibility: hidden` or `opacity: 0`:** `display: none` removes the element from layout flow, preventing hidden tabs from affecting page height or scroll. Component stays mounted (preserving state); only layout participation is removed.

**Why not `React.lazy` / dynamic import with `keepMounted`:** No such API in React. The Parallel Routes approach achieves keep-mounted at the routing level.

### NavLinks as tab-toggle buttons with `router.replace`

`src/components/layout/nav/links.tsx` is refactored from `<Link href="...">` elements to buttons that call `router.replace(tabCurrentRoute[tab], { scroll: false })`.

`activeTab` is **not** set directly in `switchTab()`. It is derived from the resulting pathname change via the `useEffect` in `tab-container.tsx`. This ensures `activeTab` is always consistent with the URL regardless of how the navigation originated.

**Why `router.replace` over `router.push`:** Tab switching must not stack history entries. `replace` keeps the history stack clean so browser back navigates within the current tab's stack, not between tabs.

`router.replace` is called with `{ scroll: false }` to prevent Next.js from resetting the scroll position on tab switch. Without this, even though the DOM is kept mounted, the viewport scroll would reset to the top on every tab switch.

### Per-tab current route tracking

URL is the single source of truth. `usePathname()` is called once at the top of `tab-container.tsx`, and **both `activeTab` and `tabCurrentRoute` are derived from it** — not the other way around.

```ts
const pathname = usePathname();
const activeTab = resolveTabFromPath(pathname); // derived — not state

function resolveTabFromPath(path: string): Tab {
  if (path.startsWith("/team")) return "team";
  if (path.startsWith("/notifications")) return "notifications";
  if (path.startsWith("/user")) return "user";
  return "home";
}

// useRef: no re-render on update; all four tabs tracked uniformly
const tabCurrentRoute = useRef<Record<Tab, string>>({
  home: "/home",
  team: "/team",
  notifications: "/notifications",
  user: "/user",
});

useEffect(() => {
  tabCurrentRoute.current[activeTab] = pathname;
  // scroll restore handled here too (see View transition section)
}, [activeTab, pathname]);
```

`activeTab` is a **derived value** from `pathname`, not state. `tabCurrentRoute` uses `useRef` instead of `useState` — route tracking is a side-effect that does not need to trigger re-renders.

All four tabs including `team` are tracked uniformly. `switchTab("team")` navigates to `tabCurrentRoute.current["team"]` just like any other tab.

`tabCurrentRoute.current["team"]` is initialized to `"/team"` because `useActiveTeamId()` resolves asynchronously via SWR — `teamId` is `undefined` at mount time. A dedicated `useEffect([teamId])` sets the correct initial value once `teamId` resolves, but only if the route is still the bare `"/team"` fallback (i.e. the user has not yet navigated within the team tab):

```ts
useEffect(() => {
  if (teamId && tabCurrentRoute.current["team"] === "/team") {
    tabCurrentRoute.current["team"] = `/team/${teamId}`;
  }
}, [teamId]);
```

After this one-time initialization, `useEffect([pathname])` takes over and tracks the team tab's sub-route unconditionally.

Team switching (PATCH `activeTeamId` + navigate) is handled entirely in the team tab Header component. The handler calls `router.replace("/team/${newTeamId}")` directly after the API call succeeds. This pathname change flows into `tab-container.tsx` via `usePathname()`, updating `tabCurrentRoute.current["team"]` to the new team root through the existing `useEffect([pathname])`. No special logic in the tab container is needed beyond retaining `useActiveTeamId` for the initial route seed.

**Why not derive `activeTab` from a separate local state driven by `switchTab()`:** If `activeTab` is independent of the URL, browser back/forward bypasses `switchTab()` entirely, causing `activeTab` and `pathname` to diverge. The URL-derived approach eliminates this class of desync.

### Scroll position restoration (per-pathname)

Scroll positions are keyed by **pathname**, not by tab. This unifies tab-switch scroll, parent→child navigation, and child→parent back navigation under one mechanism.

```ts
const scrollPositions = useRef<Record<string, number>>({});
const prevPathRef = useRef<string>(pathname);
```

**Tab switch (handled synchronously in `switchTab`):**

```ts
// Save current pathname's scroll before the URL changes
scrollPositions.current[pathname] = window.scrollY;
const route = tabCurrentRoute.current[newTab];
const targetY = scrollPositions.current[route] ?? 0;

const transition = document.startViewTransition(() => {
  flushSync(() => setPendingTab(newTab));
  // DOM is committed; new document height reflects the new tab
  window.scrollTo({ top: targetY, behavior: "instant" });
  return router.replace(route, { scroll: false });
});
```

`scrollTo` must run **after** `flushSync` (new tab is `display: block`, old tab is `display: none`) and **before** `router.replace` so the view transition's new-state snapshot captures the correct scroll position. Calling `scrollTo` inside the `flushSync` callback runs it against the pre-commit DOM and may be clamped by the old layout.

**Sub-path navigation within the same tab (handled in `useEffect([pathname])`):**

```ts
useEffect(() => {
  const prev = prevPathRef.current;
  if (prev === pathname) return;
  prevPathRef.current = pathname;

  if (resolveTabFromPath(prev) !== resolveTabFromPath(pathname)) return; // tab switch, already handled

  scrollPositions.current[prev] = window.scrollY;
  window.scrollTo({
    top: scrollPositions.current[pathname] ?? 0,
    behavior: "instant",
  });
}, [pathname]);
```

In Next.js parallel routes, sub-path navigations within a slot do not unmount the tab container; `window.scrollY` is preserved across the transition. The effect fires after the new pathname is committed, at which point:

- The previous pathname's scroll is captured (it has not yet been overwritten by anything)
- If the new pathname has a saved value → restore it (child→parent back)
- Otherwise → `scrollTo(0)` (parent→child forward)

**Why per-pathname rather than per-tab:** A per-tab map cannot distinguish between `/team/abc` and `/team/abc/players/xyz` — both belong to the Team tab. A per-pathname map naturally supports the hierarchy.

### Tap-active-tab to reset

`NavigationBar`'s tab button handler detects `newTab === activeTab` and resets the tab to its root instead of no-oping:

```ts
if (newTab === activeTab) {
  const root = newTab === "team" && teamId ? `/team/${teamId}` : `/${newTab}`;
  tabCurrentRoute.current[newTab] = root;
  // Clear saved scroll for all paths belonging to this tab
  for (const key of Object.keys(scrollPositions.current)) {
    if (resolveTabFromPath(key) === newTab) delete scrollPositions.current[key];
  }
  if (pathname === root) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    router.replace(root, { scroll: false });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  return;
}
```

Clearing the tab's saved scroll positions prevents stale restore values after the reset; the next parent→child navigation starts fresh.

**Why `smooth` only when already at root:** When the tab is already showing its root route, tapping the tab should produce a visible scroll-to-top animation (native iOS tab behavior). When the tab is deep, the user expects an instant reset of both route and scroll.

### Responsive nav: unified NavigationBar

A single `<NavigationBar>` component (`src/components/layout/nav/index.tsx`) handles both mobile and desktop via responsive Tailwind classes — no separate `BottomNav` / `SideNav` components.

- **Mobile (`< md`)**: fixed floating pill at the bottom of the screen; `pb-[max(env(safe-area-inset-bottom),0.5rem)]` for iOS safe area
- **Desktop (`≥ md`)**: fixed left column (w-16), full viewport height, icon-only, no collapse

**Why remove collapsible sidenav:** The collapse feature added state complexity (localStorage read on mount, CSS width transition, toggle button) without meaningful UX benefit given the icon-only mobile layout is already familiar. The Threads-style fixed-width icon column is simpler and visually consistent across breakpoints.

**Why a single component:** Eliminates duplicate nav item definitions and shared prop drilling. Responsive classes handle layout differences; `NavButton` appearance adapts via the same class set.

### View transition animation

Tab switching wraps the `activeTab` state update in `document.startViewTransition()`. To prevent the activeTab from briefly reverting between `transition.finished` and the pathname update (observed in Chrome), the transition target is tracked in `pendingTab` state, set synchronously via `flushSync` inside the transition callback.

```ts
const direction = newTab > activeTab ? "forward" : "backward";
document.documentElement.dataset.direction = direction;
const transition = document.startViewTransition(() => {
  flushSync(() => setPendingTab(newTab));
  window.scrollTo({ top: targetY, behavior: "instant" });
  return router.replace(route, { scroll: false });
});
transition.finished.then(() => {
  if (currentPathTabRef.current === newTab) clearPendingTab(newTab);
});
```

`pendingTab` is cleared only when both the animation finishes AND the pathname-derived tab matches — preventing a one-frame `activeTab` revert if either signal lags.

CSS targets `view-transition-name: tab-content` on the slot container:

- `forward`: old slides left, new slides in from right
- `backward`: old slides right, new slides in from left

Animation duration: 300ms ease.

**Animation restricted to standalone PWA.** Directional slide rules live inside `@media (display-mode: standalone) and (width < 768px)`. Outside standalone PWA (desktop Chrome, mobile browser tabs), the `::view-transition-group`, `::view-transition-old`, and `::view-transition-new` for `tab-content` are all set to `animation: none`. This avoids two Chrome-specific visual issues:

1. A flash of the old tab's content after the 300ms slide completes (caused by Chrome resolving `transition.finished` before Next.js pathname propagation).
2. A "phantom scroll" effect where `::view-transition-group(tab-content)` interpolates the element's viewport position from the old scroll offset to the new scroll offset, producing an unwanted sliding motion during tab switches with different scroll positions. Setting `animation: none` on the group (not just old/new) is required because the group has its own default position/size interpolation animation that is independent of the cross-fade.

Fallback (no View Transitions API support): instant switch, no animation.

### Per-page Header

The shared layout no longer renders a `<Header>`. Each `page.tsx` renders `<Header>` directly with page-specific content. A shared `src/components/layout/header.tsx` shell provides consistent height, padding, backdrop-blur, and z-index.

`<Header>` accepts:

- `title?: string` — renders a centered or left-aligned text title
- `backHref?: string` — renders a back button (chevron-left icon) that calls `router.back()` or navigates to `backHref` if no history entry exists
- `children?: ReactNode` — overrides title for custom content (e.g., team switcher drawer trigger)

`generateMetadata` / `metadata` in each `page.tsx` sets the document title independently.

### `default.tsx` for each slot segment

Every route segment directory inside a slot (`@team/team/`, `@team/team/[teamId]/`, etc.) requires a `default.tsx` that renders `null`. This prevents Next.js from throwing a 404 when a hard refresh hits a URL that doesn't match the slot's current segment.

## Risks / Trade-offs

- **Memory usage ~4x** — All four tab trees mounted simultaneously. Acceptable given page complexity; monitor if heavy list pages are added later.
- **SWR background refetch in hidden tabs** — SWR's `refreshWhenHidden: false` (default) prevents polling in hidden tabs. Verify this default is not overridden anywhere.
- **View Transitions not supported on iOS < 18** — Fallback is instant switch; no functional regression.
- **`default.tsx` boilerplate** — Every slot segment needs one. Easy to forget when adding new routes inside slots; causes 404 on hard refresh if missing.
- **Tab route tracking via single `usePathname`** — `tabCurrentRoute` is updated by a single `useEffect` in `tab-container.tsx` keyed on `[pathname, activeTab]`. This correctly isolates updates to the active tab only. The trade-off is that route tracking relies on URL changes; programmatic navigations that don't change the URL (rare in this app) would not be reflected.
