---
"volleybro": patch
---

### Fixed

#### UI

- Say what went wrong, in Chinese, when an action is refused. Almost every failure used to show an English sentence written for developers — a member who is not the team owner was told to refresh the page, when what they needed was that only the owner can transfer ownership
- Stop the same failure from being described two different ways depending on whether it appeared in a dialog or a notification. A session that expired mid-action used to produce a notification, an English line inside the open dialog, and a redirect, all at once
- Say that the lineup has changed, rather than that the set cannot be found, when a substitution or a lineup edit references a player who is no longer there. This happens when another device has changed the roster or the lineup since this one last loaded it
- Report a failed substitution instead of silently undoing it. The optimistic update rolled back with nothing shown, so the substitution simply appeared not to have happened

#### Infrastructure

- Keep sentences written for developers out of API responses. They named internal statuses and fields, and were shown to whoever hit the error
