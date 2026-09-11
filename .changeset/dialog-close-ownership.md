---
"volleybro": patch
---

### Fixed

#### Game

- Keep the new-game dialog open when creating the game fails. The match details and lineup you had entered used to vanish along with the dialog, leaving an error notification and an empty form to fill in again

#### Team

- Close the edit-player dialog after a successful save. It used to stay open, which read as if the save had not happened
- Close the edit-player dialog after removing a member, and return to the team page. The dialog used to stay open over the team page, still showing the removed player
- In a dialog, the browser's back button no longer reopens the add-player or edit-player form after it has been saved

#### UI

- On a full-page form opened with a dialog's expand button, the back arrow now leaves the form instead of reloading it

### Changed

#### Team

- Adding a player now takes you to the new player's page instead of the team page
- Saving the edit-player form now returns to the player's page, and on its full page the back arrow leads there too, instead of to the team page

#### UI

- Show that a save is in progress on the button that started it, when creating a game, creating or editing a team, and adding or editing a player
- Keep the save button of the team form and the new-player form at the bottom of the dialog instead of scrolling away with the fields
- Stop long dialog titles from running underneath the close and expand buttons, and let keyboard users reach those buttons before the form fields rather than after them
