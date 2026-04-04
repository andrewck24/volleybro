---
name: writing-changelog
description: Use when writing the body of a changeset file, editing a generated CHANGELOG.md entry, or reviewing a changelog for human readability and correct structure
---

# Writing Changelog

## Overview

Changelog entries are for humans, not machines. Each entry communicates **what changed and why it matters** - not how it was implemented.

In projects using `@changesets/cli` with a custom formatter, the `.changeset/*.md` body IS the changelog draft. Writing it well is the only manual step; the formatter adds the version header, compare link, and date automatically.

## Changeset Body Format

```markdown
### Added

#### Team

- Add real-time member search filtered by name

### Fixed

#### Record

- Fix duplicate rally numbers after a substitution event
```

The body is rendered verbatim into CHANGELOG.md by the custom formatter.

## Change Types - Exact Headings

Use ONLY these `###` headings. No others.

| Heading | Use for |
|---------|---------|
| `### Added` | New features, commands, APIs visible to users |
| `### Changed` | Modified behavior, dep upgrades with behavioral impact |
| `### Deprecated` | Features flagged for future removal |
| `### Removed` | Deleted features, commands, APIs |
| `### Fixed` | Bug fixes |
| `### Security` | Vulnerability patches |

**Never use:** `### Minor Changes`, `### Bug Fixes`, `### Patch Changes`, `### Internal Changes`, `### Other`, or any heading not in this table.

## Domain Sub-headings (`####`)

Use `####` under a type heading to group entries by affected area when they span multiple domains. Omit if all entries share one scope.

**Example with domains:**
```markdown
### Changed

#### CI

- Migrate package manager from npm to pnpm

#### UI

- Update team page layout to support mobile viewports
```

**Example without domains (single scope):**
```markdown
### Fixed

- Fix duplicate rally numbers after a substitution event
```

**Common domain names:**

| Domain | Covers |
|--------|--------|
| Feature domains | `User`, `Team`, `Record`, `Match`, etc. |
| `Auth` | Authentication, session management |
| `UI` / `Accessibility` | Visual and interaction changes |
| `CI` | Automation pipelines, GitHub Actions |
| `Infrastructure` | Database, DI container, toolchain internals |

Name domains by reader recognition - not by implementation package. (`MongoDB` → `Infrastructure`, `shadcn/ui` → `UI`)

## Writing Good Bullets

**Do:**
- Describe the observable effect: "Add member search to team page"
- Name breaking changes explicitly with migration hint: "**Breaking:** Remove `GET /api/v1/players` - use `GET /api/v1/members` instead"
- The list should be sorted: breaking changes first, then by other importance, then latest-first.

**Don't:**
- Include implementation mechanism in bug fixes: ~~"Fix by resetting `currentRallyIndex` in the `addSubstitution` reducer"~~ → "Fix duplicate rally numbers after substitution"
- Repeat the domain heading: ~~"Record: fix rally index"~~ (heading already says Record)
- Use commit message style: ~~"fix: rally calculation"~~ - rewrite as user impact

## What to Omit

These do NOT belong in a changelog. Do not create a catch-all section ("Internal Changes", "Other") for them - omit entirely.

| Omit | Reason |
|------|--------|
| Formatting / whitespace | No user impact |
| Test additions | Not observable by users |
| Internal refactors with no behavior change | Not observable by users |
| Dep upgrades with no user-visible effect | Not observable by users |
| Linting / type-checking fixes | Not observable by users |

**Always include regardless of visibility:**
- Security patches
- Major runtime version bumps (Node.js, etc.)
- Toolchain changes that affect contributor setup (e.g. npm → pnpm)
- Dep upgrades that change observable behavior or remove deprecated options

## Rationalization Table

| Thought | Reality |
|---------|---------|
| "I'll add an Internal Changes section for completeness" | Omit entirely. There is no Internal Changes type. |
| "Minor Changes / Bug Fixes are clearer headings" | Use the exact headings from the table above. No others. |
| "The bug fix is more informative with the root cause" | Describe the observable fix, not the implementation. |
| "Skipping `####` domains is fine for a short list" | Add domains whenever entries span multiple areas, regardless of count. |
| "The dep upgrade is worth mentioning even with no visible change" | Only include if it changes observable behavior or removes deprecated options. |