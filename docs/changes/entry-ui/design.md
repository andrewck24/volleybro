## Context

entry-ui is the front-loaded, zero-backend-dependency slice of the sync-recording epic (#28). The converged discuss decisions live in the blueprint design page at `blueprint/content/changes/discussing/sync-recording/design.tsx` — this change implements decisions **D8** (entry input flow) and **D12** (Summary drawer), plus the Q0/Q1 interactive mockups that fix the display logic, animation, and positioning.

Current state: the input panel drives step selection implicitly with no progress indicator; submission confirmation is not discoverable; the Summary list is buried inside the Options dialog. Target frontend components: `src/components/game/preview.tsx`, `src/components/game/panel/**`, `src/components/game/entry/**`, `src/components/game/options/summary.tsx`, `src/components/game/options/index.tsx`, and the entry route under `src/app/game/[gameId]/sets/[setIndex]/entry/`.

## Goals / Non-Goals

**Goals:**

- Implement D8: three-step extending segmented progress bar with tap/swipe navigation, away-error single-step collapse, and Preview-centered submission (three-state score Figures, completion ring + send icon, submit-freeze).
- Implement D12: Summary as a Preview-anchored bottom drawer with per-row left-swipe actions, tap inline-expansion, and last-entry-rule button composition.
- Keep the whole slice frontend-only so it ships independently of the sync backend.

**Non-Goals:**

- Backend sync, SSE stream, presence, or offline queue.
- Server-side guards: intent anchoring / `basedOn` (D3–D5), conflict panel (D7), overwrite version checks (D9), server enforcement of the last-entry rule and rollback truncate broadcast (D10), set-end boundary (D13).
- live-view read-only spectator page (D14/D15).
- The "roll back and re-record to here" and edit/delete actions render their UI affordances and drive existing single-recorder client flows only; collaborative validation belongs to the sync-recording change.

## Decisions

- **Progress bar style = extending segments (Q0 style 5).** The active segment extends; the same extend animation also serves the away-error single-step collapse. Rejected: styles 1–4 (segment fill / dot-connector / number badges / thin line) — style 5's animation does double duty. Rejected: prev/next buttons — tap-on-bar plus swipe already cover navigation and buttons cost panel space.
- **Submission centralized in the Preview, no implicit confirm.** Implicit confirmation is undiscoverable; the Preview becomes the single highlighted submit affordance. Rejected: text labels for Preview state — score Figures three states + pulse reuse the existing Entry/GamePreview vocabulary, so labels are redundant.
- **Swipe uses capture-on-intent.** A pointer gesture is captured as a swipe only once drag intent is recognized; a recognized swipe suppresses the click it would otherwise emit. Locked/unreachable controls use `aria-disabled` (focusable, explain-on-tap) rather than native `disabled`.
- **Summary leaves the panel to become a Preview-anchored bottom drawer (D12).** Anchoring above the Preview keeps the drawer's swipe gestures from colliding with panel swipe. Tap inline-expands a row (accordion) rather than opening a second layer — context stays in the list. Rejected: tap opens the same action buttons as swipe (row deforms, adds a layer, context leaves the list). Rejected: disabled delete button + explain-on-tap for non-latest entries — a visible "roll back and re-record to here" button is a directly actionable alternative path.
- **Gesture split between Preview and drawer.** Idle: tap Preview = expand drawer. During input: Preview tap only submits (complete = send, incomplete = no-op); the handle always toggles the drawer; the in-progress draft occupies the pulsing first row and, on freeze, becomes the formal first entry in place — an extension of D8's "role transition".

## Implementation Contract

- **Observable behavior**: the acceptance criteria in `specs/entry-input-flow/spec.md` and `specs/entry-summary-drawer/spec.md` are the authoritative observable contract. Each scenario there names a concrete WHEN/THEN pair an implementer or reviewer can exercise by hand or in Storybook.
- **Interface / state shape**: the progress bar is a new presentational component driven by the current draft's completion state (player selected → home step → away step), exposing `activeStep`, `reachableSteps`, and an `onStepChange` intent callback; the away-error branch reduces the step set to one. The drawer is a new container wrapping the entry list with `state: "idle" | "expanded"`, a handle toggle, and per-row `swipeRevealed` / `inlineExpanded` flags. Button composition is a pure function of `isLatest(entry)`: latest → [edit, delete], non-latest → [edit, rollbackToHere].
- **Failure modes**: unreachable steps and non-applicable actions are `aria-disabled`, not removed and not native-disabled; they explain on interaction. A swipe-recognized pointer sequence must not also fire a tap.
- **Acceptance criteria**: every scenario in both spec files passes when driven in the entry route / Storybook; the away-error path collapses to a single submittable step; the draft demotes in place on submit; non-latest rows never show a disabled delete.
- **Scope boundaries**: in scope — the frontend components listed in Context and the new progress-bar and drawer components. Out of scope — every item under Non-Goals; visual theming beyond what the mockups fix (display logic, animation, position) is refined during apply but adds no new behavior.

## Risks / Trade-offs

- [Capture-on-intent swipe vs. tap ambiguity on small segments] → Enlarge touch area with transparent padding (per Q1 mockup) and gate the click-suppression on a recognized drag threshold.
- [Drawer gestures colliding with panel/page scroll] → Anchoring the drawer above the Preview (out of the panel) removes the collision; the handle is the only always-on toggle.
- [D12 actions imply data mutations whose collaborative guards live in another change] → v1 wires the UI to existing single-recorder flows only; the sync-recording change later attaches version checks and broadcast without changing these affordances.
