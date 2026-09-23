# Coding standards

These are the rules the standards axis of Pre-PR code review applies to a Change's diff. Each is a judgement no tool makes: a rule a tool can check belongs in the tool's configuration, not here. A standard the reviewer should apply but cannot find here does not exist yet — add it here first.

The rules a writer applies while writing live where that writer reads them, and review reaches them through these pointers:

- decision records and Blueprint pages — [`docs/agents/blueprint.md`](./docs/agents/blueprint.md);
- commits and pull requests — [`CONTRIBUTING.md`](./CONTRIBUTING.md). Review cannot apply these: it sees commit subjects only, and the pull request does not exist yet.

## Comments

Default to none. Code that needs a comment to be understood usually needs a better name or a smaller function — the fix is that rewrite, and the comment survives only if the rewrite does not carry the information.

A comment is justified only for what the code cannot say by itself:

- a constraint that is invisible locally — a browser quirk, an ordering requirement, a platform limit;
- why an obvious alternative was rejected, where the next reader would otherwise reintroduce it;
- a consequence that lands somewhere else in the codebase.

A comment never restates what the line does, and never re-argues a decision a decision record already owns. It cites the record instead of copying it, or the two drift apart:

```ts
// Deliberately the same judgement as the indicator's warning tone.
// See ADR-NNNN.
```

What survives stays short. One or two lines is the norm; a doc comment longer than the code it describes means the rationale belongs in a decision record or the commit body, not the file.

## No volatile references in source

Issue IDs and ticket numbers belong in commit trailers and pull-request bodies, never in source, comments included. The tracker may archive or delete an issue; the source outlives it.

## Naming

- Files: `kebab-case` for components, `.usecase.ts` for use cases, `.mongo.ts` for repository implementations.
- Variables and functions: `camelCase`; booleans take an `is`/`has`/`can` prefix; event handlers a `handle` prefix; constants are `UPPER_SNAKE_CASE`.

## Tests

A test sits at the layer [`docs/testing-strategy.md`](./docs/testing-strategy.md) assigns it, mocking only what that layer's school says to mock.
