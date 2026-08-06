# Delivery Workflow Bridge

VolleyBro is a volleyball team management and match recording PWA. The stack and its Clean Architecture layering are legible from `package.json` and the `src/` tree; current capability knowledge lives in `blueprint/content/features/`.

Read root [`WORKFLOW.md`](WORKFLOW.md) before intake, planning, implementation, review, handoff, or archive work. It is the canonical provider-neutral delivery contract and owns lifecycle sequencing and every human gate. Its repository adapters live in `docs/agents/` (issue-tracker, domain, Blueprint, artifact-lifecycle). This file holds only Codex and Antigravity mechanics and the rules that contract does not carry.

## Gotchas

- Installed Matt Pocock skills and their `skills-lock.json` entries are vendor-managed. Never edit them to encode VolleyBro policy — that belongs in `docs/agents/`.
- A tool-specific artifact system is never a second lifecycle authority.
- **Judgment-type deletions need confirmation first.** When knip, a dead-code audit, or your own analysis flags files for deletion beyond the requested scope, list the candidates with per-file rationale and wait. "Unreferenced in the import graph" is not evidence on its own — a file may be a documented API contract (see `design-tokens.ts`), an alias of a live database collection, or reserved for planned work.

## Writing

- `CONTRIBUTING.md` owns the commit format. Two rules it does not state: the body explains **why** ("what" is supporting context), and a tooling name (`spectra`, `openspec`) is never the type or scope.
- Reference other changes by kebab-case slug (`` `type-decoupling` change ``), never by letter label.
- Never hard-wrap prose you write or edit, in Markdown or in PR bodies. Nothing reflows it for you — `MD013` is off and Prettier leaves prose alone (`proseWrap` defaults to `preserve`) — so manual breaks survive and turn every later edit into a reflow diff. Docs predating this rule are still wrapped: match the file's existing width when editing one, and never reflow it wholesale as a side effect.

## Pull requests

[`WORKFLOW.md`](WORKFLOW.md) §5 owns the pre-PR gate. Work through it rather than a summary of it: review runs on the branch and repeats until both axes reach a fixed point, and developer acceptance plus the Archive commit both precede `gh pr create`.

Once the PR is open, CI is the only check to wait for. The automated review workflow was deleted in `6563e077`; the surviving `claude.yml` fires only on an explicit `@claude` mention, so no review arrives unprompted. Human comments are optional and the default merge path does not wait for them; if feedback does change durable knowledge, update the archived Blueprint Change and promoted authorities before merge.

See also: [`docs/testing-strategy.md`](docs/testing-strategy.md) for what to test at which layer, [`docs/maintenance-policy.md`](docs/maintenance-policy.md) for dependency and deprecation policy, [`docs/design-system.md`](docs/design-system.md) for colour and elevation tokens.
