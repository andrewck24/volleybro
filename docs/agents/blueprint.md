# Blueprint adapter

Blueprint is the repository-owned human comprehension and review surface. It does not know which
issue tracker or orchestration runtime is configured.

## Change review surfaces

Every Change renders a Proposal page (with an optional design-mockup `proposal.tsx`) and, later, a
Delivery page. Both are written under `blueprint/content/changes/<slug>/`, gitignored on the Change
branch. At each gate the agent publishes them with `pnpm blueprint:changes:publish <slug>`, which
commits them to the orphan `blueprint-changes` branch and pushes it — the durable store of every
Change page, old and new, that never merges into other branches. `pnpm --filter blueprint dev` and
`build` first run `pnpm blueprint:changes:pull`, copying every published Change into
`blueprint/content/changes/` without overwriting local drafts, so every deploy carries all published
Changes plus Features and the Design System from the deployed branch; deploys fail loudly if the
store cannot be fetched. Structured ADR JSON follows `blueprint/schemas/decision-record.schema.json`
and sits alongside the Proposal page while it is proposed. The Proposal page renders those records
with `DecisionTimeline`; new Changes must not maintain a parallel hard-coded `DECISIONS` array as a
second editable source.

## Canonical current knowledge

Blueprint Features describe the current and planned capability tree:

- place current behavior and capability-specific constraints on the narrowest sub-capability;
- place a constraint or decision on a parent capability only when it governs multiple children;
- keep Archive-promoted decision copies with origin Change slug, rationale, important rejected
  alternatives, consequences, and revisit triggers;
- place reusable UI/UX rules in the Design System rather than duplicating them across Features;
- represent product direction as roadmap state without copying operational scheduling from the
  configured tracker.

Archive writes promoted Feature decision copies under the narrowest
`<capability>/<sub-capability>/decisions/` directory. Before Archive, the only ADR authority is the
active Change's proposed decision records.

Code and tests remain the behavioral authority. Feature prose must agree with their observable
behavior, while Changesets remain the authority for semantic version and changelog evidence.
