## 1. Entry input progress bar (D8)

- [x] 1.1 Build a three-step extending segmented progress bar as a new presentational component driven by draft completion state, exposing activeStep, reachableSteps, and onStepChange; the active segment extends, segments carry no inline text, and a single caption below rotates with animation on step change. Verify: a Storybook story renders all three step states and shows the caption rotating on step change (specs/entry-input-flow "Three-step segmented progress bar navigation").
- [x] 1.2 Enforce step gating in src/components/game/panel/index.tsx so a step whose predecessor is incomplete is unreachable by tap or swipe. Verify: manual assertion in the entry route that opening the home-team step with the player step empty keeps the active step on player (scenario "Advance blocked until previous step complete").
- [x] 1.3 Collapse the flow to a two-step submittable flow when an opponent error is selected, discriminated by our (home) move being UNFORCED (not the away move) so our own losing serve/set stays on three steps. In src/components/game/panel/entry-progress.ts + src/components/game/panel/index.tsx. Verify: entry-route assertion that selecting an opponent error reduces the bar to two steps and enables submit at the outcome step, while a losing serve stays three steps (scenarios "Opponent error yields a two-step submittable flow", "Our own losing serve stays on the three-step flow"). Delivers requirement "An opponent error collapses the flow to two steps".

## 2. Preview submission (D8)

- [x] 2.1 Render src/components/game/preview.tsx in the Entry layout with score Figures in three states (idle = previous entry, undecided = muted current score, decided = winner-colored result). Verify: a Storybook story covering all three Figures states.
- [x] 2.2 Drive Preview feedback: pulse while input is in progress, ring + send icon only when all steps are complete, and submit-freeze (background flashes once) demoting the draft to the previous entry in place. Verify: entry-route manual assertion of the pulse → ring → freeze sequence (scenarios "Send affordance appears only when complete", "Submit freezes and demotes the draft"). Delivers requirement "Preview carries submission with completion highlight".

## 3. Gesture and accessibility (D8)

- [x] 3.1 [P] Implement capture-on-intent pointer swipe on the progress bar with click-suppression once a drag threshold is recognized. Verify: manual assertion that a recognized swipe switches the step without firing the segment tap handler (scenario "Swipe does not trigger a tap").
- [x] 3.2 [P] Use aria-disabled instead of the native disabled attribute on unreachable steps and non-applicable actions so they stay focusable and explain on interaction. Verify: an a11y check that locked controls expose aria-disabled and remain focusable. Delivers requirement "Locked controls stay perceivable and swipe suppresses stray taps".

## 4. Summary drawer container (D12)

- [x] 4.1 Move Summary out of src/components/game/options/index.tsx into a Preview-anchored bottom drawer (new container) with state idle|expanded; idle exposes only a handle and the latest entry. Verify: a Storybook story of the idle drawer showing handle + latest entry, and the Options dialog no longer contains Summary (scenario "Idle drawer shows handle and latest entry"). Delivers requirement "Summary is a bottom drawer anchored to the Preview".
- [x] 4.2 On expand, raise the latest entry with the top edge so it becomes the first list row in place. Verify: entry-route assertion of latest-entry promotion on expand (scenario "Expanding promotes the latest entry to the first row").

## 5. Entry row actions (D12)

- [x] 5.1 Reveal per-row action buttons on left-swipe and inline-expand the row as an accordion on tap to show recordedBy, time, and actions without leaving the list, in src/components/game/entry/index.tsx. Verify: Storybook stories for a swipe-revealed row and a tap-expanded row (scenarios "Left-swipe reveals action buttons", "Tap inline-expands the row in place"). Delivers requirement "Entry actions are revealed by swipe or inline expansion".
- [x] 5.2 [P] Compose action buttons by the last-entry rule as a pure function of isLatest(entry): latest = [edit, delete], non-latest = [edit, rollbackToHere] with no disabled delete button. Verify: a unit assertion on the composition function for latest and non-latest inputs (scenarios "Latest entry exposes edit and delete", "Non-latest entry exposes rollback instead of delete"). Delivers requirement "Button composition follows the last-entry rule".

## 6. Gesture split and integration (D8 + D12)

- [x] 6.1 Split gestures so an idle Preview tap expands the drawer while an in-progress Preview tap only submits (complete = send, incomplete = no-op), and the handle always toggles the drawer. Verify: entry-route assertion of both idle and in-progress tap behaviors (scenario "Preview tap during input only submits"). Delivers requirement "Gesture split while input is in progress".
- [x] 6.2 During input show the draft as the pulsing first row distinct from committed entries and, on freeze, turn it into the formal first entry in place. Verify: entry-route assertion of the draft-in-first-row rendering and the freeze transition (scenario "Handle expands drawer during input with draft in first row").

## 7. Mockup-fidelity corrections (D8 + D12)

Post-apply pass to bring the implementation in line with the `design.tsx` mockup after human review found it diverged.

- [x] 7.1 Render the Summary drawer as the mockup's custom bottom-anchored sheet (Preview = top edge, translate-y peek of ~3.5rem when idle, translate-y-0 when expanded, panel behind), replacing the modal drawer; restructure the game layout so the drawer overlays the recording panel region. Verify: the idle drawer peeks the Preview at the screen bottom and expanding covers the panel (scenario "Idle drawer shows handle and latest entry").
- [x] 7.2 Remove the redundant submit affordance on the away move buttons so the Preview is the sole submission control. Verify: tapping a selected away move again does not submit and shows no send icon (scenario "Away move button does not submit").
- [x] 7.3 Remove the recording panel's own per-step titles so the progress-bar caption is the sole step label. Verify: the shown moves panel renders no our-team / opponent titles (scenario "Moves panel shows no redundant step titles").
- [x] 7.4 Fill every completed-or-active progress segment with the primary color (pending = muted, active wider). Verify: a completed step renders the primary fill (scenario "Completed step shows the primary fill").
- [x] 7.5 Drive the progress-bar highlight and the shown recording panel from one source of truth so tap/swipe switches both in sync, and animate the panel body with a directional slide on switch. Verify: tapping a reachable segment swaps the panel and highlight together, sliding in by direction (scenarios "Tapping a reachable step swaps the panel in sync", "Panel body slides directionally on switch").

## 8. Drawer peek, de-duplication, and graceful submit (D8 + D12)

Second human-review pass on the running UI.

- [x] 8.1 Put the handle at the drawer's very top edge with the Preview directly beneath it, both visible in the idle peek. Verify: the idle drawer peek shows the handle above the Preview.
- [x] 8.2 Never show the same entry twice: the Preview IS the newest row (latest committed entry when not editing, the draft when editing), so the expanded list renders every committed entry EXCEPT the one the Preview occupies, and there is no separate draft row. Verify: after submitting, the just-committed entry appears only in the Preview, not also as the first list row.
- [x] 8.3 Handle a failed rally submission gracefully: the optimistic mutate rolls back instead of caching `undefined`, the draft is confirmed only on success, and the error surfaces as a toast rather than crashing the Game tree. Verify: a rejected create/update rolls back the game and shows a toast without a crash.

## 9. Viewport layout, modal drawer, and panel slide (D8 + D12)

Third human-review pass on the running UI.

- [x] 9.1 Lock the recording UI to one viewport height: the entry layout is a single `fixed inset-0` full-viewport container (no nested `<main>`, no doubled top padding); the Game body is a flex column where the fixed header's height is reserved once, then court (fixed aspect), panel (remaining height, inner fills), and the drawer's idle peek (fixed height) fill the rest. Verify: header + court + panel + peek fill exactly the viewport with no overflow and no oversized header/court gap.
- [x] 9.2 Make the expanded drawer a modal: a vaul `Drawer` portalled to `<body>` with a backdrop overlay and a bottom sheet up to `85dvh` (dialog-scale, no longer limited to the panel height). The idle peek stays inline; expanding opens the modal, closing (overlay / drag / Escape) returns to idle. Verify: expanding dims the background behind an overlay and the sheet is taller than the panel.
- [x] 9.3 Give the panel step-switch a full-width, clipped directional slide (tab-container feel) instead of the earlier subtle nudge. Verify: switching home/away slides the moves body in from the matching side.
