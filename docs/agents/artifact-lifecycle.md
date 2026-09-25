# Artifact lifecycle adapter

Classify every workflow output before storing it.

| Class                  | Examples                                                                                                           | Lifecycle                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Operational            | Tracker intake/spec projection, Wayfinder maps, workpad, Linear slice sub-issues, temporary handoff, provider text | Update only while active; extract missing durable knowledge at Archive, then allow deletion.                                                                                                        |
| Durable review history | Proposal and Review tabs                                                                                           | Gitignored on the Change branch; published to the `blueprint-changes` store branch at each gate, where they persist without merging into other branches. They are not a second lifecycle authority. |
| Canonical current      | Blueprint Features, decision records, `CONTEXT.md`, code/tests, Changesets                                         | Update only when knowledge is verified and promoted at Archive; supersede explicitly through later Changes.                                                                                         |

## Branch-local Archive

Archive runs automatically after Pre-PR code review reaches its fixed point and before the pull request opens:

1. require all slices complete or explicitly superseded, full verification, Changeset assessment, and independent code-review/fix rounds at a fixed point;
2. promote implemented behavior and durable constraints to the narrowest affected sub-capability; Archive does not promote, reconcile, or renumber decision records — a decision record already lives at its permanent `blueprint/content/decisions/` path from the moment it was written;
3. reconcile `CONTEXT.md` only for stable domain vocabulary resolved during the Change;
4. export the Review summary for the pull-request body, as `WORKFLOW.md`'s Archive section defines it;
5. exclude tracker IDs, claim state, retries, workspace paths, temporary research, and transcript text from durable Blueprint content;
6. generate the Review tab following `docs/agents/blueprint.md`, read it rendered in a browser, publish it with `pnpm blueprint:changes:publish <slug>`, confirm with `pnpm check:workflow --gate <slug>`, then notify the developer and stop for acceptance (G2);
7. once accepted, verify tracker neutrality, workflow conformance, and the Features build.

The archived branch describes the intended post-merge canonical state. It becomes current on the default branch only when the pull request merges. If PR feedback changes behavior, constraints, decisions, tests, or review evidence, amend the promoted knowledge on the same branch and rerun the applicable gates. Merge performs no second knowledge sync; it only permits the operational issue to move to Done.

Change pages are durable review history again: publishing them to the `blueprint-changes` store branch keeps every Proposal and Review tab browsable after merge, without making them a second lifecycle authority — Features, decision records, and commit bodies remain canonical current knowledge.

Historical Spectra/OpenSpec artifacts are immutable snapshots. Migration work promotes only still-current knowledge into its canonical authority and leaves obsolete or superseded material in place as history. Remove Spectra skills, workflows, and CLI configuration only in a later cleanup after that promotion has been verified.

## Research and working notes

Research and working notes earn no file of their own.

Investigation results go back to the tracker issue that asked for them. The sources behind a decision go in the Proposal tab's `## References` section, each row naming what it supports and how strong it is, with the strongest dissenting source recorded too. That section holds research that was done: a Change that consulted no outside source simply has none, and an empty or padded References section is worse than an absent one. A working plan or measurement taken during Discuss is folded into the Proposal's own sections rather than kept as a separate note.

Only what this repository has adopted earns a file — its decision records, its capability descriptions, and the rules it holds itself to. An external pattern earns one only as a rule this repository follows, never as a summary of someone else's writing.
