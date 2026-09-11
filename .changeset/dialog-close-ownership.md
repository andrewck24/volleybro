---
"volleybro": patch
---

### Fixed

#### Game

- Keep the new-game dialog open when creating the game fails. The match details and lineup you had entered used to vanish along with the dialog, leaving an error notification and an empty form to fill in again

#### Team

- After saving, the add-player and edit-player forms now return to where they were opened from, and the browser's back button no longer reopens a form that was just saved. The edit-player form used to stay open after a successful save, which read as if the save had not happened

### Changed

#### UI

- Show that a save is in progress on the button that started it, when creating a game, creating or editing a team, and adding or editing a player
- Keep the save button of the team form and the new-player form at the bottom of the dialog instead of scrolling away with the fields
- Stop long dialog titles from running underneath the close and expand buttons, and let keyboard users reach those buttons before the form fields rather than after them
