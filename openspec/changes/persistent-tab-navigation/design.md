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

// useRef: no re-render on update; only home/notifications/user tracked
const tabCurrentRoute = useRef<Record<Exclude<Tab, "team">, string>>({
  home: "/home",
  notifications: "/notifications",
  user: "/user",
});

useEffect(() => {
  if (activeTab !== "team") {
    tabCurrentRoute.current[activeTab] = pathname;
  }
  // scroll restore handled here too (see View transition section)
}, [activeTab, pathname]);
```

`activeTab` is a **derived value** from `pathname`, not state. `tabCurrentRoute` uses `useRef` instead of `useState` — route tracking is a side-effect that does not need to trigger re-renders.

The team tab does not track sub-routes. `switchTab("team")` always navigates to `/team/${teamId}` (falling back to `/team`) using `useActiveTeamId()`. This avoids stale deep-team URLs when team membership changes.

**Why not derive `activeTab` from a separate local state driven by `switchTab()`:** If `activeTab` is independent of the URL, browser back/forward bypasses `switchTab()` entirely, causing `activeTab` and `pathname` to diverge. The URL-derived approach eliminates this class of desync.

### Scroll position restoration

`scrollPositions` is a `useRef<Record<Exclude<Tab, "team">, number>>` tracking the last `window.scrollY` for each non-team tab. Before calling `router.replace`, `switchTab` saves the current scroll position. After the pathname `useEffect` confirms the tab switch, a double-rAF (`requestAnimationFrame` × 2) restores `window.scrollTo({ top: targetY, behavior: "auto" })`. Two frames are needed because `router.replace({ scroll: false })` requires two animation frames for DOM layout to settle before scroll coordinates are accurate.

### Responsive nav: unified NavigationBar

A single `<NavigationBar>` component (`src/components/layout/nav/index.tsx`) handles both mobile and desktop via responsive Tailwind classes — no separate `BottomNav` / `SideNav` components.

- **Mobile (`< md`)**: fixed floating pill at the bottom of the screen; `pb-[max(env(safe-area-inset-bottom),0.5rem)]` for iOS safe area
- **Desktop (`≥ md`)**: fixed left column (w-16), full viewport height, icon-only, no collapse

**Why remove collapsible sidenav:** The collapse feature added state complexity (localStorage read on mount, CSS width transition, toggle button) without meaningful UX benefit given the icon-only mobile layout is already familiar. The Threads-style fixed-width icon column is simpler and visually consistent across breakpoints.

**Why a single component:** Eliminates duplicate nav item definitions and shared prop drilling. Responsive classes handle layout differences; `NavButton` appearance adapts via the same class set.

### View transition animation

Tab switching wraps the `activeTab` state update in `document.startViewTransition()`:

```ts
const direction = newTab > activeTab ? "forward" : "backward";
document.documentElement.dataset.direction = direction;
const navigate = () => router.replace(tabCurrentRoute[newTab], { scroll: false });
document.startViewTransition?.(navigate) ?? navigate();
```

`activeTab` updates automatically via the `useEffect([pathname])` after `router.replace` changes the URL. It is not set directly inside `switchTab()`.

CSS targets `view-transition-name: tab-content` on the slot container:

- `forward`: old slides left, new slides in from right
- `backward`: old slides right, new slides in from left

Animation duration: 300ms ease. Fallback (no View Transitions API support): instant switch, no animation.

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
