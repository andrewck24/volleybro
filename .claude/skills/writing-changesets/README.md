# Changeset & Release Workflow

This document describes the end-to-end flow from code change to published release in VolleyBro.

## Branching Model

```text
feat/xxx ──PR──> dev ──PR──> main
                               |
                     Changesets workflow (CI):
                     version PR -> tag + GitHub Release
                     -> sync PR back to dev
```

- **feat/fix branches**: where implementation happens (spectra:apply)
- **dev**: integration branch; accumulates completed features
- **main**: release branch; every merge triggers a version bump

## Lifecycle Overview

```text
┌─────────────────────────────────────────────────────────────┐
│  FEAT BRANCH                                                │
│                                                             │
│  1. spectra:apply    -- implement the change                │
│  2. spectra:archive  -- finalize the change                 │
│  3. pnpm changeset   -- create .changeset/<id>.md           │
│  4. git add + commit -- "chore: add changeset for <name>"   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  FEAT -> DEV PR                                             │
│                                                             │
│  5. Create PR to dev (gh pr create --base dev)              │
│  6. Review: code + changeset body                           │
│  7. Merge -- changeset .md enters dev                       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  DEV -> MAIN PR                                             │
│                                                             │
│  8. Create PR from dev to main                              │
│  9. Review: accumulated changes                             │
│  10. Merge -- all pending changesets enter main             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  RELEASE (automated by .github/workflows/changesets.yml)    │
│                                                             │
│  11. Push to main triggers changesets/action: it runs       │
│      pnpm release:version on a changeset-release/main       │
│      branch and opens the version PR                        │
│      "release: update versions [skip review]"               │
│  12. A human merges the version PR                          │
│  13. The next workflow run tags v<version>, creates the     │
│      GitHub Release from CHANGELOG.md, then opens AND       │
│      merges the sync PR "chore: sync v<version> release     │
│      back to dev [skip review]" (left open on conflict)     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Step-by-Step Details

### Step 3: Creating a Changeset

Run on the feat branch, after `spectra:archive`:

```bash
pnpm changeset
```

The interactive CLI prompts for:

1. **Bump type** -- patch / minor / major
2. **Summary** -- this becomes the changeset body

Write the body following the format in `body-format.md`. Derive content from the change's `proposal.md` and `tasks.md`.

The command creates `.changeset/<random-id>.md` with frontmatter (package + bump type) and your body.

### Step 4: Committing the Changeset

```bash
git add .changeset/<id>.md
git commit -m "chore: add changeset for <change-name>"
```

`commit` is set to `false` in `.changeset/config.json` -- nothing is auto-committed.

### Steps 5-7: PR to dev

Standard PR flow. Reviewers should check the changeset body for:

- Correct bump type
- User-facing language (not implementation details)
- Correct `###` headings per body-format.md

### Steps 8-10: PR to main

When dev has accumulated enough changes for a release, create PR from dev to main. Multiple changeset files may be present -- `changeset version` will merge them into a single version bump.

### Steps 11-13: Automated Release (Changesets workflow)

`.github/workflows/changesets.yml` handles everything after the dev→main merge:

The workflow authors both PRs with `RELEASE_TOKEN` (a PAT/App token, not the default `GITHUB_TOKEN`) so their `Verify` checks trigger and pass — the default token can't, since GitHub suppresses workflows on bot-authored PRs.

1. **Version PR** — the push to main triggers `changesets/action`, which runs `pnpm release:version` on a `changeset-release/main` branch and opens `release: update versions [skip review]`. `release:version` runs two things sequentially:
   - `changeset version` -- reads all `.changeset/*.md` files, bumps `package.json` version, appends entries to `CHANGELOG.md`, deletes consumed changeset files
   - `node .changeset/changelog-postprocess.cjs` -- reformats version headers to `## [X.Y.Z](compare-link) YYYY-MM-DD` and merges duplicate `###` headings
2. **Human merges the version PR** (review the CHANGELOG diff first — this is the last edit point). `Verify` runs automatically; no manual approve needed.
3. **Tag + Release + sync** — the next workflow run (no changesets left) runs an explicit, idempotent finalize step: it skips if `v<version>` already has a release, otherwise `gh release create`s the tag + GitHub Release from that version's `CHANGELOG.md` section, then opens `chore: sync v<version> release back to dev [skip review]` and enables auto-merge (it merges once `Verify` passes; a conflict leaves it open for a human). This no longer uses `changeset tag` / `release:publish`, which is now unused (it tags as `name@version`, not this repo's `v<version>` scheme; the manual fallback below tags directly with `git tag`).

**Manual fallback** (workflow broken or offline):

```bash
# on main, after merge from dev
pnpm release:version
git add -A
git commit -m "release: $(node -p \"require('./package.json').version\")"
git tag "v$(node -p \"require('./package.json').version\")"
git push && git push --tags
# then sync main back into dev (PR or direct merge)
```

## Toolchain Architecture

```text
.changeset/
  config.json               -- changesets configuration (commit: false)
  changelog-fn.cjs          -- custom formatter: returns body verbatim
  changelog-postprocess.cjs -- post-version: fix headers + merge sections
  *.md                      -- pending changeset files (consumed by version)
```

- **changelog-fn.cjs**: Implements `getReleaseLine` that returns `changeset.summary.trim()`. No commit links, no formatting -- the body you write is the body that ships.
- **changelog-postprocess.cjs**: Runs after `changeset version`. Converts bare `## X.Y.Z` headers to `## [X.Y.Z](compare-link) YYYY-MM-DD` and merges duplicate `###` type headings that occur when multiple changesets share the same category.

## Multiple Changesets per Release

When several feat branches merge into dev before a release:

```text
feat/auth-fix   ->  .changeset/abc.md  (patch, ### Fixed)
feat/new-search ->  .changeset/def.md  (minor, ### Added)
feat/ui-update  ->  .changeset/ghi.md  (patch, ### Changed)
```

After `pnpm release:version`:

- Version bumps to the highest semver (minor wins over patch)
- All three bodies merge into one CHANGELOG entry
- Postprocess merges any duplicate `###` headings

## When NOT to Create a Changeset

- Pure refactors with no behavior change
- Test-only changes
- Documentation-only changes
- Linting / formatting fixes
- CI pipeline changes (unless they affect contributors)

Use `pnpm changeset --empty` if CI requires a changeset file but the change has no user impact.

## FAQ

**Q: What if I forgot to create a changeset on the feat branch?**
A: Create it on dev before the PR to main. The changeset just needs to exist before `release:version` runs.

**Q: Can I edit a changeset after creating it?**
A: Yes. It's a plain markdown file in `.changeset/`. Edit and commit.

**Q: What if the same `###` heading appears in multiple changesets?**
A: The postprocess script merges them. Each heading appears exactly once in the final CHANGELOG.

**Q: How do I check what's pending before a release?**
A: `pnpm changeset status --verbose` shows all pending changesets and the projected version bump.
