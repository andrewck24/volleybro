## 1. Entry input progress bar (D8)

- [x] 1.1 Build a three-step extending segmented progress bar as a new presentational component driven by draft completion state, exposing activeStep, reachableSteps, and onStepChange; the active segment extends, segments carry no inline text, and a single caption below rotates with animation on step change. Verify: a Storybook story renders all three step states and shows the caption rotating on step change (specs/entry-input-flow "Three-step segmented progress bar navigation").
- [x] 1.2 Enforce step gating in src/components/game/panel/index.tsx so a step whose predecessor is incomplete is unreachable by tap or swipe. Verify: manual assertion in the entry route that opening the home-team step with the player step empty keeps the active step on player (scenario "Advance blocked until previous step complete").
- [x] 1.3 Collapse the flow to a single submittable step when an away-team error is selected in src/components/game/panel/moves/oppo.tsx. Verify: entry-route assertion that selecting an away error reduces the bar to one step and enables submit (scenario "Away error yields single submittable step"). Delivers requirement "Away-team error collapses the flow to a single step".

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

- [ ] 6.1 Split gestures so an idle Preview tap expands the drawer while an in-progress Preview tap only submits (complete = send, incomplete = no-op), and the handle always toggles the drawer. Verify: entry-route assertion of both idle and in-progress tap behaviors (scenario "Preview tap during input only submits"). Delivers requirement "Gesture split while input is in progress".
- [ ] 6.2 During input show the draft as the pulsing first row distinct from committed entries and, on freeze, turn it into the formal first entry in place. Verify: entry-route assertion of the draft-in-first-row rendering and the freeze transition (scenario "Handle expands drawer during input with draft in first row").
