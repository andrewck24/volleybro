## 1. Error Class Hierarchy Foundation (Domain Layer)

> Implements: error class hierarchy location, error field structure, seven error subclasses design decisions

- [x] [P] 1.1 Write tests for AppError class hierarchy — constructor with/without internalMessage, instanceof chain, all seven subclasses with correct fixed properties (code, httpStatus, isTransient), AppErrorCode type union (entities layer)
- [x] [P] 1.2 Write tests for ValidationError with details field — with Zod issues, without details (entities layer)
- [x] [P] 1.3 Write tests for UnexpectedError with originalError field (entities layer)
- [x] [P] 1.4 Write tests for TransientError with source metadata — source, retryable options (entities layer)
- [x] 1.5 Implement AppError abstract base class and seven concrete subclasses in `src/entities/errors/app-error.ts` — ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError, TransientError, UnexpectedError (entities layer)
- [x] 1.6 Define `AppErrorCode` type union in `src/entities/errors/app-error.ts` (entities layer)
- [x] 1.7 Create domain-scoped reason enums files following naming convention — `src/entities/errors/reasons/common.ts` (CommonReason with shared values), plus placeholder files for `player.ts`, `record.ts`, `profile.ts`, `auth.ts` (entities layer)
- [x] 1.8 Create barrel export `src/entities/errors/index.ts`
- [x] 1.9 Run `npm test` — all new and existing tests pass

## 2. Route Wrappers (Route Handler Layer)

> Implements: `withErrorHandler` and `withAuth` wrappers, observability impact and structured logging design decisions

- [x] 2.1 Write tests for withErrorHandler route wrapper and HTTP error response format — AppError serialized to structured response (code, reason, detail, no message leakage), ZodError converted to ValidationError, unknown error wrapped as UnexpectedError (route layer)
- [x] 2.2 Write tests for structured error logging — operational error produces warn-level JSON log via console.error, unexpected error produces error-level log with stack trace (route layer)
- [x] 2.3 Write tests for withAuth route wrapper — authenticated request passes userId, unauthenticated request returns 401 (route layer)
- [x] 2.4 Implement `withErrorHandler` in `src/lib/api/wrappers.ts` — try/catch, AppError→JSON serialization, ZodError conversion, UnexpectedError wrapping, structured error logging (route layer)
- [x] 2.5 Implement `withAuth` in `src/lib/api/wrappers.ts` — session validation via Better Auth, AuthenticationError throw, userId context passing (route layer)
- [x] 2.6 Run `npm test` — all new and existing tests pass

## 3. Proxy API Authentication Gate (Edge Runtime)

> Implements: proxy authentication gate design decision

- [x] 3.1 Write tests for proxy API authentication gate — unauthenticated API request blocked, auth routes excluded, authenticated request passes through (edge layer)
- [x] 3.2 Extend `src/proxy.ts` to return 401 JSON for unauthenticated API requests (except `/api/auth/*`) (edge layer)
- [x] 3.3 Run `npm test && npm run build` — verify proxy changes

## 4. Infrastructure Error Translation (Infrastructure Layer)

> Implements: infrastructure error translation design decision

- [x] 4.1 Write tests for repository error translation — Mongoose CastError→NotFoundError, MongoServerError 11000→ConflictError, connection error→TransientError with database source, unknown error→UnexpectedError (infrastructure layer)
- [x] 4.2 Write tests for AuthenticationService error translation — invalid session→AuthenticationError, user not found→AuthenticationError (infrastructure layer)
- [x] 4.3 Write tests for AuthorizationService error translation — insufficient role→AuthorizationError, not team member→AuthorizationError (infrastructure layer)
- [x] 4.4 Implement error translation in base repository or per-repository catch blocks — only AppError subclasses shall be thrown from repositories (infrastructure layer)
- [x] 4.5 Update `AuthenticationService.verifySession()` to throw `AuthenticationError` instead of generic Error (infrastructure layer)
- [x] 4.6 Update `AuthorizationService` methods to throw `AuthorizationError` instead of generic Error, populate AuthReason enum values (infrastructure layer)
- [x] 4.7 Run `npm test` — all new and existing tests pass

## 5. Use Case Migration — Player Domain (Application Layer)

> Follows migration strategy: domain-by-domain migration with build verification

- [x] 5.1 Analyze all error paths in player domain use cases, define `PlayerReason` enum values in `src/entities/errors/reasons/player.ts`
- [x] 5.2 Update tests for player use cases — assert on AppError subclasses instead of generic Error messages
- [x] 5.3 Migrate `CreateInvitationUseCase` to throw typed AppError (only AppError subclasses shall be thrown)
- [x] 5.4 Migrate `AcceptInvitationUseCase`, `RejectInvitationUseCase`, `CancelInvitationUseCase` to throw typed AppError
- [x] 5.5 Migrate `CreatePlayerUseCase`, `RemovePlayerUseCase`, `UpdatePlayerInfoUseCase`, `UpdateRoleUseCase` to throw typed AppError
- [x] 5.6 Migrate `LeaveTeamUseCase`, `TransferOwnershipUseCase` to throw typed AppError
- [x] 5.7 Run `npm test` — all player domain tests pass

## 6. Use Case Migration — User/Profile Domain (Application Layer)

> Implements: throw-only pattern (no Result type as default) design decision; removes Result type definition, mixed error handling pattern, and pilot scope limitation requirements from the existing error-handling spec

- [x] 6.1 Analyze all error paths in user/profile use cases, define `ProfileReason` enum values in `src/entities/errors/reasons/profile.ts`
- [x] 6.2 Update `CreateProfileUseCase` — remove mixed error handling pattern (Result return), switch to throw-only
- [x] 6.3 Update `LinkPendingInvitationsUseCase` — remove Result return pattern, switch to throw-only (removes pilot scope limitation)
- [x] 6.4 Update `src/lib/auth-hook.ts` — replace `result.ok` checks with try/catch (auth hook Result dependency migration)
- [x] 6.5 Update tests for auth hook and profile use cases
- [x] 6.6 Verify `SearchUserUseCase` and `GetUserByIdUseCase` already throw AppError correctly, update if needed
- [x] 6.7 Run `npm test` — all user/profile domain tests pass

## 7. Use Case Migration — Team Domain (Application Layer)

- [x] 7.1 Analyze all error paths in team domain use cases, update `CommonReason` or create `TeamReason` if needed
- [x] 7.2 Update tests for team use cases
- [x] 7.3 Migrate `CreateTeamUseCase` to throw typed AppError
- [x] 7.4 Run `npm test` — all team domain tests pass

## 8. Use Case Migration — Record Domain (Application Layer)

- [x] 8.1 Analyze all error paths in record domain use cases (rally, set, substitution), define `RecordReason` enum values in `src/entities/errors/reasons/record.ts`
- [x] 8.2 Update tests for record use cases
- [x] 8.3 Migrate rally, set, and substitution use cases to throw typed AppError
- [x] 8.4 Run `npm test` — all record domain tests pass

## 9. Route Migration (Route Handler Layer)

- [x] [P] 9.1 Migrate player API routes (`/api/players/*`, `/api/teams/*/players`) — replace manual catch blocks with `withAuth`/`withErrorHandler` wrappers
- [x] [P] 9.2 Migrate user/profile API routes (`/api/users`, `/api/profiles`) — replace manual catch blocks with wrappers
- [x] [P] 9.3 Migrate team API routes (`/api/teams/*`) — replace manual catch blocks with wrappers
- [x] [P] 9.4 Migrate record API routes (`/api/records/*`, `/api/matches`) — replace manual catch blocks with wrappers (currently all return 500)
- [x] 9.5 Run `npm test && npm run build` — all route tests pass, build succeeds

## 10. API Client and Frontend Error Consumption (Presentation Layer)

> Implements: frontend error consumption, HTTP error response format (client-side) design decisions

- [x] 10.1 Implement `parseApiError` in `src/lib/api/parse-api-error.ts` — extract `{ code, reason, detail, details, status }` from Response
- [x] 10.2 Implement `apiClient` in `src/lib/api/api-client.ts` — wrap fetch, throw structured error on non-OK responses (API client and frontend error consumption)
- [x] 10.3 Update SWR fetcher in `src/hooks/use-data.ts` to use `apiClient` — SWR hooks receive structured error
- [x] 10.4 Update component manual fetch calls to use `apiClient` — replace raw `fetch` + `if (!res.ok)` patterns
- [x] 10.5 Update component error handling — switch on `error.code`/`error.reason` for zh-TW toast messages, use `error.detail` as fallback
- [x] 10.6 Run `npm test && npm run build` — all frontend tests pass

## 11. Legacy Cleanup

- [x] 11.1 Delete `src/lib/errors/` directory (legacy ApiError, handleApiError, withErrorHandler)
- [x] 11.2 Delete `src/applications/errors/` directory (old AppError location, moved to entities per error class hierarchy location decision)
- [x] 11.3 Delete `src/applications/types/result.ts` if no remaining references, or mark as deprecated (Result type definition removal)
- [x] 11.4 Update all imports across codebase to use `src/entities/errors/`
- [x] 11.5 Run `npm test && npm run lint && npm run build` — full verification, no regressions

## 12. Final Verification

- [x] 12.1 Run `npm test` — all tests pass
- [x] 12.2 Run `npm run lint` — no new lint errors
- [x] 12.3 Run `npm run build` — build succeeds
- [ ] 12.4 Manual smoke test: trigger each error category (401, 403, 404, 409, 500) and verify structured JSON response
- [ ] 12.5 Manual smoke test: verify frontend toast displays correct zh-TW message for known reasons and falls back to detail for unknown reasons
