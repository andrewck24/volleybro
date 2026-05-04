## MODIFIED Requirements

### Requirement: API client and frontend error consumption

The system SHALL provide a unified API client in `src/lib/api/api-client.ts` that wraps `fetch` for all HTTP methods. On non-OK responses, it SHALL parse the response body and throw a structured error object with `code`, `reason`, `detail`, `details` (optional), and `status` fields. When the response status is `401`, the client SHALL dispatch `new CustomEvent('api:unauthorized')` on `window` before throwing, so that a global listener can intercept the event without per-component handling.

The SWR fetcher in `src/hooks/use-data.ts` SHALL use `apiClient` as its fetcher. Manual fetch calls (POST, PATCH, DELETE) in components SHALL also use `apiClient` instead of raw `fetch`.

Components SHALL determine user-facing toast messages by switching on `error.code` and `error.reason`, using component-local zh-TW strings. The `error.detail` (en-US) SHALL serve as a fallback when no matching zh-TW string exists for a given reason.

#### Scenario: apiClient throws structured error on failure

- **WHEN** `apiClient("/api/teams/abc/players", { method: "POST", body })` receives a 409 response with `{ code: "CONFLICT", reason: "ALREADY_INVITED", detail: "This player already has a pending invitation" }`
- **THEN** the thrown error SHALL have `status: 409`, `code: "CONFLICT"`, `reason: "ALREADY_INVITED"`, `detail: "This player already has a pending invitation"`

#### Scenario: SWR hook uses apiClient

- **WHEN** a SWR hook fetches `/api/profiles` and receives a 404 response
- **THEN** the SWR `error` SHALL have `status: 404`, `code: "NOT_FOUND"`, and `reason` fields

#### Scenario: Component displays zh-TW toast with reason-based message

- **WHEN** a component catches an error with `reason: "ALREADY_INVITED"`
- **THEN** it SHALL display the component-local zh-TW string mapped to that reason (e.g., "此球員已有待處理的邀請")

#### Scenario: Component falls back to error.detail

- **WHEN** a component catches an error with a `reason` that has no mapped zh-TW string
- **THEN** it SHALL display `error.detail` as the toast message

---

## ADDED Requirements

### Requirement: Frontend 401 authentication gate

The system SHALL intercept 401 responses from `apiClient` via a DOM custom event mechanism, producing a session-expiry toast and an immediate client-side redirect without requiring per-component handling.

`apiClient` SHALL dispatch `new CustomEvent('api:unauthorized')` on `window` whenever it receives a 401 response, before throwing `ApiClientError`. This SHALL be guarded with `typeof window !== 'undefined'` for SSR safety.

A `SWRProvider` client component SHALL mount in the root layout (`src/app/layout.tsx`) wrapping all routes. It SHALL register a `window` event listener for `'api:unauthorized'` via `useEffect`. The listener SHALL call `handle401Redirect(router, toast)`. The effect cleanup SHALL remove the listener on unmount. The `SWRConfig` `onError` in `SWRProvider` SHALL delegate all errors to `showErrorToast` — the 401 early-return in `showErrorToast` prevents double-toasting.

A `handle401Redirect(router, toast)` utility function SHALL be exported from `src/lib/api/error-toast.ts`. It SHALL show a destructive toast with title `"登入已逾期"` and description `"請重新登入"`, then call `router.push('/auth/sign-in')` in the same synchronous block.

`showErrorToast` SHALL NOT produce a toast for errors with `status === 401` — it SHALL return early, since `handle401Redirect` is responsible for the 401 user experience.

#### Scenario: apiClient dispatches event on 401

- **WHEN** `apiClient` receives a 401 response
- **THEN** `window.dispatchEvent` SHALL be called with a `CustomEvent` whose `type` is `'api:unauthorized'`
- **THEN** `ApiClientError` with `status: 401` SHALL be thrown immediately after

#### Scenario: SWR GET receives 401 — toast and redirect

- **WHEN** a SWR hook's fetcher receives a 401 response
- **THEN** the `'api:unauthorized'` event is dispatched by `apiClient`
- **THEN** `SWRProvider`'s event listener SHALL call `handle401Redirect`
- **THEN** a destructive toast with title `"登入已逾期"` SHALL appear
- **THEN** `router.push('/auth/sign-in')` SHALL be called

#### Scenario: Mutation receives 401 — toast and redirect without component changes

- **WHEN** a component's `apiClient` mutation call receives a 401 response
- **THEN** the `'api:unauthorized'` event is dispatched before the throw
- **THEN** `SWRProvider`'s listener SHALL call `handle401Redirect` — no per-component 401 handling required
- **THEN** the component's catch block receives `ApiClientError` with `status: 401`; `showErrorToast` ignores it silently

#### Scenario: Non-401 error passes through unchanged

- **WHEN** `apiClient` receives a 409 response
- **THEN** the `'api:unauthorized'` event SHALL NOT be dispatched
- **THEN** the thrown `ApiClientError` is handled by existing component-level `showErrorToast` calls

#### Scenario: Landing and public pages unaffected

- **WHEN** a user on the landing page encounters any error
- **THEN** no authenticated API calls are made, so `'api:unauthorized'` is never dispatched and `handle401Redirect` is never called
