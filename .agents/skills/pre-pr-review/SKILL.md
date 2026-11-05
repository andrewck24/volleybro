---
name: pre-pr-review
description: "Run a Standards and Spec review round at the Pre-PR gate. Use for every review round before a pull request; wraps the vendored code-review with this repository's overrides."
---

# Pre-PR Review

Read `.agents/skills/code-review/SKILL.md` and follow it, with only these overrides. The vendored skill stays untouched and keeps following upstream.

1. Take the fixed point from `WORKFLOW.md` (Re-review scope).
2. The spec is the execution issue description. A Fast path with no issue uses its drafted pull request body.
3. The Standards brief names the leanness check in `CODING_STANDARDS.md`. When the diff adds, changes, deletes or moves a test, also give the Standards sub-agent `.agents/skills/test-audit/SKILL.md` and `docs/agents/test-audit.md`; from those two files it reports violations only, on top of its usual brief.
4. Every finding quotes the applicable rule or spec sentence and includes a code excerpt or failing output. Sub-agents only report and leave no changes.
5. The word limit excludes the multi-write and authorization evidence `CODING_STANDARDS.md` requires.
6. A later round gives each sub-agent every earlier report and disposition.
7. Next step: classify the findings under `WORKFLOW.md` (Finding dispositions and fixed point).

Read the adapters named for this skill in `docs/agents/skill-adapters.md` before invoking it.
