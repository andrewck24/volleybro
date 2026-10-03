# Issue tracker adapter

Linear is VolleyBro's operational issue tracker for intake, active status, priority, dependencies, milestones, assignment, and Symphony dispatch eligibility. Issues may be archived or deleted after delivery, so repository knowledge must remain understandable without Linear URLs or IDs. Status moves, labels, and the post-merge cleanup follow `WORKFLOW.md`.

Matt Pocock playbooks use these adaptations:

- At intake and material scope expansion, apply `WORKFLOW.md`'s Fast path／Change／Sharded Change classification and upgrade rules. Shared-design shards stay under one tracking issue; independently decided goals become separate Changes. A G1-accepted scope change requires Ingest, not silently enlarged execution. Use no new classification labels.

- `to-spec` may maintain an operational issue projection, but the Blueprint Proposal page is the repository-owned Change specification.
- `to-tickets` publishes operational slice sub-issues under the Change's issue according to `WORKFLOW.md`'s Implementation-slice contract. G1 already authorizes decomposition: the root agent performs the playbook's granularity and dependency assessment without its additional user quiz or approval stop. Fetch referenced issue bodies and comments when needed, and use native Linear parent and blocking links rather than body text as the relationship source of truth. The skill does not close or rewrite the parent; update operational progress through the repository lifecycle instead.
- Ticket creation never adds `ready-for-agent` or dispatches an agent automatically. Readiness remains the developer's separate authorization under `WORKFLOW.md`. `implement-spec` uses the ticket graph and sparse context-pointer communication, but its draft-PR timing, maximum concurrency and cleanup defaults do not override repository gates, delegation policy or worktree ownership.
