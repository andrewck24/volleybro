# Artifact lifecycle adapter

Classify every workflow output before storing it.

| Class                 | Examples                                                                                        | Lifecycle                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Operational           | Tracker intake/spec projection, Wayfinder maps, workpad, temporary handoff, provider text       | Update only while active; extract missing durable knowledge at Archive, then allow archival or deletion.       |
| Change-scoped durable | Blueprint Overview, Design, Design-scoped ADRs, implementation JSON, Review, lifecycle metadata | Create from Propose onward, update through Apply and Pre-PR, then reconcile and freeze as one archived Change. |
| Canonical current     | Blueprint Features, promoted decision copies, `CONTEXT.md`, code/tests, Changesets              | Update only when knowledge is verified and promoted at Archive; supersede explicitly through later Changes.    |

## Branch-local Archive

Archive runs after the developer accepts Blueprint Review and before the pull request opens:

1. require all implementation slices complete or explicitly superseded;
2. require full verification, Changeset assessment, independent code-review/fix rounds, and an
   accepted Blueprint Review;
3. reconcile Overview, Design, slices, and Review with delivered code and tests;
4. promote implemented behavior and durable constraints to the narrowest affected sub-capability;
5. reconcile accepted Change ADRs with delivery, mark realized records `implemented`, and copy them
   to the narrowest Feature capability or sub-capability with their origin Change slug; retain the
   original ADRs, rejected alternatives worth remembering, rationale, and revisit triggers in the
   archived Change;
6. reconcile `CONTEXT.md` only for stable domain vocabulary resolved during the Change;
7. retain implementation slices, review findings, fix rounds, validation evidence, and
   plan-versus-actual details in the archived Change instead of promoting them to Features;
8. exclude tracker IDs, claim state, retries, workspace paths, temporary research, and transcript
   text from durable Blueprint content;
9. set lifecycle to `archived` and add `archivedAt`; the Change stays at
   `blueprint/content/changes/<slug>/`, since its directory is its stable metadata `slug`; then
   validate workflow conformance plus the Blueprint build.

The archived branch describes the intended post-merge canonical state. It becomes current on the
default branch only when the pull request merges. If PR feedback changes behavior, constraints,
decisions, tests, or review evidence, amend both the archived Change and promoted knowledge on the
same branch and rerun the applicable gates. Merge performs no second knowledge sync; it only permits
the operational issue to move to Done.

Historical Spectra/OpenSpec artifacts are immutable snapshots. Migration work promotes only
still-current knowledge into its canonical authority and leaves obsolete or superseded material in
place as history. Remove Spectra skills, workflows, and CLI configuration only in a later cleanup
after that promotion has been verified.
