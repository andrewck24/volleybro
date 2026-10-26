---
name: writing-changesets
description: Use when creating a changeset file at the Pre-PR gate, writing or editing changeset body content, running release:version, reviewing a CHANGELOG.md entry, or asking how the release workflow works
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

Assess Changeset applicability at the Pre-PR gate for each delivery batch, including each shard of a Change. Include the applicable changeset in that batch's branch and pull request to the current integration branch defined in `WORKFLOW.md`, never deferred to release time:

```
implement -> Pre-PR Changeset assessment -> pnpm changeset when applicable -> same batch PR
```

Write a changeset only for content shipped in the package. Every delivery batch that changes shipped content carries its own changeset; CI, workflows, the release controller, tests, docs, agent skills and contributor-setup-only changes need none. A tracking parent receives no extra changeset just for grouping its shards. Do not duplicate earlier batches' entries. Lifecycle, human gates, integration branch and release authorization are owned by `WORKFLOW.md`, not this skill.

Skip the changeset when the batch changes no shipped content; use `pnpm changeset --empty` if CI requires a file.

## CLI Quick Reference

| Command                  | When                                                     | What it does                                                     |
| ------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------- |
| `pnpm changeset`         | At the Pre-PR gate, on the batch branch                  | Interactive: pick bump type, write body                          |
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

When writing the body at the Pre-PR gate, pull from the Change's own artifacts:

1. Read the execution issue's spec (and the Change page when one exists) for scope and motivation
2. Read the batch's commits against the current integration base for what was actually implemented; their bodies carry the outcome and verification per slice
3. Map each user-visible change to a bullet under the correct `###` heading (see `body-format.md`)
4. Ignore internal work (refactors, test infra, CI plumbing, contributor setup)

## Rationalization Table

| Thought                                                           | Reality                                                                       |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| "I'll add an Internal Changes section for completeness"           | Omit entirely. There is no Internal Changes type.                             |
| "Minor Changes / Bug Fixes are clearer headings"                  | Use the exact headings in `body-format.md`. No others.                        |
| "The bug fix is more informative with the root cause"             | Describe the observable fix, not the implementation.                          |
| "Skipping `####` domains is fine for a short list or one scope"   | Every entry sits under a `####` domain; the release merges changesets.        |
| "The dep upgrade is worth mentioning even with no visible change" | Only include if it changes observable behavior or removes deprecated options. |
| "This change is too small for a changeset"                        | If it changes shipped content, it needs a changeset. Size doesn't matter.  |
| "I'll create the changeset later"                                 | Create at the Pre-PR gate. Context is freshest then.                          |
