# Triage labels

The installed `triage` playbook speaks in two category roles and five state roles. This file maps each role to what carries it in Linear — a label or a status (ADR-0069).

## Category roles

| Role          | Carrier | Value         |
| ------------- | ------- | ------------- |
| `bug`         | label   | `bug`         |
| `enhancement` | label   | `enhancement` |

## State roles

| Role              | Carrier | Value             |
| ----------------- | ------- | ----------------- |
| `needs-triage`    | label   | `needs-triage`    |
| `needs-info`      | label   | `needs-info`      |
| `ready-for-agent` | label   | `ready-for-agent` |
| `ready-for-human` | label   | `ready-for-human` |
| `wontfix`         | status  | Canceled          |

A duplicate is not `wontfix`: it keeps Linear's own duplicate relation and Duplicate status. A blocked issue carries a blocking relation, not a label or status of its own.

The playbook gives `ready-for-human` to work that cannot be delegated — judgement calls, external access, design decisions, manual testing. Waiting at G1 or G2, and a run stopped for the developer, are that kind of work, so they carry the same label; which one it is follows from the status (ADR-0070). The status each label sits in, and who moves it, is the table in `WORKFLOW.md`.

## Runtime configuration

Arming puts an issue in Todo, but Symphony dispatches any issue that carries `ready-for-agent` in an active status. `active_states` must therefore list both Todo and In Progress: without In Progress, reconciliation stops a run the moment Symphony claims it, and a stopped run that is re-armed cannot resume (ADR-0070). Because `required_labels` also governs continuing a run, `ready-for-agent` on an In Progress issue means an unattended run holds it, not a triage verdict. The labels themselves are created and renamed in Linear by hand, outside this repository.
