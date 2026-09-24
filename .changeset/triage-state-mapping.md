---
"volleybro": patch
---

### Changed

#### Infrastructure

- `docs/agents/triage-labels.md` maps the triage playbook's two category and five state roles to what carries each in Linear, a label or a status; the delivery contract now allows exactly those labels, and `agent:ready` is renamed `ready-for-agent`
- G1 waits at Todo with `ready-for-human` and In Review means only G2; a run that needs the developer swaps its label to `ready-for-human` and keeps its status
- An action the workflow assigns to the developer may be carried out by the agent once the developer consents, for one issue or a named batch; an unarmed issue is moved to In Progress by the agent without a second Symphony check
- After merge, a Change that was sent back at a gate or took more than three review rounds prompts a retro
