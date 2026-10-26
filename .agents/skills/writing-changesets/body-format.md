# Changeset Body Format Reference

## Structure

The body is rendered verbatim into CHANGELOG.md. Use Keep a Changelog headings:

```markdown
### Added

#### Team

- Add real-time member search filtered by name

### Fixed

#### Record

- Fix duplicate rally numbers after a substitution event
```

## Change Type Headings

Use ONLY these `###` headings. No others.

| Heading          | Use for                                                |
| ---------------- | ------------------------------------------------------ |
| `### Added`      | New features, commands, APIs visible to users          |
| `### Changed`    | Modified behavior, dep upgrades with behavioral impact |
| `### Deprecated` | Features flagged for future removal                    |
| `### Removed`    | Deleted features, commands, APIs                       |
| `### Fixed`      | Bug fixes                                              |
| `### Security`   | Vulnerability patches                                  |

**Never use:** `### Minor Changes`, `### Bug Fixes`, `### Patch Changes`, `### Internal Changes`, `### Other`, or any heading not in this table.

## Domain Sub-headings (`####`)

Put every entry under a `####` domain inside its type heading, even when the changeset has a single entry or a single domain. A release merges many changesets into one version block, and the postprocess merges matching `###` and `####` headings but never adds a missing one, so a changeset without domains leaves its entries ungrouped beside other changesets' groups.

**Example:**

```markdown
### Changed

#### Record

- Show the set score beside each rally in the match record

#### UI

- Update team page layout to support mobile viewports
```

**Common domain names:**

| Domain                 | Covers                                      |
| ---------------------- | ------------------------------------------- |
| Feature domains        | `User`, `Team`, `Record`, `Match`, etc.     |
| `Auth`                 | Authentication, session management          |
| `UI` / `Accessibility` | Visual and interaction changes              |
| `Infrastructure`       | Database, DI container, toolchain internals |

Name domains by reader recognition, not implementation package. (`MongoDB` -> `Infrastructure`, `shadcn/ui` -> `UI`)

## Writing Good Bullets

**Do:**

- Describe the observable effect: "Add member search to team page"
- Name breaking changes explicitly with migration hint: "**Breaking:** Remove `GET /api/v1/players` -- use `GET /api/v1/members` instead"
- Sort: breaking changes first, then by importance, then latest-first

**Don't:**

- Include implementation mechanism in bug fixes: ~~"Fix by resetting `currentRallyIndex` in the `addSubstitution` reducer"~~ -> "Fix duplicate rally numbers after substitution"
- Repeat the domain heading: ~~"Record: fix rally index"~~ (heading already says Record)
- Use commit message style: ~~"fix: rally calculation"~~ -- rewrite as user impact

## What to Omit

These do NOT belong in a changelog. Do not create a catch-all section for them -- omit entirely.

| Omit                                       | Reason                  |
| ------------------------------------------ | ----------------------- |
| Formatting / whitespace                    | No user impact          |
| Test additions                             | Not observable by users |
| Internal refactors with no behavior change | Not observable by users |
| Dep upgrades with no user-visible effect   | Not observable by users |
| Linting / type-checking fixes              | Not observable by users |

**Always include regardless of visibility:**

- Security patches
- Major runtime version bumps (Node.js, etc.)
- Dep upgrades that change observable behavior or remove deprecated options
