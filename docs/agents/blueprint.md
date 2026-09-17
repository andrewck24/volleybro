# Blueprint adapter

Blueprint is the repository-owned human comprehension and review surface. It does not know which
issue tracker or orchestration runtime is configured.

## Change review surfaces

Every Change renders a Proposal page (with an optional design-mockup `proposal.tsx`) and, later, a
Delivery page. Both live under `blueprint/content/changes/<slug>/`, which is gitignored: the pages
are regenerated locally at each gate and are never committed. Structured ADR JSON follows
`blueprint/schemas/decision-record.schema.json` and sits alongside the Proposal page while it is
proposed. The Proposal page renders those records with `DecisionTimeline`; new Changes must not
maintain a parallel hard-coded `DECISIONS` array as a second editable source.

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
