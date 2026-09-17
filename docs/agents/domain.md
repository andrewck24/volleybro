# Domain documentation adapter

VolleyBro uses a single domain context. Create root `CONTEXT.md` lazily when the first project-
specific term is resolved.

`CONTEXT.md` is a glossary only:

- update a stable term inline during Discuss or developer-authorized Ingest;
- define what the term is in one or two sentences and list discouraged synonyms when useful;
- exclude implementation details, specifications, decisions, execution state, and review evidence.

Architectural decision records do not use a parallel canonical `docs/adr/` tree. During Discuss and
propose, create structured ADRs inside the active Change's `design/decisions/` directory and record
proposed decisions, alternatives, consequences, revisit triggers, and a non-empty `targets` array
there. Each target uses the narrowest hierarchical capability or sub-capability ID affected by the
decision; use a parent only for a decision that governs multiple children. The Proposal page may
summarize capability impact, but it is not the ADR authority. There is no separate status field: an
ADR in the Change's `design/decisions/` directory is proposed and rendered on the Proposal page for
G1; the same record copied into a Feature's `decisions/` directory is adopted.

Store these records under
`blueprint/content/changes/<change-slug>/design/decisions/`.

Branch-local Archive reconciles each realized ADR with delivered code and tests and copies it to the
narrowest affected Blueprint capability's `features/<capability>/decisions/` as canonical current
knowledge. Archive validates the draft `targets` against the realized boundary before choosing those
destinations. Later Changes may supersede the Feature copy without rewriting the proposed record,
which disappears with the rest of the Change directory once archived.

Before changing domain language or a decision, read the affected Feature pages, active Change, code,
and tests. Surface contradictions rather than silently rewriting an authority.
