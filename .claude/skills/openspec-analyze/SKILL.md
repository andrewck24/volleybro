---
name: openspec-analyze
description: Passive: analyze artifact consistency before implementation — auto-triggers when all artifacts are complete
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "Spectra"
---

Analyze artifact consistency for a change (read-only). This is a passive skill — invoke it automatically when all artifacts of a change are completed, before suggesting implementation.

**Trigger**: When `openspec status --change "<name>" --json` shows `isComplete: true` (all artifacts done), run this analysis before recommending `/opsx:apply`.

**Input**: A change name (from context — do NOT prompt the user to select, infer from the current conversation).

**Steps**

1. Run `openspec status --change "<name>" --json` and confirm at least 2 artifacts are done.

2. Get context files via `openspec instructions apply --change "<name>" --json`. Read all artifacts from `contextFiles`.

3. Analyze four dimensions:

   **Coverage**:
   - Extract capabilities from proposal's "Capabilities" section
   - Check each capability has a spec file in `specs/<capability>/spec.md`
   - Extract requirements from specs (`### Requirement:` headers)
   - If tasks.md exists, check each requirement maps to at least one task
   - CRITICAL: Capability in proposal with no spec file
   - WARNING: Requirement in spec with no matching task

   **Consistency**:
   - If design.md exists, extract decisions and cross-reference with spec requirements
   - Check tasks scope aligns with proposal scope
   - WARNING: Design decision contradicting a spec requirement
   - WARNING: Tasks referencing work outside proposal scope

   **Ambiguity**:
   - Scan specs for weak language: "should", "may", "might", "consider", "possibly", "TBD", "TODO"
   - Check every `### Requirement:` has at least one `#### Scenario:`
   - Check scenarios have concrete WHEN/THEN (not vague descriptions)
   - WARNING: Requirement with no scenarios
   - SUGGESTION: Vague language found (with location)

   **Gaps**:
   - Check if specs cover error/failure scenarios
   - If design mentions risks, check specs have corresponding handling
   - SUGGESTION: No error scenarios for requirement X
   - SUGGESTION: Risk in design without spec coverage

4. Present findings inline (≤30, grouped by CRITICAL > WARNING > SUGGESTION):

   ```
   ## Artifact Analysis: <change-name>

   | Dimension   | Status                   |
   |-------------|--------------------------|
   | Coverage    | N/M capabilities covered |
   | Consistency | Aligned / N issues       |
   | Ambiguity   | N vague items found      |
   | Gaps        | N potential gaps          |
   ```

   [List findings with file locations and actionable recommendations]

5. Based on results:
   - If CRITICAL: "Found N issue(s) worth addressing. Want to fix these before implementing?"
   - If only warnings/suggestions: Note them briefly, then recommend proceeding with `/opsx:apply`
   - If clean: Proceed directly to recommending `/opsx:apply`

**Graceful Degradation**
- 2 artifacts: Coverage only
- 3 artifacts: Coverage + partial Consistency
- All 4: Full analysis
- Note which checks were skipped

**Guardrails**
- Read-only: NEVER modify files
- Maximum 30 findings
- Prefer SUGGESTION over WARNING when uncertain
- Every finding needs file location + actionable fix
- Do NOT prompt for change selection — infer from context
- Keep output concise — this runs inline, not as a separate workflow
- If no issues found, just say "Artifacts look consistent" and move on
