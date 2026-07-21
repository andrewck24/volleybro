## 1. Preserve the Change Contract

- [x] 1.1 Commit the complete proposal, design, specification, and task artifacts before source changes so the delivery rationale is durable; verify with `spectra validate unified-software-delivery-workflow --strict` and `git show --stat` (documentation layer; supports **Make WORKFLOW.md the canonical repository contract**).

## 2. Establish the Canonical Repository Workflow

- [x] 2.1 Implement the **Repository-owned canonical delivery contract**, **Readiness-gated scheduler dispatch**, and **Relationship-aware Linear intake** in root `WORKFLOW.md`, including the **Use Linear for queue state and repository labels for execution routing** decision; verify by reviewing the contract against every matching spec scenario and running `pnpm check:format` (documentation layer).
- [x] 2.2 Implement the **Versioned repository delivery profile** and **Represent delivery tools as capability bindings in the repository profile** decision in `WORKFLOW.md`, resolving `sdd`, `change_comprehension`, `release_planning`, `versioning`, `workpad`, `scm`, `review`, `validation`, `archive`, and `evaluation`; verify the profile fixture parses deterministically and every selected adapter has an explicit contract description (documentation and repository tooling layers).
- [x] 2.3 Implement **Selected SDD and change-comprehension lifecycle synchronization** with a stable change slug and canonical task/status derivation according to **Bind VolleyBro SDD to Spectra and change comprehension to Blueprint**; verify that discuss/propose, apply/ingest, review/fix, and archive each name an owner, input, output, and exit condition (documentation layer).
- [x] 2.4 Implement **Separate release-planning and versioning gates** and **Keep release planning and repository versioning independent** by requiring a Linear milestone before `agent:ready` for release-bound work and an applicable Changeset or explicit exemption before review; verify concrete release-bound, exempt, missing-milestone, and missing-Changeset examples against the documented state transitions (documentation layer).
- [x] 2.5 Implement **Issue-scoped provider delegation** and **Bound provider-native delegation to one dispatched issue**, preserving root ownership while prohibiting subagents from queue claims, readiness mutations, cross-issue work, or workspace escape; verify a manual seven-role example keeps every delegated action beneath one issue-run (documentation layer).
- [x] 2.6 Implement **Durable provider-neutral handoff** and the **Use a durable workpad for cross-provider handoff** decision with the required workpad fields and no transcript dependency; verify using a manual provider-switch example that reconstructs the next action from Linear, repository artifacts, git, and the workpad (documentation layer).
- [x] 2.7 Implement **Immediate structured evaluation evidence**, **Persist structured Symphony evidence with ephemeral provider text**, and **Capture evaluation evidence from the first formal run** by documenting structured evidence fields, the `ephemeral_text` privacy boundary, and the ten-comparable-run policy-change threshold; verify that no durable workflow field stores prompt, response, reasoning, or transcript text (documentation layer).
- [x] 2.8 Run `pnpm verify`, then commit Section 2 with an English conventional commit whose scope describes the repository workflow contract (documentation layer).

## 3. Reduce Provider Instructions to Bridges

- [x] 3.1 [P] Implement **Thin provider workflow bridges** and the **Keep provider instruction files as thin workflow bridges** decision in `CLAUDE.md` and `AGENTS.md`, preserving provider mechanics and hard repository rules without shared lifecycle duplication; verify each bridge points to `WORKFLOW.md` and a side-by-side content review finds no copied lifecycle sections (documentation layer).
- [x] 3.2 Run `pnpm verify`, then commit Section 3 with an English conventional commit describing the provider bridge migration (documentation layer).

## 4. Enforce Workflow Conformance

- [x] 4.1 Write failing tests first for the **Workflow conformance command**, covering a missing canonical contract, invalid or unsupported delivery-profile adapter, missing bridge pointer, duplicated lifecycle content, durable transcript field, and active retired spec-loop reference; verify the new test cases fail for the expected invariant before implementation (repository tooling layer; supports **Enforce structural invariants with a repository check**).
- [x] 4.2 Implement `pnpm check:workflow` so conforming input exits zero and each tested invariant exits non-zero with an actionable path and rule, including validation of the resolved capability bindings and `ephemeral_text` boundary; verify the tests pass and manual execution succeeds in the repository (repository tooling layer).
- [x] 4.3 Integrate `pnpm check:workflow` into the repository verification path without changing application runtime behavior; verify `pnpm check:workflow`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` all pass (repository tooling layer).
- [x] 4.4 Run `pnpm verify`, then commit Section 4 with an English conventional commit describing workflow conformance enforcement (repository tooling layer).

## 5. Retire Legacy References Safely

- [ ] 5.1 Implement **Gated spec-loop retirement** and the **Retire spec-loop only after replacement validation** decision by inventorying active repository and global consumers, migrating in-scope VolleyBro references, and recording out-of-repository consumers for the global cleanup gate; verify the active-reference scan is zero for VolleyBro and every external match has an explicit owner and migration state (documentation and repository tooling layers).
- [ ] 5.2 Verify rollback remains possible before external archival by confirming instruction backups and the GitHub repository recovery path, then run `pnpm verify` and commit Section 5 with an English conventional commit describing legacy-reference retirement (documentation layer).

## 6. Final Verification and Documentation Review

- [ ] 6.1 Run `spectra analyze unified-software-delivery-workflow`, resolve blocking findings, and verify `spectra validate unified-software-delivery-workflow --strict` succeeds (change-artifact layer).
- [ ] 6.2 Review `docs/`, `README.md`, `CONTRIBUTING.md`, `.spectra.yaml`, `CLAUDE.md`, and `AGENTS.md` for required updates, update only affected documentation, and verify content review finds one canonical lifecycle owner, explicit capability bindings, separate milestone and Changeset gates, the `ephemeral_text` boundary, and no stale active references (documentation layer).
- [ ] 6.3 Run `pnpm verify:all`, confirm the application and Blueprint builds pass, update the Spectra task and Blueprint Review evidence, and commit the final section with an English conventional commit (all repository layers).
