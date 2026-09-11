---
"volleybro": patch
---

### Fixed

#### Game

- Keep the new-game dialog open when creating the game fails. The match details and lineup you had entered used to vanish along with the dialog, leaving an error notification and an empty form to fill in again

#### Team

- Close the player editor after a successful save, as the other team forms already do. It used to stay open, which read as if the save had not happened

### Changed

#### UI

- Show that a save is in progress on the button that started it, when creating a game, creating or editing a team, and adding or editing a player
- Keep the save button of the team form and the new-player form at the bottom of the dialog instead of scrolling away with the fields
- Stop long dialog titles from running underneath the close and expand buttons, and let keyboard users reach those buttons before the form fields rather than after them
