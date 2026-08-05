# Domain documentation adapter

VolleyBro uses a single domain context. Create root `CONTEXT.md` lazily when the first project-
specific term is resolved.

`CONTEXT.md` is a glossary only:

- update a stable term inline during Discuss or developer-authorized Ingest;
- define what the term is in one or two sentences and list discouraged synonyms when useful;
- exclude implementation details, specifications, decisions, execution state, and review evidence.

Architectural decision records do not use a parallel canonical `docs/adr/` tree. During Propose,
create structured ADRs inside the active Change's Design scope and record candidate decisions,
alternatives, consequences, revisit triggers, and a non-empty `targets` array there. Each target uses
the narrowest hierarchical capability or sub-capability ID affected by the decision; use a parent
only for a decision that governs multiple children. Overview may summarize capability impact, but it
is not the ADR authority. Developer plan approval changes qualifying Change ADRs from
`candidate` to `accepted`; they remain Change-scoped while implementation is active.

Store these records under
`blueprint/content/changes/<status>/<change-slug>/design/decisions/`.

Branch-local Archive reconciles each realized ADR with delivered code and tests, changes the Change
copy to `implemented`, and copies it to the narrowest affected Blueprint capability or sub-capability
as canonical current knowledge. Archive validates the draft `targets` against the realized boundary
before choosing those destinations. The original remains frozen in the archived Change. Later Changes
may supersede the Feature copy without rewriting the historical Change ADR.

Before changing domain language or a decision, read the affected Feature pages, active Change, code,
and tests. Surface contradictions rather than silently rewriting an authority.
