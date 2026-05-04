## Context

The app uses SWR for all GET data fetching and `apiClient` for mutations (POST/PATCH/DELETE). When `withAuth` returns 401 (session expired but cookie still present), `ApiClientError` with `status: 401` propagates to:
- SWR hooks → surfaced as `error` on each hook, no uniform handler
- Mutation catch blocks → delegated to `showErrorToast`, which treats 401 as an operational 4xx and shows `error.detail` in English

The `<Toaster>` lives in the root server layout (`src/app/layout.tsx`) and uses a module-level singleton state (`memoryState` in `use-toast.ts`), so toasts fired before a client-side navigation remain visible.

SWR's `onError` callback runs outside React component context, which means `useRouter()` is not directly available there.

## Goals / Non-Goals

**Goals:**
- All SWR 401 errors trigger a session-expiry toast and redirect to `/auth/sign-in`
- All mutation 401 errors trigger the same toast and redirect
- Single implementation point — no per-component 401 handling required
- Zero changes to existing UI components

**Non-Goals:**
- Handling 401 on the proxy/server side (already implemented in `src/proxy.ts`)
- Retry or token-refresh logic — redirect only
- Distinguishing between cookie-absent 401 (proxy blocks before API) and session-invalid 401 (withAuth returns 401)

## Decisions

### apiClient fires a custom DOM event on 401

**Decision**: In `src/lib/api/api-client.ts`, before throwing `ApiClientError`, check if `res.status === 401` and if `typeof window !== 'undefined'`, then dispatch `new CustomEvent('api:unauthorized')`. The throw still happens immediately after.

**Why**: This decouples 401 signalling from component responsibility. Every caller of `apiClient` — SWR fetcher and mutation handlers alike — gets the event for free without any per-call handling. Server-side calls (if any) are guarded by the `typeof window` check.

**Alternative rejected**: Per-component `useRouter` + explicit 401 check before `showErrorToast`. Blast radius: 11 components currently, grows with every new mutation. Each new component requires remembering to add the pattern. Violates SRP — UI components should not contain authentication redirect logic.

### SWRProvider listens for the custom event to handle redirect

**Decision**: `src/components/layout/swr-provider.tsx` adds a `useEffect` that registers a `window` event listener for `'api:unauthorized'`. The listener calls `handle401Redirect(router, toast)`. The `SWRConfig` `onError` delegates to `showErrorToast` only (which early-returns for 401 via its existing guard, preventing double-toast).

**Why**: `SWRProvider` already holds `useRouter()` and `useToast()` for the SWR `onError`. Reusing it as the event handler requires no new component or provider. The event listener pattern is the standard browser mechanism for cross-boundary signalling without prop drilling.

**Alternative rejected**: Putting the event listener in a separate `AuthProvider`. Adds an extra component layer with no benefit — `SWRProvider` already exists and has the required hooks.

### Mount SWRProvider in root layout

**Decision**: `<SWRProvider>` wraps `<ReduxProvider>` in `src/app/layout.tsx`, covering all routes including `/game` (outside `/(protected)`). Already implemented.

**Why**: Single mount point. Landing pages do not call authenticated APIs, so the event listener never fires there.

### handle401Redirect utility remains in error-toast.ts

**Decision**: `handle401Redirect(router, toast)` stays exported from `src/lib/api/error-toast.ts`. It is the single place that fires the toast and calls `router.push('/auth/sign-in')`. Only `SWRProvider`'s event listener calls it.

**Why**: Keeps toast + redirect logic co-located with other error display utilities. Single call site means the behaviour is easy to find and modify.

### Toast fires simultaneously with redirect, no delay

**Decision**: `handle401Redirect` calls `toast(...)` and `router.push('/auth/sign-in')` in the same synchronous block.

**Why**: `<Toaster>` is in the root layout, does not unmount during client-side navigation, so the toast remains visible after the route change.

## Risks / Trade-offs

- [Risk] SWR retries on error by default — if retry fires before redirect completes, a second `'api:unauthorized'` event fires → Mitigation: `showErrorToast` skips 401; the redirect is near-instant so the window is negligible. Accept as low-impact.
- [Risk] `window` unavailable in SSR — `apiClient` is called from client components only in this app, but the guard `typeof window !== 'undefined'` ensures safety if ever called server-side.
- [Risk] Event listener not cleaned up → Mitigation: `useEffect` returns a cleanup function that calls `window.removeEventListener`.

## Open Questions

(none)
