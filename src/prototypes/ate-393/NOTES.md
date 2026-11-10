# ATE-393 prototype notes

## S01

Baseline variant: `zod-async` uses the production Zod schemas and existing route handlers.
The create-team route test uses the production `CreateTeamUseCase` with in-memory ports and
an `ITransactionRunner` fake. Route-level authorization, validation, and `withErrorHandler`
remain in the real PATCH handler.

## S02

- `zod-async`: uses the route's existing Zod schema; no schema adapter.
- `schema-async`: Effect Schema decode adapter is 1 line; strict unknown-key rejection is
  supplied through `onExcessProperty: "error"`.
- `zod-effect`: Effect program boundary adapter is 1 line around the async callback.
- `schema-effect`: Effect Schema plus Effect program adapters total 2 lines.
- Forced point: the production route still validates using its established Zod schema before
  calling the variant controller path. This preserves ADR-0027 but duplicates validation for
  non-baseline variants. All four retain strict, non-coercing input behavior.
- `schema-async`, `zod-effect`, and `schema-effect`: **BLOCKED** from registration in the Jest
  behavior suite because Jest runs these files as CommonJS and cannot load Effect 4's ESM modules
  without enabling `--experimental-vm-modules` or changing repository Jest runtime configuration.
  Such a config change exceeds the allowed prototype paths; no unsupported substitute was used.

## S03

- `async`: production Zod schema and real PATCH route; route owns authorization and validation.
- `effect`: **BLOCKED** for the same Jest/Effect ESM runtime constraint recorded in S02.
  Production route behavior and the async variant remain covered.

## S04

- `async`: single-flight, injected timer, exponential retry, success removal, failure retention,
  and unknown-outcome retention pass the shared pure-core suite.
- `rtk-listener`: listener middleware drives the same core and passes the same suite.
- `effect`: **BLOCKED** because Jest cannot execute Effect 4 ESM modules under the repository's
  CommonJS test transform. The entry is retained for size inspection, but excluded from the suite.

S04 bundle measurements (Effect 4.1.2, RTK 2.14.0; baseline `async`):

| Variant      | Raw bytes | Gzip bytes | Raw delta | Gzip delta |
| ------------ | --------: | ---------: | --------: | ---------: |
| async        |       562 |        361 |         0 |          0 |
| effect       |    34,644 |     12,234 |   +34,082 |    +11,873 |
| rtk-listener |     6,642 |      3,014 |    +6,080 |     +2,653 |

No gzip delta exceeds 20 KB.
