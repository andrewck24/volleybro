# Domain documentation adapter

VolleyBro uses a single domain context. Create root `CONTEXT.md` lazily when the first project- specific term is resolved.

`CONTEXT.md` is a glossary only:

- update a stable term inline during Discuss or developer-authorized Ingest;
- define what the term is in one or two sentences and list discouraged synonyms when useful;
- exclude implementation details, specifications, decisions, execution state, and review evidence.

Architectural decision records do not use a parallel canonical `docs/adr/` tree, and they do not belong to a Change. A decision record belongs to the repository: it lives at `blueprint/content/decisions/<nnnn>-<slug>.json`, one flat file per decision, with no per-capability copies. Its number is assigned when it is written, by scanning that directory for the highest number and adding one — one namespace, no renumbering, ever. Four digits, so the directory sorts in the order the records were made; cite a record in prose as `ADR-0046`.

Write a decision record the moment the decision is made — during a Change's Discuss, or outside any Change — and it is adopted from that moment. There is no proposed stage and no status field, because a decision that is still open is not written down as a decision. Record its title, decision body, alternatives, consequences, and revisit triggers, plus a non-empty `capabilities` array: each entry is the narrowest hierarchical capability or sub-capability ID affected by the decision, such as `game-recording/rally-input`; use a parent only for a decision that governs multiple children. Feature pages render the records whose `capabilities` name that page, matched exactly. Fill `originChange` with the Change's slug when the decision was made during a Change's Discuss, which is what a later reader follows back to its branch, pull request, and discussion; leave it empty when it was not. The Proposal page may summarize capability impact, but it is not the decision-record authority.

A decision record's lifecycle has two events: birth, and replacement by setting `supersededBy` on the record being replaced, pointing at the record that replaces it. Archive does not promote, reconcile, or renumber decision records — a record already lives at its permanent path from the moment it was written.

Before changing domain language or a decision, read the affected Feature pages, active Change, code, and tests. Surface contradictions rather than silently rewriting an authority.
