# Skill adapters

Most skills in `.agents/skills/` are vendored and written for any repository; an adapter in this directory says how VolleyBro applies one. `pnpm check:workflow` fails when an installed skill has no row, a row names a missing file, or a row outlives its skill.

| Skill                           | Adapters                                                                                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ask-matt`                      | `docs/agents/domain.md`, `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`                                                                  |
| `code-review`                   | `docs/agents/issue-tracker.md`, `docs/agents/artifact-lifecycle.md`, `docs/agents/test-audit.md`                                                         |
| `codebase-design`               | `docs/agents/domain.md`                                                                                                                                  |
| `diagnosing-bugs`               | `docs/agents/domain.md`, `docs/agents/test-audit.md`                                                                                                     |
| `domain-modeling`               | `docs/agents/domain.md`                                                                                                                                  |
| `grill-me`                      | no adapter                                                                                                                                               |
| `grill-with-docs`               | `docs/agents/domain.md`                                                                                                                                  |
| `grilling`                      | no adapter                                                                                                                                               |
| `handoff`                       | `docs/agents/domain.md`                                                                                                                                  |
| `impeccable`                    | no adapter                                                                                                                                               |
| `implement`                     | `docs/agents/issue-tracker.md`, `docs/agents/artifact-lifecycle.md`                                                                                      |
| `implement-spec`                | `docs/agents/issue-tracker.md`                                                                                                                           |
| `improve-codebase-architecture` | `docs/agents/domain.md`                                                                                                                                  |
| `plan-spec`                     | `docs/agents/domain.md`, `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, `docs/agents/artifact-lifecycle.md`, `docs/agents/blueprint.md` |
| `plan-tickets`                  | `docs/agents/domain.md`, `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, `docs/agents/artifact-lifecycle.md`                             |
| `ponytail`                      | no adapter                                                                                                                                               |
| `ponytail-review`               | no adapter                                                                                                                                               |
| `pr`                            | `WORKFLOW.md`, `docs/agents/domain.md`, `docs/agents/artifact-lifecycle.md`                                                                              |
| `pre-pr-review`                 | `docs/agents/issue-tracker.md`, `docs/agents/artifact-lifecycle.md`, `docs/agents/test-audit.md`                                                         |
| `prototype`                     | no adapter                                                                                                                                               |
| `research`                      | `docs/agents/artifact-lifecycle.md`                                                                                                                      |
| `retro`                         | no adapter                                                                                                                                               |
| `setup-matt-pocock-skills`      | `docs/agents/domain.md`, `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`                                                                  |
| `tdd`                           | `docs/agents/domain.md`, `docs/agents/test-audit.md`                                                                                                     |
| `teach`                         | `docs/agents/domain.md`                                                                                                                                  |
| `test-audit`                    | `docs/agents/test-audit.md`                                                                                                                              |
| `to-questionnaire`              | `docs/agents/artifact-lifecycle.md`                                                                                                                      |
| `to-spec`                       | `docs/agents/domain.md`, `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, `docs/agents/artifact-lifecycle.md`, `docs/agents/blueprint.md` |
| `to-tickets`                    | `docs/agents/domain.md`, `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, `docs/agents/artifact-lifecycle.md`                             |
| `triage`                        | `docs/agents/domain.md`, `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`                                                                  |
| `wait-what`                     | `docs/agents/domain.md`                                                                                                                                  |
| `wayfinder`                     | `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`                                                                                           |
| `wizard`                        | no adapter                                                                                                                                               |
| `writing-changesets`            | no adapter                                                                                                                                               |
| `writing-for-agents`            | no adapter                                                                                                                                               |

Agents enter planning through the repo-owned `plan-spec` and `plan-tickets`, and Pre-PR review through `pre-pr-review`: each reads its vendored `to-spec` / `to-tickets` / `code-review` and applies only this repository's overrides. `implement` and `implement-spec` name `code-review`; at the Pre-PR gate, that review runs as `pre-pr-review`. The vendored skills are the developer's manual entry point, typed by name, and stay untouched. `implement` and `grill-with-docs` are user-only commands. When grilling converges, ask the developer once, naming every user-only command the next step needs in a single message, instead of asking before each.
