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
- Only the developer may move an issue into its ready-to-start status to arm unattended execution.
  No skill or setup process may make that status change.
- Manual Apply uses a two-sided ownership check: inspect Symphony's issue status, move the issue
  out of its ready-to-start status, request a runtime refresh when available, and inspect again.
  `running`, `retrying`, or `blocked` means the Manual session must not start. Begin only when the
  issue is absent after the post-removal check.
- Express discussion and Wayfinder progress with ordinary statuses, parent/child relationships,
  duplicate relations, and blocking edges. Do not invent a label taxonomy.
- After merge, move the operational Change issue to Done. Blueprint never depends on that issue
  remaining accessible.
