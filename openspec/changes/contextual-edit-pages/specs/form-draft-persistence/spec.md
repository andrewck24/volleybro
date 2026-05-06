# Form Draft Persistence

## Purpose

Define the behavior of sessionStorage-based form draft persistence for edit forms. All edit forms (team create/edit, player create/edit, lineup) SHALL automatically persist form values to sessionStorage as the user types, and SHALL restore those values on mount. This enables state recovery across modal-to-workspace transitions and accidental navigation.

## ADDED Requirements

### Requirement: Draft automatically saved on form value change

The `useFormDraft` hook SHALL subscribe to React Hook Form's `form.watch` and write the current form values to sessionStorage on every change. The storage key SHALL follow the format `draft:{type}:{id}` where `type` is the entity type (e.g., `team`, `player`, `lineup`) and `id` is the entity ID or `new` for creation forms.

#### Scenario: User types in team edit form

- **WHEN** the user types in any field of the team edit form
- **THEN** the current form values SHALL be written to `sessionStorage["draft:team:{teamId}"]` as a JSON string

#### Scenario: Draft key format for creation forms

- **WHEN** the user fills in the player creation form for a team with ID `abc123`
- **THEN** the draft SHALL be stored under the key `draft:player:new:abc123`

##### Example: draft key formats

| Form | Key |
| ---- | --- |
| Team edit (teamId = `t1`) | `draft:team:t1` |
| Team create | `draft:team:new` |
| Player edit (playerId = `p1`) | `draft:player:p1` |
| Player create (teamId = `t1`) | `draft:player:new:t1` |
| Lineup (teamId = `t1`) | `draft:lineup:t1` |

---

### Requirement: Draft restored on form mount

When the `useFormDraft` hook initializes, it SHALL read from `sessionStorage` using the draft key. If a value is found, it SHALL be parsed as JSON and used as the `defaultValues` for the React Hook Form instance. If no value is found, the caller-supplied `defaultValues` SHALL be used.

#### Scenario: Modal opens after previous partial fill

- **WHEN** the user previously filled the team edit Dialog partially and navigated away (soft nav)
- **WHEN** the user reopens the team edit Dialog
- **THEN** the form SHALL initialize with the previously entered values

#### Scenario: Workspace page mounts after maximize

- **WHEN** the user filled the Dialog form and clicked the maximize button
- **WHEN** the workspace edit route mounts
- **THEN** the form SHALL initialize with the same values that were in the Dialog at the time of maximize

#### Scenario: No draft — form initializes with server data

- **WHEN** no draft exists in sessionStorage for the key
- **THEN** the form SHALL initialize with the `defaultValues` provided by the caller (e.g., existing entity data from SWR)

---

### Requirement: Draft cleared on submit success

After a successful form submission, the caller SHALL invoke `clearDraft()` returned by `useFormDraft`. `clearDraft()` SHALL call `sessionStorage.removeItem(key)` to delete the draft entry.

#### Scenario: Team edit submitted successfully

- **WHEN** the user submits the team edit form and the API responds with success
- **THEN** `sessionStorage["draft:team:{teamId}"]` SHALL be removed
- **THEN** subsequent mounts of the same form SHALL use server data as `defaultValues`

---

### Requirement: Draft cleared on explicit discard

When the user confirms discarding changes in the AlertDialog confirmation (see `contextual-edit-pages` spec), `clearDraft()` SHALL be called before closing the Dialog or navigating away.

#### Scenario: User discards changes in Dialog

- **WHEN** the user confirms the discard AlertDialog
- **THEN** `clearDraft()` SHALL be called
- **THEN** reopening the same edit Dialog SHALL initialize the form with the original server data

---

### Requirement: Draft automatically expires with sessionStorage lifecycle

Draft data is stored in sessionStorage and SHALL be automatically cleared when the browser tab is closed. No additional TTL or expiry mechanism is required. The system SHALL NOT implement localStorage-based persistence for form drafts.

#### Scenario: Tab closed clears all drafts

- **WHEN** the user closes the browser tab
- **THEN** all `draft:*` sessionStorage entries SHALL be removed by the browser automatically
- **WHEN** the user opens a new tab to the same form
- **THEN** the form SHALL initialize with the server data, not any prior draft
