# ATE-393 prototype notes

## S01

Baseline variant: `zod-async` uses the production Zod schemas and existing route handlers.
The create-team route test uses the production `CreateTeamUseCase` with in-memory ports and
an `ITransactionRunner` fake. Route-level authorization, validation, and `withErrorHandler`
remain in the real PATCH handler.

## S02

- `zod-async`: production Zod parse and throw-based `AppError` behavior through the real POST route.
- `schema-async`: Effect Schema strict decode, no coercion; decode adapter cost: 1 line.
- `zod-effect`: Effect `gen` reimplements team, three default lineups, owner ADMIN/JOINED/1, and owner ID write-back; async repository calls and transaction boundary are adapters. Repository adapter cost: 3 lines; transaction adapter: 1 line.
- `schema-effect`: same Effect use case with Effect Schema decode; total schema + repository + transaction adapter cost: 5 lines.
- The four variants register in the shared POST behavior suite. Typecheck, lint, and all tests pass.
- Forced boundary limitation: production POST performs Zod validation before the prototype controller seam. Production files are outside the allowed paths, so the alternate schemas cannot replace the actual route parse; their decode is exercised at the variant boundary. The benchmark invokes empty `execute` callbacks and therefore measures validation/dispatch overhead, not repository work.

S02 benchmark (`node scripts/ate-393/measure.mjs bench`, microseconds):

| Variant       | Create p50 | Create p95 | Update p50 | Update p95 |
| ------------- | ---------: | ---------: | ---------: | ---------: |
| zod-async     |      0.375 |      1.667 |      0.292 |      0.750 |
| schema-async  |      1.041 |      2.708 |      3.125 |      5.083 |
| zod-effect    |      0.333 |      1.083 |      1.083 |      5.417 |
| schema-effect |      0.958 |      1.125 |      3.709 |      5.167 |

## S03

- `async`: production Zod schema and real PATCH route; route owns authorization and validation.
- `effect`: Effect.gen implements the update program; the repository Promise call is adapted with
  `Effect.tryPromise`, with `TeamRepositoryFailure` in the E channel and exhaustive `catchTags`
  mapping to `UnexpectedError`. The route keeps Zod validation and authorization.
- Shared suite runs both variants through PATCH, including permission denial before the controller.
- Adapter cost: effect repository call 1 line; error-to-AppError boundary mapping 8 lines;
  transaction adapter 0 lines (the update use case is one repository write and the route does not
  use `ITransactionRunner`). Async adapter cost: 0 lines. No schema adapter applies in S03.
- Forced boundary limitation: production PATCH route stays Zod-based and owns authorization, so the
  effect variant is exercised through the real route/controller seam while its Effect program is
  supplied the same repository port. Production files remain untouched.

## S04

- `async`: single-flight, injected timer, exponential retry, success removal, failure retention,
  and unknown-outcome retention pass the shared pure-core suite.
- `rtk-listener`: listener middleware drives the same core and passes the same suite.
- `effect`: Effect.gen owns flush, per-scope single-flight, send result handling, removal,
  retention, and Schedule-driven exponential delay (capped at 30 seconds). The send Promise adapter
  maps rejection to `PendingSendFailure` in E; the public Promise runs at the adapter boundary.
- All variants pass the shared suite for concurrent flushes, success removal, per-scope sending,
  exponential retry, failure retention, and unknown-outcome retention. Injected `now` and `schedule`
  ports provide deterministic clock/scheduling; TestClock is not needed.
- Adapter line counts: async repository 0 / route 0 / transaction 0; RTK listener 0 / listener
  boundary 4 / transaction 0; Effect send repository 4 / Promise boundary 7 / transaction 0.
- Forced boundary: `PendingPorts.send` remains Promise-based by the shared contract, so Effect uses
  `Effect.tryPromise` only for that port call; the pending-write business logic is an Effect program.

S04 bundle measurements (Effect 4.1.2, RTK 2.14.0; baseline `async`):

| Variant      | Raw bytes | Gzip bytes | Raw delta | Gzip delta |
| ------------ | --------: | ---------: | --------: | ---------: |
| async        |       562 |        361 |         0 |          0 |
| effect       |    35,833 |     12,560 |   +35,271 |    +12,199 |
| rtk-listener |     6,642 |      3,014 |    +6,080 |     +2,653 |

No gzip delta exceeds 20 KB.
