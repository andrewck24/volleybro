# Issue tracker adapter

Linear is VolleyBro's operational issue tracker for intake, active status, priority, dependencies,
milestones, assignment, and Symphony dispatch eligibility. Issues may be archived or deleted after
delivery, so repository knowledge must remain understandable without Linear URLs or IDs.

Matt Pocock playbooks use these adaptations:

- `to-spec` may maintain an operational issue projection, but Blueprint Overview and Design are the
  repository-owned Change specification.
- `to-tickets` does not publish durable implementation issues. The Blueprint workflow adapts its
  vertical-slice discipline into Change-local JSON.
- Only the developer may add or remove `agent:ready`. No skill, setup process, or Prepare execution
  action may update it.
- Manual Apply uses a two-sided ownership check: inspect Symphony's issue status, remove
  `agent:ready`, request a runtime refresh when available, and inspect again. `running`, `retrying`,
  or `blocked` means the Manual session must not start. Begin only when the issue is absent after the
  post-removal check.
- Express discussion and Wayfinder progress with ordinary statuses, parent/child relationships,
  duplicate relations, and blocking edges. Do not invent a label taxonomy.
- After merge, move the operational Change issue to Done. Blueprint never depends on that issue
  remaining accessible.
