## Why

The frontend has no handler for `401 Unauthorized` responses. When a user's session expires mid-session, SWR hooks surface an `ApiClientError` with `status: 401` but no component redirects the user — they remain on a broken page. Mutation failures with 401 are similarly unhandled, showing a generic operational error toast instead of routing the user to sign in.

## What Changes

- A global SWR `onError` handler intercepts `ApiClientError` with `status: 401` across all SWR hooks, showing a session-expiry toast and redirecting to `/auth/sign-in`
- `showErrorToast` gains a 401-specific branch so mutation catch paths produce the same toast before redirect
- A new `SWRProvider` client component encapsulates the global SWR config and mounts in the root layout, covering all routes including `/game`
- The `error-handling` spec gains a new requirement documenting the frontend 401 gate behavior

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `error-handling`: Add requirement for frontend 401 intercept — global SWR `onError` + mutation catch path both produce session-expiry toast and redirect to `/auth/sign-in`

## Impact

- Affected specs: `error-handling`
- Affected code:
  - New: `src/components/layout/swr-provider.tsx`
  - Modified: `src/lib/api/error-toast.ts`
  - Modified: `src/app/layout.tsx`
  - Modified: `openspec/specs/error-handling/spec.md`
