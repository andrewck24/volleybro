# Issue tracker adapter

Linear is VolleyBro's operational issue tracker for intake, active status, priority, dependencies, milestones, assignment, and Symphony dispatch eligibility. Issues may be archived or deleted after delivery, so repository knowledge must remain understandable without Linear URLs or IDs. Status moves, labels, and the post-merge cleanup follow `WORKFLOW.md`.

Matt Pocock playbooks use these adaptations:

- `to-spec` may maintain an operational issue projection, but the Blueprint Proposal page is the repository-owned Change specification.
- `to-tickets` does not publish durable implementation issues beyond slices. A Change's slices, when it needs any, are Linear sub-issues under its operational issue, the same way in manual and Symphony mode; a Change that fits one session skips slices and implements directly. Each sub-issue carries a stable ID, capability references, dependencies, outcome, acceptance criteria, verification, and status (`pending` or `completed`); runtime state such as `claimed`, `running`, executor identity, and retry count does not belong on it.
