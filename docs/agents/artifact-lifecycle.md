# Artifact lifecycle adapter

Classify every workflow output before storing it.

| Class                  | Examples                                                                                                           | Lifecycle                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Operational            | Tracker intake/spec projection, Wayfinder maps, workpad, Linear slice sub-issues, temporary handoff, provider text | Update only while active; extract missing durable knowledge at Archive, then allow deletion.                                                                                                        |
| Durable review history | Proposal and Review pages                                                                                          | Gitignored on the Change branch; published to the `blueprint-changes` store branch at each gate, where they persist without merging into other branches. They are not a second lifecycle authority. |
| Canonical current      | Blueprint Features, promoted decision copies, `CONTEXT.md`, code/tests, Changesets                                 | Update only when knowledge is verified and promoted at Archive; supersede explicitly through later Changes.                                                                                         |

## Branch-local Archive

Archive runs automatically after Pre-PR code review reaches its fixed point and before the pull request
opens:

1. require all slices complete or explicitly superseded, full verification, Changeset assessment,
   and independent code-review/fix rounds at a fixed point;
2. promote implemented behavior and durable constraints to the narrowest affected sub-capability;
3. promote each realized Change ADR to the narrowest Feature capability or sub-capability with its
   origin Change slug, rationale, important rejected alternatives worth remembering, and revisit
   triggers;
4. reconcile `CONTEXT.md` only for stable domain vocabulary resolved during the Change;
5. export a Review summary of at most 40 lines — acceptance scenario results, verification,
   findings and fixes, residual risks — for the pull-request body; keep the rest in commit bodies;
6. exclude tracker IDs, claim state, retries, workspace paths, temporary research, and transcript
   text from durable Blueprint content;
7. generate the Review page, read it rendered in a browser, publish it with
   `pnpm blueprint:changes:publish <slug>`, then notify the developer and stop for acceptance (G2);
8. once accepted, verify tracker neutrality, workflow conformance, and the Features build.

The archived branch describes the intended post-merge canonical state. It becomes current on the
default branch only when the pull request merges. If PR feedback changes behavior, constraints,
decisions, tests, or review evidence, amend the promoted knowledge on the same branch and rerun the
applicable gates. Merge performs no second knowledge sync; it only permits the operational issue to
move to Done.

Change pages are durable review history again: publishing them to the `blueprint-changes` store
branch keeps every Proposal and Review page browsable after merge, without making them a second
lifecycle authority — Features, ADRs, and commit bodies remain canonical current knowledge.

Historical Spectra/OpenSpec artifacts are immutable snapshots. Migration work promotes only
still-current knowledge into its canonical authority and leaves obsolete or superseded material in
place as history. Remove Spectra skills, workflows, and CLI configuration only in a later cleanup
after that promotion has been verified.
