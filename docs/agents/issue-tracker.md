# Issue tracker adapter

Linear is VolleyBro's operational issue tracker for intake, active status, priority, dependencies,
milestones, assignment, and Symphony dispatch eligibility. Issues may be archived or deleted after
delivery, so repository knowledge must remain understandable without Linear URLs or IDs.

Matt Pocock playbooks use these adaptations:

- `to-spec` may maintain an operational issue projection, but the Blueprint Proposal page is the
  repository-owned Change specification.
- `to-tickets` does not publish durable implementation issues beyond slices. A Change's slices, when
  it needs any, are Linear sub-issues under its operational issue, the same way in manual and
  Symphony mode; a Change that fits one session skips slices and implements directly. Each
  sub-issue carries a stable ID, capability references, dependencies, outcome, acceptance criteria,
  verification, and status (`pending` or `completed`); runtime state such as `claimed`, `running`,
  executor identity, and retry count does not belong on it. Sub-issues are closed once the Change is
  archived.
- Arming, the status moves, and who owns each follow the table in `WORKFLOW.md`, including when the
  agent may act on the developer's consent. No skill or setup process adds `ready-for-agent`
  unattended.
- Manual Apply on an armed issue uses a two-sided ownership check: inspect Symphony's issue status,
  remove `ready-for-agent` and move the issue to In Progress, request a runtime refresh when
  available, and inspect again. `running`, `retrying`, or `blocked` means the Manual session must
  not start. Begin only when the issue is absent after the post-removal check. An unarmed issue
  needs no second check; `WORKFLOW.md`'s Manual workflow covers it.
- Express discussion and Wayfinder progress with ordinary statuses, parent/child relationships,
  duplicate relations, and blocking edges. Labels follow `docs/agents/triage-labels.md`.
- After merge, move the operational Change issue to Done. Blueprint never depends on that issue
  remaining accessible.
