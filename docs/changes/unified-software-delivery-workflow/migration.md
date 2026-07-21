# Workflow Migration Record

## Active consumer inventory

| Consumer                              | Owner                                                     | Migration state       | Recovery or verification                                                                                                                              |
| ------------------------------------- | --------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| VolleyBro `WORKFLOW.md`               | VolleyBro repository                                      | Complete              | `pnpm check:workflow`; canonical contract commit `a3783d9b`                                                                                           |
| VolleyBro `CLAUDE.md` and `AGENTS.md` | VolleyBro repository                                      | Complete              | Thin-bridge commit `b24ffc20`; both point to root `WORKFLOW.md`                                                                                       |
| VolleyBro automation                  | VolleyBro repository                                      | Complete              | Conformance commit `2b5f3d5d`; active reference scan is zero                                                                                          |
| Global Claude Code workflow guidance  | `/Users/andrew/.claude/CLAUDE.md`                         | Complete              | Points to repository `WORKFLOW.md` and global Symphony config; rollback backup `/Users/andrew/.claude/backups/CLAUDE.md.bak-20260718` remains present |
| Global Codex orchestration            | `/Users/andrew/.codex/AGENTS.md` and `config.toml`        | Complete              | Seven issue-scoped roles are registered from Symphony templates; strict config load succeeds                                                          |
| Antigravity repository instructions   | Repository `AGENTS.md` through the configured agy default | Complete              | Shares the same provider-neutral bridge and repository contract                                                                                       |
| Symphony scheduler                    | `/Users/andrew/.config/symphony/WORKFLOW.md`              | Complete, not started | Config/profile parse succeeds with `--no-start`; first run remains gated on the final Linear review                                                   |

Historical backups, provider transcripts, file history, completed job data, memory, and archived change
records may retain the retired name as historical evidence. They are not instructions, automation,
or runtime consumers and were not rewritten.

## Legacy repository retirement

- Source repository: `https://github.com/andrewck24/spec-loop`
- Last local commit before retirement: `90ea02047dca6c79cb33ca8777dab39efa9bb0d9`
- Local worktree state before deletion: clean
- GitHub state: archived on 2026-07-22; the `main` branch remains the recovery source
- Local clone: `/Users/andrew/projects/spec-loop` removed after archive verification

Recovery is performed by unarchiving the GitHub repository and cloning its recorded `main` branch;
the prior global Claude instruction is also recoverable from the dated backup above.
