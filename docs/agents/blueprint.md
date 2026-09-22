# Blueprint adapter

Blueprint is the repository-owned human comprehension and review surface. It does not know which
issue tracker or orchestration runtime is configured.

## Change review surfaces

Every Change renders a Proposal page (with an optional design-mockup `proposal.tsx`) and, later, a
Review page. Both are written under `blueprint/content/changes/<slug>/`, gitignored on the Change
branch. At each gate the agent publishes them with `pnpm blueprint:changes:publish <slug>`, which
commits them to the orphan `blueprint-changes` branch and pushes it — the durable store of every
Change page, old and new, that never merges into other branches. `pnpm check:workflow --gate <slug>`
confirms the publish: it fails when a page was never published or was edited since. `pnpm --filter blueprint dev` and
`build` first run `pnpm blueprint:changes:pull`, copying every published Change into
`blueprint/content/changes/` without overwriting local drafts, so every deploy carries all published
Changes plus Features and the Design System from the deployed branch; deploys fail loudly if the
store cannot be fetched. Decision records live at `blueprint/content/decisions/D<n>-<slug>.json`,
follow `blueprint/schemas/decision-record.schema.json`, and belong to the repository rather than to
any Change. A Proposal page imports the records written during its own Discuss and renders them
with `DecisionTimeline`; new Changes must not maintain a parallel hard-coded `DECISIONS` array as a
second editable source.

## Canonical current knowledge

Blueprint Features describe the current and planned capability tree:

- place current behavior and capability-specific constraints on the narrowest sub-capability;
- place a constraint or decision on a parent capability only when it governs multiple children;
- let each page render the decision records whose `capabilities` name it, rather than listing them
  by hand;
- place reusable UI/UX rules in the Design System rather than duplicating them across Features;
- represent product direction as roadmap state without copying operational scheduling from the
  configured tracker.

A Feature page holds no decision file of its own: a record names its capabilities and every page
they name renders it, so one decision governing several capabilities stays one file. Archive
promotes behavior and durable constraints to Features and leaves the records where they are.

Code and tests remain the behavioral authority. Feature prose must agree with their observable
behavior, while Changesets remain the authority for semantic version and changelog evidence.
