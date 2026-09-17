---
"volleybro": patch
---

### Changed

#### Infrastructure

- The delivery workflow stops for a human at two points only: a Proposal page before implementation and a Delivery page before the pull request. Slice plans, per-round review pages, lifecycle states, and the Archive reconcile step are gone; slices live in `.scratch/<slug>/` or Linear sub-issues and are discarded with the worktree
- Blueprint change pages are generated locally and never committed. `blueprint/content/changes/` and `.scratch/` are gitignored, the 24 archived change directories are removed from the tree, and the deployed Blueprint site carries only Features and the Design System
- `pnpm check:workflow` checks the two Blueprint pages instead of the four-page shell, and warns when a change touches more than 30 source files without naming a Migration Proposal
