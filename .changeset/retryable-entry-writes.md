---
"volleybro": minor
---

### Added

#### Record

- Keep recording without waiting for the server between rallies, so a weak connection at the venue no longer holds up play
- Flag anything that has not been saved yet, with a count and a way to retry it, and stay out of the way while there is nothing to report
- Show how many sets each side has won as filled cells beside each score, replacing the numeric set score
- Mark a rally that could not be saved on its own row in the per-rally record, with a retry beside it
- Hold the next set until the last one's result has been recorded, rather than letting it start on a result that was never saved, and ask before the back gesture leaves it unsaved

### Fixed

#### Record

- Stop the same rally being recorded twice after a failed submission: recording the ball that ended a set could save the rally, report failure anyway, and invite recording it again
- Keep a rally that arrived late in its right place in the set instead of after the ones recorded since
- Retry saving a set's result instead of giving up on the first failure
- Report why a rally could not be saved instead of always showing the same generic message, and stop a lost connection looking like an unexpected error
- Report a failed substitution instead of silently doing nothing
- Keep an edit on screen when it cannot be saved, rather than discarding it and showing a message that disappears
