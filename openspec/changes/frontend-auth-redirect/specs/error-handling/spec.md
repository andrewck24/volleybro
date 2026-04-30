## MODIFIED Requirements

### Requirement: API client and frontend error consumption

The system SHALL provide a unified API client in `src/lib/api/api-client.ts` that wraps `fetch` for all HTTP methods. On non-OK responses, it SHALL parse the response body and throw a structured error object with `code`, `reason`, `detail`, `details` (optional), and `status` fields.

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

The system SHALL intercept `ApiClientError` instances with `status: 401` at two points — the global SWR error handler and mutation catch paths — and respond with a session-expiry toast followed by an immediate client-side redirect to `/auth/sign-in`.

A `SWRProvider` client component SHALL wrap `<SWRConfig>` with a global `onError` callback. It SHALL be mounted in the root layout so it covers all authenticated routes including those outside the `/(protected)` route group (e.g., `/game`). The `onError` callback SHALL call `handle401Redirect` when the error is an `ApiClientError` with `status: 401`, and SHALL delegate to the existing `showErrorToast` for all other errors.

A `handle401Redirect(router, toast)` utility function SHALL be exported from `src/lib/api/error-toast.ts`. It SHALL show a destructive toast with title `"登入已逾期"` and description `"請重新登入"`, then call `router.push('/auth/sign-in')` in the same synchronous block with no delay.

`showErrorToast` SHALL NOT produce a toast for errors with `status === 401`. Callers on the mutation path SHALL call `handle401Redirect` before calling `showErrorToast`, ensuring the 401 case is handled exclusively by `handle401Redirect`.

#### Scenario: SWR GET receives 401 — toast and redirect

- **WHEN** a SWR hook's fetcher receives a 401 response (session expired, cookie present)
- **THEN** the global `onError` handler SHALL call `handle401Redirect`
- **THEN** a destructive toast with title `"登入已逾期"` SHALL appear
- **THEN** `router.push('/auth/sign-in')` SHALL be called in the same tick
- **THEN** the toast SHALL remain visible after navigation completes (root layout does not unmount)

#### Scenario: Mutation catch path receives 401 — toast and redirect

- **WHEN** a component's mutation catch block receives an `ApiClientError` with `status: 401`
- **THEN** `handle401Redirect` SHALL be called before any other error handling
- **THEN** `showErrorToast` SHALL NOT produce an additional toast for the same error

#### Scenario: Non-401 error passes through unchanged

- **WHEN** the global `onError` handler receives an `ApiClientError` with `status: 409`
- **THEN** the handler SHALL NOT redirect
- **THEN** existing error display logic SHALL apply (component-level toast or error state)

#### Scenario: Landing and public pages unaffected

- **WHEN** a user on the landing page (`/`) encounters any error
- **THEN** the global `onError` handler SHALL NOT fire a 401 redirect (no authenticated API calls are made from public pages)
