---
name: writing-changesets
description: Use when creating a changeset file during Archive, writing or editing changeset body content, running release:version, reviewing a CHANGELOG.md entry, or asking how the release workflow works
---

# Writing Changesets

## Overview

This project uses `@changesets/cli` with a custom verbatim formatter and a postprocess script. The changeset `.md` body IS the changelog draft -- write it well, and the toolchain handles the rest.

## Bundled Resources

| File             | When to read                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| `body-format.md` | When writing or reviewing changeset body content (heading rules, domain sub-headings, bullet style, omission rules) |
| `README.md`      | When you need the full end-to-end release workflow (branching model, CLI steps, toolchain architecture)             |

## When to Create a Changeset

Assess Changeset applicability during Archive for each delivery batch, including each Sharded Change shard. Include the applicable changeset in that batch's branch and pull request to the current integration branch defined in `WORKFLOW.md`, never deferred to release time:

```
implement -> Archive assessment -> pnpm changeset when applicable -> same batch PR
```

Every delivery batch with user-visible or contributor-setup impact carries its own changeset. A tracking parent receives no extra changeset just for grouping its shards. Do not duplicate earlier batches' entries. Lifecycle, human gates, integration branch and release authorization are owned by `WORKFLOW.md`, not this skill.

Skip the changeset only if the change has zero user-visible impact (pure refactor, tests only, docs only); use `pnpm changeset --empty` if CI requires a file.

## CLI Quick Reference

| Command                  | When                                                     | What it does                                                     |
| ------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------- |
| `pnpm changeset`         | After archive, on feat branch                            | Interactive: pick bump type, write body                          |
| `pnpm changeset --empty` | CI requires changeset but no user impact                 | Creates empty changeset                                          |
| `pnpm changeset status`  | Anytime                                                  | Shows pending changesets                                         |
| `pnpm release:version`   | Authorized version preparation, not deployment | Bumps version, updates CHANGELOG.md, deletes consumed changesets |

**`commit` is `false`** -- all commands leave changes unstaged. You must `git add && git commit` manually.

## Bump Type Selection

| Type    | When                                                                  |
| ------- | --------------------------------------------------------------------- |
| `patch` | Bug fixes, non-breaking improvements                                  |
| `minor` | New features, new APIs, backward-compatible additions                 |
| `major` | Breaking changes (removed APIs, changed behavior, migration required) |

When in doubt, prefer `minor` for features, `patch` for fixes.

## Deriving Body from a Change

When writing the body at Archive, pull from the Change's own artifacts:

1. Read the Proposal page for scope and motivation
2. Read the batch's commits against the current integration base for what was actually implemented; their bodies carry the outcome and verification per slice
3. Map each user-visible change to a bullet under the correct `###` heading (see `body-format.md`)
4. Ignore internal work (refactors, test infra, CI plumbing) unless it affects contributors

## Rationalization Table

| Thought                                                           | Reality                                                                       |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| "I'll add an Internal Changes section for completeness"           | Omit entirely. There is no Internal Changes type.                             |
| "Minor Changes / Bug Fixes are clearer headings"                  | Use the exact headings in `body-format.md`. No others.                        |
| "The bug fix is more informative with the root cause"             | Describe the observable fix, not the implementation.                          |
| "Skipping `####` domains is fine for a short list"                | Add domains whenever entries span multiple areas, regardless of count.        |
| "The dep upgrade is worth mentioning even with no visible change" | Only include if it changes observable behavior or removes deprecated options. |
| "This change is too small for a changeset"                        | If it has user-visible impact, it needs a changeset. Size doesn't matter.     |
| "I'll create the changeset later"                                 | Create at archive time. Context is freshest then.                             |
