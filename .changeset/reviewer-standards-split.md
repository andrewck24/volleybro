---
"volleybro": patch
---

### Changed

#### Infrastructure

- Code review now reads a new root `CODING_STANDARDS.md` holding only the judgement rules no tool checks — comments, naming, no issue IDs in source, where a test belongs. `CONTRIBUTING.md` keeps how to work in the repository, including the commit and pull-request writing rules, and drops two rules that were either enforced by commitlint already or not true
- `AGENTS.md` is the one agent guidance file and `CLAUDE.md` only imports it, so the two can no longer drift; `pnpm check:workflow` fails if `CLAUDE.md` holds anything else or `AGENTS.md` cites a section number
- G1 is now the developer confirming the discussion's final summary; the Proposal page records that summary verbatim instead of being re-read, and still carries a flowchart when a Change alters a process
- Blueprint page and decision-record writing rules — page language, title shape, component strings — live in `docs/agents/blueprint.md`. `pnpm check:workflow --gate` fails on a malformed page title, on uncommitted decision records, and on an unpushed Change branch, and warns when a new record's decision runs past 1000 characters
- Backtick-quoted spans in Blueprint component strings, such as `Scenario` and `RiskTable`, render as inline code
- The bundled two-gate decision record is split into one record per decision
- `WORKFLOW.md` states how a subagent brief is composed and how to clean up the local checkout after a merge
