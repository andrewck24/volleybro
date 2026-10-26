# Changeset authoring and tooling

`WORKFLOW.md` owns delivery modes, the current integration branch, the Pre-PR gate, human acceptance and release authorization. This guide describes authoring only; it is not a second release runbook. Version preparation does not itself prove deployment success.

## Authoring

At the Pre-PR gate, assess the current delivery batch's actual impact using `SKILL.md`. Each applicable batch, including a shard of a Change, carries its own changeset in the same pull request. Do not wait until release time or repeat entries from previous batches.

Run `pnpm changeset` on the work branch and select the package and semantic bump. Changesets name only `volleybro`: `blueprint` deploys separately, is listed in `.changeset/config.json` `ignore`, and a changeset naming it alone is never consumed. Its Markdown body becomes the changelog draft. Derive it from the execution issue's spec and delivered commits; follow [body-format.md](body-format.md).

The CLI leaves files unstaged (`commit: false`). Stage only the intended changeset path alongside the batch's changes. A standalone commit must still carry the trailers required by `WORKFLOW.md`.

Write a changeset only for content shipped in the package. CI, workflows, the release controller, tests, docs, agent skills, formatting, pure internal refactors and contributor-setup-only changes need none. Record the applicable exemption in the PR body; use `pnpm changeset --empty` only if a check actually requires an empty file.

## Toolchain

- `.changeset/config.json` configures packages, versions and the formatter.
- `.changeset/changelog-fn.js` returns the authored body verbatim.
- `.changeset/changelog-postprocess.js` normalizes version headings and merges duplicate category headings.
- `pnpm changeset status --verbose` reports pending entries and projected versions.
- `pnpm release:version` runs version preparation and postprocessing, consuming pending changesets. It is not a manual shortcut around release authorization, validation or deployment.

Several batches may contribute to the same package release; Changesets combines their semantic impacts and bodies. A monorepo changeset can name multiple packages. Actual deployment and tagging policy remains a repository responsibility, not something this guide infers from an empty changeset queue.

## Corrections

Changesets are plain Markdown: correct their contents on the same work branch before review. If an entry was missed, repair the omission through the normal delivery path rather than directly editing the integration branch or pushing a tag as a fallback.
