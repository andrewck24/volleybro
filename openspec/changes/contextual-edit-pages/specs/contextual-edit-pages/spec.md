# Contextual Edit Pages

## Purpose

Define the behavior of the modal-first edit page pattern. Edit pages (team create/edit, player create/edit, lineup) SHALL open as Dialogs within the tab context when navigated to via soft navigation, and as full-screen pages when accessed via direct URL. Users SHALL be able to maximize the Dialog to the full-page route while preserving form state.

## ADDED Requirements

### Requirement: Edit routes open as Dialog on soft navigation

When the user navigates to an edit route (team create, team edit, player create, player edit, lineup) via soft navigation from within the `(tabs)` layout context, the system SHALL render the edit UI as a shadcn Dialog via the `@modal` parallel slot. The underlying tab content SHALL remain mounted and visible behind the Dialog overlay. The bottom navigation bar SHALL remain visible.

#### Scenario: Navigate to team edit from within tab context

- **WHEN** the user is within the `(tabs)` layout and navigates to `/team/{teamId}/edit` via soft navigation (e.g., pressing an edit button that calls `router.push`)
- **THEN** the `@modal` intercepting route SHALL capture the navigation
- **THEN** the system SHALL render the team edit form inside a Dialog overlay
- **THEN** the team tab content SHALL remain visible behind the Dialog
- **THEN** the URL SHALL update to `/team/{teamId}/edit`

#### Scenario: Navigate to lineup from within tab context

- **WHEN** the user soft-navigates to `/team/{teamId}/lineup`
- **THEN** the system SHALL render the lineup configuration inside a Dialog overlay
- **THEN** the URL SHALL update to `/team/{teamId}/lineup`

#### Scenario: Navigate to player create from within tab context

- **WHEN** the user soft-navigates to `/team/{teamId}/players/new`
- **THEN** the system SHALL render the player creation form inside a Dialog overlay

#### Scenario: Navigate to player edit from within tab context

- **WHEN** the user soft-navigates to `/team/{teamId}/players/{playerId}/edit`
- **THEN** the system SHALL render the player edit form inside a Dialog overlay

#### Scenario: Navigate to team create from within tab context

- **WHEN** the user soft-navigates to `/team/new`
- **THEN** the system SHALL render the team creation form inside a Dialog overlay

---

### Requirement: Edit routes render as full-page on direct URL access

When the user accesses an edit route via direct URL (hard navigation, browser refresh, or typing in address bar), the system SHALL render the full-page version of the edit page at the `app/team/` route. The full-page version SHALL NOT display the bottom navigation bar. The full-page version SHALL display a `<Header>` component with a back button and page title.

#### Scenario: Hard navigation to team edit

- **WHEN** the user navigates directly to `/team/{teamId}/edit` (hard navigation or browser refresh)
- **THEN** the system SHALL render `src/app/team/[teamId]/edit/page.tsx`
- **THEN** the bottom navigation bar SHALL NOT be visible
- **THEN** a Header component SHALL be visible with the page title and a back button

#### Scenario: Hard navigation to lineup

- **WHEN** the user navigates directly to `/team/{teamId}/lineup`
- **THEN** the system SHALL render the full-page lineup page without the bottom navigation bar

#### Scenario: Hard navigation to player edit

- **WHEN** the user navigates directly to `/team/{teamId}/players/{playerId}/edit`
- **THEN** the system SHALL render the full-page player edit page without the bottom navigation bar

---

### Requirement: Dialog contains maximize affordance

The Dialog header SHALL contain a maximize button that navigates the user to the full-page version of the same route. The Dialog SHALL close as part of the navigation. Form state SHALL be preserved through form draft persistence (see `form-draft-persistence` spec).

#### Scenario: User maximizes team edit Dialog

- **WHEN** the user opens the team edit Dialog and clicks the maximize button
- **THEN** the system SHALL navigate to `/team/{teamId}/edit` via hard navigation
- **THEN** the Dialog SHALL close
- **THEN** the full-page team edit form SHALL mount with form values restored from the draft

#### Scenario: Maximize does not appear on full-page version

- **WHEN** the user is viewing the full-page edit route (not the Dialog)
- **THEN** no maximize button SHALL be rendered; the Header back button serves as the exit

---

### Requirement: Dialog close with dirty form shows confirmation

When the user attempts to close the Dialog while the form has unsaved changes (`form.formState.isDirty` is true), the system SHALL show a shadcn AlertDialog asking the user to confirm discarding changes. If the user confirms, the draft SHALL be cleared and the Dialog SHALL close. If the user cancels, the Dialog SHALL remain open.

#### Scenario: Close dirty Dialog — user confirms

- **WHEN** the user has entered data in an edit form Dialog and clicks the close button
- **WHEN** `form.formState.isDirty` is true
- **THEN** the system SHALL show an AlertDialog with a discard confirmation message
- **WHEN** the user clicks the confirm button in the AlertDialog
- **THEN** `clearDraft()` SHALL be called
- **THEN** the Dialog SHALL close and the URL SHALL navigate back

#### Scenario: Close dirty Dialog — user cancels

- **WHEN** the AlertDialog is shown and the user clicks the cancel button
- **THEN** the Dialog SHALL remain open and the form SHALL retain all entered values

#### Scenario: Close clean Dialog — no confirmation

- **WHEN** the user clicks the Dialog close button and `form.formState.isDirty` is false
- **THEN** the Dialog SHALL close immediately without showing a confirmation AlertDialog

---

### Requirement: Full-page layout without bottom navigation

The `src/app/team/` route tree SHALL use `src/app/team/[teamId]/layout.tsx` as a structural wrapper that provides `<main>` with safe-area-aware padding for the fixed Header. This layout SHALL NOT render the bottom navigation bar or the sidenav. Each edit page under this layout SHALL render its own `<Header>` component with a page-specific title and `backHref`.

#### Scenario: Full-page edit page layout

- **WHEN** the user views any full-page edit route under `src/app/team/`
- **THEN** the page SHALL have top padding equal to `calc(env(safe-area-inset-top) + 3rem)` to account for the fixed Header
- **THEN** no bottom navigation SHALL be visible

---

### Requirement: Slot default prevents 404 on hard refresh

The `@modal` slot SHALL contain a `default.tsx` at `src/app/(tabs)/@modal/default.tsx` that returns `null`. This prevents Next.js from returning a 404 when the user hard-refreshes on a route that the `@modal` slot does not match.

#### Scenario: Hard refresh with no active modal

- **WHEN** the user hard-refreshes on any tab route (e.g., `/team/{teamId}`)
- **THEN** the `@modal` slot SHALL render its `default.tsx` (null) without error
- **THEN** no Dialog SHALL appear
