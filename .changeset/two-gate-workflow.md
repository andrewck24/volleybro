---
"volleybro": patch
---

### Changed

#### Infrastructure

- The delivery workflow stops for a human at two points only: a Proposal page before implementation and a Review page before the pull request. Slice plans, per-round review pages, lifecycle states, and the Archive reconcile step are gone; a Change's slices, when it needs any, are Linear sub-issues under its issue, and a Change that fits one session skips slices and implements directly
- Blueprint change pages are generated locally under gitignored `blueprint/content/changes/` and published to the orphan `blueprint-changes` branch at each gate; the 22 archived change directories moved to that store branch instead of being deleted, and the deployed Blueprint site now carries every published Change alongside Features and the Design System
- `pnpm check:workflow` checks the two Blueprint pages instead of the four-page shell, and warns when a change touches more than 30 source files without naming a Migration Proposal
- Small corrections that restore documented behaviour can follow a fix path with no Blueprint pages; the pull request is their only human gate and their commits carry a `Refs` trailer
- Arming unattended execution adds the `agent:ready` label and moves the issue to Todo; Symphony dispatches only labelled issues in an active status, and each later status change has one named owner
- `.worktreeinclude` lists `.env.local`, so worktrees created by agent tooling that reads it start with the local environment file
- A gate fails when its Change page was never published or was edited since, so a reviewer never reads a page the store branch does not have
