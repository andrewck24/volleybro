# Artifact lifecycle adapter

| Class                   | Authority                                                         | Lifecycle                                                                                                         |
| ----------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Working / operational   | Linear issue, ticket graph, workpad and progress                  | Mutable during delivery; keep accepted revision references and progress evidence.                                 |
| Specification           | The Linear execution issue description                            | Mutable until G1 (the `ready-for-human` → `ready-for-agent` label switch). Renew G1 for substantive spec changes. |
| Change page (on demand) | One EmDash entry, only for a major UI or Pele-flowchart Change    | Draft and signed private preview before publication; publish after G1. Renew G1 for substantive content changes.  |
| Research                | Owning-Team Linear Doc                                            | Preserve cited findings, evidence gaps and dissent; promote only adopted knowledge to its repository authority.   |
| G2 evidence             | GitHub PR and exact reviewed head                                 | PR records the execution issue and the fields required by `WORKFLOW.md` G2. G2 does not republish a Change page.  |
| Canonical current       | Features, Design System authority, glossary, ADRs, code and tests | Update affected knowledge on the delivery branch before PR/G2; later changes explicitly supersede it.             |

## G2 evidence retention

G2 evidence lives in the GitHub PR; `WORKFLOW.md` G2 owns its required fields. The developer's explicit instruction to merge and clean up authorizes that exact reviewed revision; a direct human merge also constitutes acceptance. Native PR merge identity and Git ancestry prove completion. Do not add a second G2 event receiver, bot receipt or repository copy of the complete specification.

Preserve the operational authorization and PR identity on the execution issue. Mark the issue Done and its checklist items completed only after merge. Platform credentials, Cloudflare resource creation, production activation remain separate approval/cleanup actions when their gate is not part of the accepted G1. Production activation requires separate approval after G2.

## Same-branch knowledge promotion

Before the Pre-PR review, assess observable behavior, capability constraints and reusable UI/UX rules. Promote only supported knowledge to the narrowest affected Features; reusable design rules follow `DESIGN.md` and its explicit supplements, with Blueprint presenting that authority. Record unchanged-page decisions and their reason in the PR. Stable vocabulary follows `docs/agents/domain.md`; ADRs already occupy permanent paths and are never promoted or renumbered.

Run applicable validation and independent review on these edits with the delivery diff. PR feedback that changes behavior or constraints also updates this knowledge on the same branch before renewed G2 acceptance. The verified branch describes the intended merged state; it becomes current on the default branch when merged.

Keep tracker IDs, workspace/claim/retry state and transcripts out of durable Blueprint prose; the optional EmDash `linear_issue` field is the intentional issue lookup index.

## Research and working notes

Keep full research in an independent owning-Team Linear Doc. Preserve date, source links, what each supports, evidence gaps and relevant dissent. The requesting issue holds the conclusion and Doc link, not a second editable copy.

Research is not an accepted specification. The complete G1 spec belongs on the execution issue under `docs/agents/issue-tracker.md`. Working measurements and plans stay operational; only adopted knowledge needed to understand the delivered capability enters repository authorities.
