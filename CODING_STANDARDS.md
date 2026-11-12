# Coding standards

These are the rules the standards axis of Pre-PR code review applies to a Change's diff. Each is a judgement no tool makes: a rule a tool can check belongs in the tool's configuration, not here. A standard the reviewer should apply but cannot find here does not exist yet — add it here first.

The rules a writer applies while writing live where that writer reads them, and review reaches them through these pointers:

- decision records and Blueprint pages — [`docs/agents/blueprint.md`](./docs/agents/blueprint.md);
- commits and pull requests — [`CONTRIBUTING.md`](./CONTRIBUTING.md). Review cannot apply these: it sees commit subjects only, and the pull request does not exist yet.

## Comments

New code carries no comments, doc comments included. A comment is a claim nothing checks, so what it would say goes where the compiler, a test or the tracker holds it:

- **A rule about a value** becomes a type. A string that must already be normalized is a branded `NormalizedEmail`, not a parameter named `normalizedEmail`.
- **The reason for a branch** becomes a guard clause on a named predicate: `if (!isSeatHeldByInvitation(seat)) return alreadyOnRoster();`.
- **The meaning of a number** becomes a named constant, exported once and imported wherever that number appears.
- **An invisible constraint** (an ordering requirement, a platform limit, a browser quirk) becomes a test whose name states the constraint, so removing it fails the suite.
- **Why an alternative was rejected** goes in a decision record when it meets the record threshold, otherwise in the commit body. Source does not cite either.
- **Work left undone** becomes a Linear issue, linked from the pull request body. Source carries no TODO, FIXME, HACK or XXX marker.
- **A lint rule that does not fit** is answered by removing the reason: a Testing Library query instead of node access, a generic instead of `any`, a stable dependency instead of an empty array. Only when the rule cannot apply to a file without weakening what it proves, turn the rule off for that file in `eslint.config.js`, in a list whose name says why.

In JavaScript and TypeScript files ESLint enforces it: every comment fails the lint, so inline configuration (`eslint-disable` and the like) and `@ts-*` directives cannot be written either. In other files (CSS, MDX, Astro) review enforces it.

### Existing comments

Files that still held comments when the rule arrived are listed in `filesStillCarryingComments` in `eslint.config.js`. The list only shrinks: a change that clears a file removes it from the list, and no change adds a file to it. Inside a listed file a comment in a hunk the diff modifies is replaced as above in the same change, and review rejects every comment line a diff adds. Other comments in a touched file may be cleared in a separate `refactor:` commit of the same pull request, never mixed into a behaviour change.

## No volatile references in source

Issue IDs and ticket numbers belong in commit trailers and pull-request bodies, never in source, comments included. The tracker may archive or delete an issue; the source outlives it.

## Naming

- Files: `kebab-case` for components, `.usecase.ts` for use cases, `.mongo.ts` for repository implementations.
- Variables and functions: `camelCase`; booleans take an `is`/`has`/`can` prefix; event handlers a `handle` prefix; constants are `UPPER_SNAKE_CASE`.

## Tests

A test sits at the layer [`docs/testing-strategy.md`](./docs/testing-strategy.md) assigns it, mocking only what that layer's school says to mock.

The Standards review applies that document's Test Value and Test Support Code rules. Flag duplicate proof, and call-shape assertions (asserting which internal function ran or with what arguments instead of the observable result), against those rules and the layer's testing school.

## Correctness, load, leanness and security

Review checks correctness, behavior under expected load (races, work repeated per caller, unbounded growth), leanness (dead code, unused options, duplicated helpers, code beyond the spec) and security, using `security-review` when available.

### Multi-write and cross-aggregate writes

For a diff that writes more than once, name the persisted state after each of a mid-batch failure, a race and a retry, and cite the test (path and case) proving each outcome. Follow the whole write path, including unmatched operations and error translation that can drop the MongoDB driver's `TransientTransactionError` or `UnknownTransactionCommitResult` labels. For cross-aggregate writes, cite [ADR-0146](./blueprint/content/decisions/0146-cross-aggregate-writes-run-in-one-transaction.json) and check the diff against it.

### Authorization and data ownership

For a diff touching permissions or data ownership, list who may act, whose data is accessed or written, and what happens if identity or role changes after the check. Cite the test (path and case) proving that edge, including delayed or offline work when present.
