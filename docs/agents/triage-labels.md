# Triage labels

The installed `triage` playbook speaks in two category roles and five state roles. This file maps
each role to what carries it in Linear. The vendor template has two columns, role and label, because
it assumes every role is a label; here some roles are carried by a status, so the mapping has three.

A status carries coarse progress; a label carries who holds the ball; a blocked issue carries a
Linear blocking relation and neither a label nor a status of its own (ADR-0069).

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

A duplicate is not `wontfix`: it keeps Linear's own duplicate relation and Duplicate status.

## Where each label sits

| Label             | Status      | Meaning there                                |
| ----------------- | ----------- | -------------------------------------------- |
| `needs-triage`    | Backlog     | The developer has not evaluated it yet       |
| `needs-info`      | Backlog     | Waiting on the reporter                      |
| `ready-for-human` | Todo        | G1 waits for the developer                   |
| `ready-for-agent` | Todo        | Armed: Symphony may dispatch it              |
| `ready-for-agent` | In Progress | An unattended run holds it                   |
| `ready-for-human` | In Progress | A run stopped because it needs the developer |
| `ready-for-human` | In Review   | G2 waits for the developer                   |

`ready-for-agent` on an In Progress issue is not a triage verdict: Symphony's `required_labels`
governs continuing a run as well as dispatching one, so the label stays while the run holds the
issue. Swapping it for `ready-for-human` stops the run and leaves the status where the work is;
swapping it back re-queues it (ADR-0070).

## Runtime configuration

Dispatch policy and runtime settings are separate: dispatch requires Todo and `ready-for-agent`,
while `active_states` must list both Todo and In Progress, or reconciliation stops a run the moment
Symphony moves it to In Progress. The labels themselves are created and renamed in Linear by hand,
outside this repository.
