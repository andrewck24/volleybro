# Blueprint adapter

Blueprint is the repository-owned human comprehension and review surface. It does not know which
issue tracker or orchestration runtime is configured.

## Change-scoped durable record

Every Change keeps Overview, Design, structured Design-scoped ADRs, implementation slices, Review,
and lifecycle metadata in Git. These artifacts remain mutable while active and become a frozen
historical record at Archive. An archived Change may describe behavior later superseded by another
Change; it is durable history, not the authority for current behavior.

Structured ADR JSON follows `blueprint/schemas/decision-record.schema.json`. Design and Feature
pages render those records with `DecisionTimeline`; new Changes must not maintain a parallel
hard-coded `DECISIONS` array as a second editable source.

## Canonical current knowledge

Blueprint Features describe the current and planned capability tree:

- place current behavior and capability-specific constraints on the narrowest sub-capability;
- place a constraint or decision on a parent capability only when it governs multiple children;
- keep Archive-promoted decision copies with status, origin Change slug, rationale, important
  rejected alternatives, consequences, and revisit triggers;
- place reusable UI/UX rules in the Design System rather than duplicating them across Features;
- represent product direction as roadmap state without copying operational scheduling from the
  configured tracker.

Archive writes implemented Feature decision copies under the narrowest
`<capability>/<sub-capability>/decisions/` directory. Before Archive, the only ADR authority is the
active Change's `design/decisions/` directory.

Code and tests remain the behavioral authority. Feature prose must agree with their observable
behavior, while Changesets remain the authority for semantic version and changelog evidence.
