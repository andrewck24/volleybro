# VolleyBro CHANGELOG

## [0.14.2](https://github.com/andrewck24/volleybro/compare/v0.14.1...v0.14.2) 2026-07-23

### Fixed

#### Record

- Fix newly created games having no players, so the first set's lineup and the recording roster now show the selected members
- Carry the previous set's lineup forward when adding a new set, instead of opening the set options with an empty court

### Changed

#### Brand

- Rebuilt the V mark from the variable Saira Stencil family's lowercase `v` (wght 700), giving the logo a near-square footprint; the wordmark keeps its letterforms with the new mark aligned to cap height
- iOS launch screens now compose the mark from the shared brand geometry and add the wordmark near the bottom
- Android/Chrome PWA splash matches iOS: manifest `background_color` is the brand teal and new maskable icons render as a bare V on the splash
- All app icons (favicon, PWA, Apple touch) regenerated from the new mark via a committed script (`pnpm generate-icons`)

## [0.14.1](https://github.com/andrewck24/volleybro/compare/v0.14.0...v0.14.1) 2026-07-17

### Changed

#### PWA

- Serve the service worker from `/serwist/sw.js`; existing installs pick up the new worker automatically on their next online visit
- Cache navigation page shells on first visit instead of at install time, so a freshly installed app reaches a page offline only after visiting it online once

## [0.14.0](https://github.com/andrewck24/volleybro/compare/v0.13.0...v0.14.0) 2026-07-17

### Changed

#### PWA

- Generate Apple PWA splash screens on the fly so they always match the current brand color, and extend coverage from 9 to 15 devices through the iPhone 17 generation and common iPad sizes

#### UI

- Rework surface backgrounds into a three-layer elevation model (page, floating, card) for consistent depth across the app
- Unify Dialog, AlertDialog, and Drawer onto a shared three-section layout (header, scrollable body, footer) with the scrollbar flush to the surface edge
- Remove decorative rings from container surfaces; separation now comes from the elevation layers and overlay scrim

### Added

#### Team

- Open team and player edit routes as dialogs within tab context, with a maximize button to expand to the full workspace page
- Preserve in-progress form edits across the dialog-to-workspace transition and accidental navigation, and warn before leaving a form with unsaved changes

#### Game

- Add a three-step segmented progress bar to the recording input panel (player → our team → opponent), collapsing to a single step once an opponent error is selected; switch steps by tapping the bar or swiping, with forward navigation blocked until the current step is complete
- Submit rallies from a redesigned Preview that mirrors the entry layout, showing the running score in three states (idle, undecided, decided) with a completion highlight on submit
- Move the set Summary out of the Options dialog into a bottom drawer anchored to the Preview; each entry reveals swipe actions and taps to expand inline, showing who recorded it and when
- Reflect the "last entry" rule in Summary actions: the latest rally offers edit and delete, earlier rallies offer edit and rewind-to-here

#### Auth

- Redirect to the sign-in page with a session-expiry notice when a request fails with 401, instead of leaving the user on a broken page

#### Navigation

- Keep each tab's scroll position and content mounted when switching tabs, so navigating away and back no longer resets the page
- Render a collapsible sidebar navigation on desktop (≥768px) in place of the bottom bar
- Tap the active tab to return it to its root route and scroll to the top, matching native iOS behavior
- Animate tab switches with a directional slide in standalone PWA mode

### Fixed

#### API

- Return `400 VALIDATION` instead of a `500` server error when a route receives a malformed ObjectId path parameter

#### PWA

- Show the correct backdrop behind translucent system chrome in standalone PWA mode, and extend overlays above the iOS safe-area inset so no gap shows at the top
- Restore pull-to-refresh on the home and team tabs, which had stopped working after the tab-navigation change; the page now follows the pull gesture with a damped animation and only activates in standalone PWA mode

## [0.13.0](https://github.com/andrewck24/volleybro/compare/v0.12.1...v0.13.0) 2026-04-07

### Changed

#### Game

- Rename "Record" domain to "Game" across all routes, pages, and APIs; previous URLs under `/record/` now resolve at `/game/`

#### Infrastructure

- Replace `_id` with `id` in all domain entity types
- Rewrite repository interfaces with domain-language methods, removing generic MongoDB query filters

## [0.12.1](https://github.com/AndrewCK24/volleybro/compare/v0.12.0...v0.12.1) 2026-04-05

### Changed

#### Infrastructure

- Migrate package manager from npm to pnpm (`pnpm@10.33.0`); use `pnpm install` to set up dependencies
- Replace semantic-release with changesets for version management; run `pnpm changeset` before submitting PRs with user-visible changes

---

## [0.12.0](https://github.com/andrewck24/volleybro/compare/v0.11.2...v0.12.0) (2026-04-04)

### Bug Fixes

- address code review findings — validation errors, teamId guards, sumTeamStats types, mutate guard ([8efa31d](https://github.com/andrewck24/volleybro/commit/8efa31d217ff8e2c9acc89570a2862c6ca713d4c))
- **applications:** fix strict mode type errors in application layer ([44567c2](https://github.com/andrewck24/volleybro/commit/44567c2a37cb9dc07502f4ff66ba3a59d816abc3))
- **components:** address item review feedback ([f67bead](https://github.com/andrewck24/volleybro/commit/f67bead37f251d39563fe623f5df771f74d071d5))
- **deps:** add overrides to allow ts-jest with TypeScript 6 ([964b65b](https://github.com/andrewck24/volleybro/commit/964b65b2f72e208f3229b317dc6613d2402413d1))
- **entities:** fix strict mode type errors in domain layer ([eb45ee7](https://github.com/andrewck24/volleybro/commit/eb45ee7bb945e7b5c1e5d5b80f0b17f3756ae165))
- **infrastructure:** fix strict mode type errors in infrastructure layer ([d213d48](https://github.com/andrewck24/volleybro/commit/d213d48974dadc631a3bc325c5f9aa243911f1be))
- **interface:** fix strict mode type errors in interface layer ([7278d52](https://github.com/andrewck24/volleybro/commit/7278d52bf79ee9bf5a44cf18ef20cf805d737496))
- **record:** apply strict mode fixes to record components and lib ([3d6e4e5](https://github.com/andrewck24/volleybro/commit/3d6e4e5e6501f019cec2ba2e862888b4215a6c52))
- **record:** close libero dialog programmatically on submit success only ([e386c78](https://github.com/andrewck24/volleybro/commit/e386c7843e711d7a3bdd5dd69ba3636c24f84752))
- **storybook:** address code review findings ([39c04c6](https://github.com/andrewck24/volleybro/commit/39c04c6f3fcf9213f5b101a18a837e7aed4ceb98))
- **storybook:** address code review findings ([db6e712](https://github.com/andrewck24/volleybro/commit/db6e71249fab0d798c5648a7bf9e6f3b0bf6627b))
- **storybook:** fix court story layout to match production ([b72b87f](https://github.com/andrewck24/volleybro/commit/b72b87f99c1a44777a8abd91fdf47c00680315f2))
- **storybook:** replace controlled value with defaultValue in LongValue story ([6c3e375](https://github.com/andrewck24/volleybro/commit/6c3e375f6f529b16e1843cd895919ba667f26f0e))
- **storybook:** resolve TS and lint issues in new story files ([04bf8e2](https://github.com/andrewck24/volleybro/commit/04bf8e20b2b4f2ceee59656681bd0c98fc2edc48))
- **team,match:** apply strict mode fixes to team and match components (Section 7) ([864665d](https://github.com/andrewck24/volleybro/commit/864665d110e1e4d2eb3df4a1fd0562b75f33a226))
- **test:** add missing createdAt/updatedAt to basePlayer in membership-section-loading test ([dc8bcf1](https://github.com/andrewck24/volleybro/commit/dc8bcf1c256168b0197ccfcd0f372b08026aeb84))
- **ui:** address code review issues — flex-none, empty-media slot, loading prop consistency ([bd2dc85](https://github.com/andrewck24/volleybro/commit/bd2dc85c46b08179461fa1fca3bee5cdc1f15b6c))
- **ui:** fix EmptyDescription element type and remove implicit border-dashed from Empty base ([aeaa233](https://github.com/andrewck24/volleybro/commit/aeaa233f15cd8b11ece86c867be1243c822550ba))
- use SET_NOT_FOUND reason for lineup error and fix non-standard w-30 class ([66a0b61](https://github.com/andrewck24/volleybro/commit/66a0b61809ffa3b98aa4996f3e49df2470990442))

### Features

- **auth,user:** add submitting state to sign-in and invitations ([fe6bfd9](https://github.com/andrewck24/volleybro/commit/fe6bfd950e3dfa9eeb58c0ececd209ef5ddcf8c8))
- **home:** replace LoadingCard with co-located skeleton components; delete LoadingCard ([dd2e6d4](https://github.com/andrewck24/volleybro/commit/dd2e6d448bd81dcbf0fb77f7306d50fa1376afce))
- **record,match:** replace LoadingCard with co-located skeleton components ([facc92a](https://github.com/andrewck24/volleybro/commit/facc92aeb5ffa94ed34e49fe4a3000aec2c6014e))
- **record:** add isSubmitting state to set-options panel ([405df74](https://github.com/andrewck24/volleybro/commit/405df746b118fe851f9297fc8d1169d9840b3dde))
- **storybook:** add boundary-state story variants and clarify testing strategy ([9c5cc49](https://github.com/andrewck24/volleybro/commit/9c5cc4905ee44b052075395dd0abea9f344d8f99))
- **storybook:** add custom component stories and complete migration ([0d193f8](https://github.com/andrewck24/volleybro/commit/0d193f8458a7df36dd7f1bfa3cad5d14a035986a))
- **storybook:** add stories for 7 missing ui components ([f28112e](https://github.com/andrewck24/volleybro/commit/f28112e80429b5e0c1496af6e39e12b590f7aba8))
- **team:** add loading states to membership remove and transfer actions ([aa98120](https://github.com/andrewck24/volleybro/commit/aa98120bc618f2f5980308f762a51c44c0ce8fcf))
- **team:** replace LoadingCard with co-located skeleton components ([5b1100f](https://github.com/andrewck24/volleybro/commit/5b1100f6dcb93f977ee76648353b832eaec1661a))
- **ui:** add loading and loadingText props to Button ([19b4f43](https://github.com/andrewck24/volleybro/commit/19b4f439faceebe7a2a1157b16662dac0ed3ba43))

## [0.11.2](https://github.com/andrewck24/volleybro/compare/v0.11.1...v0.11.2) (2026-03-25)

### Bug Fixes

- **ci:** add track_progress to claude-code-review for PR comments ([73bf00c](https://github.com/andrewck24/volleybro/commit/73bf00cd7e6725c9254d348e6e54fa25e6c9bd81))
- **lineup:** fix misaligned header components in lineup panel ([8457d7b](https://github.com/andrewck24/volleybro/commit/8457d7b8a694a68598571fc3f2600e294cb5facb))
- **styles:** use pointer media query to detect touch devices for scrollbar hiding ([38e49d6](https://github.com/andrewck24/volleybro/commit/38e49d6c93a97d01973812ac242ae88eb8805242))

## [0.11.1](https://github.com/andrewck24/volleybro/compare/v0.11.0...v0.11.1) (2026-03-24)

### Bug Fixes

- **lint:** resolve all lint and TypeScript errors (Phase 2) ([21dc89f](https://github.com/andrewck24/volleybro/commit/21dc89f41faf9f65b3a0ab0da5e7d54bbd03b2bd))
- **record:** address PR review — fix substitution condition bug and improve migration script ([ca5074e](https://github.com/andrewck24/volleybro/commit/ca5074e4445124853d9efc8d518cbb0207b96604))
- **record:** remove BaseMongoRepository from barrel index and fix circular imports ([4229dc9](https://github.com/andrewck24/volleybro/commit/4229dc9ea9430479d5ba142f994981c217ea8fac))
- **test:** resolve type errors in create-player and search-user usecase tests ([219dff6](https://github.com/andrewck24/volleybro/commit/219dff6f52d04fc67908e363118b1816d484fb07))

## [0.11.0](https://github.com/andrewck24/volleybro/compare/v0.10.0...v0.11.0) (2026-03-21)

### Bug Fixes

- **auth:** enforce role check in verifyTeamRole for MEMBER level ([ea5a508](https://github.com/andrewck24/volleybro/commit/ea5a508835fd8e23d6895bdbd9596e8f46adc4bb))
- **invitation:** add authorization check to accept/reject use cases ([e8e8f15](https://github.com/andrewck24/volleybro/commit/e8e8f152de7c6b637024881d97800442c17198f6))
- **leave-team:** clear activeTeamId on leave and route through controller ([f83a19f](https://github.com/andrewck24/volleybro/commit/f83a19fea1d8aae91dcf44afafc8ed4ecdcb6eaf))
- **player-repo:** use PlayerStatus.INVITED in existsInvitation query ([40b4745](https://github.com/andrewck24/volleybro/commit/40b474570ea64aec23fc007a79f43948c934f501))
- **player:** allow null values in PlayerSchema and migrate to Zod v4 top-level APIs ([2c867cc](https://github.com/andrewck24/volleybro/commit/2c867cc20a7011a302d799384a81372ec7ef7d91))
- **player:** complete data migration and fix matches API errors ([3188f97](https://github.com/andrewck24/volleybro/commit/3188f970806d1d5dbd48d3991cde804991fa80d8))
- **player:** complete Phase 10 data migration and Member entity cleanup ([06cfa89](https://github.com/andrewck24/volleybro/commit/06cfa89d295d2d153f3a983342b1384f1ea05093))
- **player:** export use case implementations from index for DI container ([736510a](https://github.com/andrewck24/volleybro/commit/736510ae4640aa6cf315f10e9683f8dd09fc5f7c))
- **player:** normalize userId to ObjectId for consistent MongoDB queries ([059c3f8](https://github.com/andrewck24/volleybro/commit/059c3f8f03a17099eb77cfb3201e4e74647bfa95))
- **player:** resolve build errors and standardize import paths ([0eaf7de](https://github.com/andrewck24/volleybro/commit/0eaf7de7f7dd4dfe5c47f31459b0237556610e11))
- **player:** resolve TypeScript errors by improving Mongoose schema types ([9c92597](https://github.com/andrewck24/volleybro/commit/9c925976fd63f9c7eb3fb5cf4fe0df5d95cbce28))
- **repo:** handle $unset for undefined values in update() ([e48d784](https://github.com/andrewck24/volleybro/commit/e48d784c018ed507354d65796ea0b524a2a27a0d))
- resolve test failures and lint errors before dev-to-main merge ([98dbfed](https://github.com/andrewck24/volleybro/commit/98dbfed306c8b42695548d7e8f2877e2c5de7d9f))
- **team:** fix members migration bugs in TeamInfo component ([8d87797](https://github.com/andrewck24/volleybro/commit/8d87797ff656ee00c3db9e41618d71ac88504cbd))
- **team:** return flat array from GET /teams/{teamId}/players ([19d863e](https://github.com/andrewck24/volleybro/commit/19d863e8a60e6259a57382e110531faed6ab33c1))
- **ui:** add error handling to set-options form submission ([7288325](https://github.com/andrewck24/volleybro/commit/7288325499e7a558af2d4930affeb107ab680475))
- **ui:** replace window.confirm with AlertDialog for destructive actions ([cf475f2](https://github.com/andrewck24/volleybro/commit/cf475f23c7f284bb86268a44606af578c88123f7))
- **ui:** use inherited color for avatar icon in PersonItem and TeamItem ([ce698ec](https://github.com/andrewck24/volleybro/commit/ce698eca1ea850b8bae8686c63e38c276baac1a4))
- **user:** return full User from GetUserByIdUseCase for self-lookup ([86ead5c](https://github.com/andrewck24/volleybro/commit/86ead5cad245b7aef7d1a6e75e24415a2dbc45ae))

### Features

- **api:** implement withErrorHandler and withAuth route wrappers ([86c2fb4](https://github.com/andrewck24/volleybro/commit/86c2fb4920ab7ec4d08905d07ad680a3cedf6f46))
- **auth:** add account selection prompt for Google OAuth ([3b3065d](https://github.com/andrewck24/volleybro/commit/3b3065dd92f56f301071113fd97e8e32433b575a))
- **build:** fix breaking changes from Profile.teams removal (Group 3b) ([fa33935](https://github.com/andrewck24/volleybro/commit/fa33935033d9bb601a00dd7ec5e33656551f3dfb))
- **errors:** add AppError class hierarchy and Result type ([1abfb43](https://github.com/andrewck24/volleybro/commit/1abfb43f6d0908cc0a26f4ca5f3fdcec3bedd87b))
- **errors:** add AppError class hierarchy in entities layer ([bc05722](https://github.com/andrewck24/volleybro/commit/bc05722d67ab458c5526d6ab0f5a580781dd3fe7))
- **frontend:** implement apiClient and migrate components to structured error handling ([06286f8](https://github.com/andrewck24/volleybro/commit/06286f80bafb44f3c70f350a9e079fa4b5ea769b))
- **infrastructure:** translate Mongoose and auth errors to typed AppError ([94bf6a8](https://github.com/andrewck24/volleybro/commit/94bf6a847f2a855f4bcdebabdc829f3cbacc04b5))
- **infrastructure:** update schemas, repos, and interfaces for player status model ([c852a6c](https://github.com/andrewck24/volleybro/commit/c852a6cc9e2c121c2daf5a4bebb813f234b469a9))
- **player-invitations:** fix build-breaking UI profile.teams references (3b.7-9) ([9028480](https://github.com/andrewck24/volleybro/commit/9028480f1e10ee2785e564c1161daa2baf6b22ce))
- **player-invitations:** Group 4 - application layer use case updates ([ed00a12](https://github.com/andrewck24/volleybro/commit/ed00a12bf8bfd28b8bd463d3874ebfc41e5d3b7b))
- **player-invitations:** Group 5 - refactor auth hook with LinkPendingInvitations ([92c849a](https://github.com/andrewck24/volleybro/commit/92c849a16507ace7f045f322e3732d39b3d7ddd6))
- **player-invitations:** Groups 6-11 - API routes, legacy removal, UI & verification ([e3eb8b8](https://github.com/andrewck24/volleybro/commit/e3eb8b8dc58e9d7404064cb077ea61ebb636eaff))
- **player:** add invitations endpoint and fix AcceptInvitationUseCase bug (Phase 2C) ([ba44022](https://github.com/andrewck24/volleybro/commit/ba44022e0e84096caaf80ea159de2c97b123180f))
- **player:** add invitations/ownership endpoints, fix bugs (Phase 2C+2D) ([0f5f4f5](https://github.com/andrewck24/volleybro/commit/0f5f4f53a52e301b778530a3f80b83a4abb2344a))
- **player:** add lineup cascade cleanup on remove/leave ([753cefa](https://github.com/andrewck24/volleybro/commit/753cefa72979ddf865aeac10a1ebeac53fa0390b))
- **player:** add memberships endpoint and new CreateInvitationUseCase (Phase 2B) ([0911665](https://github.com/andrewck24/volleybro/commit/09116655df30f2f2b3920deb4cf5bb00111634c8))
- **player:** complete Phase 1 setup - Initialize Player feature infrastructure ([1bb9d76](https://github.com/andrewck24/volleybro/commit/1bb9d766c0c529d4f138ab132deab6aa983750c4))
- **player:** complete Phase 2.1 - Entity, Validation, Schema, and Repository foundational layer ([2ba15ee](https://github.com/andrewck24/volleybro/commit/2ba15ee578cf9ebb87852ac41457a42693a0df45))
- **player:** complete Phase 2.2 - Authorization service and DI container integration ([7d5e3d6](https://github.com/andrewck24/volleybro/commit/7d5e3d60743b293a1f5605dd78d31f62de742fea))
- **player:** extend PlayerCard component with US6 and US7 actions ([89904f9](https://github.com/andrewck24/volleybro/commit/89904f980b99cb826f78977c3996b7b5fbdb6494))
- **player:** implement API routes and integration tests for US1 (T019-T020, T025-T026) ([72c8e8b](https://github.com/andrewck24/volleybro/commit/72c8e8b6c0ea3a41216025797614138e85cd1cd9))
- **player:** implement API routes for US2 and US3 (T034, T039, T045-T046, T051-T052) ([69f5687](https://github.com/andrewck24/volleybro/commit/69f56870408af34a39cb843af3e0d92f96a26968))
- **player:** implement core use cases for US1, US2, US3 (T017-T024, T032-T038, T043-T050) ([ed488ce](https://github.com/andrewck24/volleybro/commit/ed488ce31336d48adacdafd4f3e707fa3653d17e))
- **player:** implement Phase 3 UI components for inviting members (T027-T031) ([356a377](https://github.com/andrewck24/volleybro/commit/356a37780df93464070343d7a6b99abdaae1fb81))
- **player:** implement Phase 4 UI components for accepting/rejecting invitations (T040-T042) ([6465211](https://github.com/andrewck24/volleybro/commit/646521128776b50947196b2e6788be9bf0a11c8f))
- **player:** implement Phase 5 UI components for viewing team members (T053-T057) ([ebf4ed6](https://github.com/andrewck24/volleybro/commit/ebf4ed6250a19f77d46671f202ba63f77cd9cb6f))
- **player:** implement Phase 5.5 MVP hotfixes and security enhancements ([77ab98d](https://github.com/andrewck24/volleybro/commit/77ab98d761e0142a71fcc2d26bd85eb6234bd11b))
- **player:** implement Phase 6 - Create Pure Player (US4) feature ([1d11739](https://github.com/andrewck24/volleybro/commit/1d1173929d2a1f42a9ab2f291880840c8b70b243))
- **player:** implement Phase 7 - Manage member roles and info (US5) ([609b2b3](https://github.com/andrewck24/volleybro/commit/609b2b35cc7b3996d37deb66f395d996a45b56f1))
- **player:** implement Phase 8 - Leave team and transfer ownership (US6) ([85fe153](https://github.com/andrewck24/volleybro/commit/85fe153a0630832c7783d06d71a6972beec213a8))
- **player:** implement Phase 8 & 9 API routes - Leave, Transfer, Remove, Cancel ([506029f](https://github.com/andrewck24/volleybro/commit/506029fee2b0837eb24d16930a5df70bfe4e6c0a))
- **player:** implement Phase 9 - Cancel invitation (US7) ([99ea8b4](https://github.com/andrewck24/volleybro/commit/99ea8b42859e638fba3bbe299a8a0a24ea6b6170))
- **player:** implement SWR cache revalidation for optimistic updates (T121) ([b5c18cf](https://github.com/andrewck24/volleybro/commit/b5c18cf66bcaa7badca88e2ee1bf7fc995c676ba))
- **player:** migrate player domain use cases to throw typed AppError ([a17d908](https://github.com/andrewck24/volleybro/commit/a17d908fa59b9979a31ad10970d8329369c760a4))
- **player:** restructure membership section and add remove member action ([4d58310](https://github.com/andrewck24/volleybro/commit/4d583104d96d0bdf2a5dc6ead91a850fa0b3bc39))
- **player:** restructure player components and add usePlayer hook (Phase 3+4) ([3883d44](https://github.com/andrewck24/volleybro/commit/3883d442a96251d783a59c2585da8f4671e488d9))
- **proxy:** add API authentication gate returning 401 JSON ([7eded86](https://github.com/andrewck24/volleybro/commit/7eded8674bbebd1acfe74d3620cba443592912e4))
- **record:** migrate record domain use cases to throw typed AppError ([5bad09d](https://github.com/andrewck24/volleybro/commit/5bad09d28e60922841561cd88555c1d771428f7d))
- **routes:** migrate all API routes to use withAuth/withErrorHandler wrappers ([042ce36](https://github.com/andrewck24/volleybro/commit/042ce36d2011e74ea72910cdd7114d23b481cac7))
- **T120:** Optimize MongoDB indexes verification ([e307a64](https://github.com/andrewck24/volleybro/commit/e307a643d2f2ce2912d41bf46624c6f6568f48e9))
- **T122:** Implement unified API error handling system ([103b75e](https://github.com/andrewck24/volleybro/commit/103b75e6861f5ea8f706fb58cbe2928929472acc))
- **T123:** Implement accessibility improvements for Player components ([e0faced](https://github.com/andrewck24/volleybro/commit/e0faced1a7db31bf2fa145154b3f36796852089f))
- **T124:** add toast notifications for player actions ([ad37995](https://github.com/andrewck24/volleybro/commit/ad379957fd3fecc8cad30bc300c9aacc04790471))
- **team:** migrate team domain use cases to throw typed AppError ([ef7f7a5](https://github.com/andrewck24/volleybro/commit/ef7f7a5ca12dd7553a305b07099ac7e3fb0cab24))
- **ui:** add PersonItem and TeamItem components with tests ([2dc3883](https://github.com/andrewck24/volleybro/commit/2dc3883a5129739ea6f816089313af11a0e9463a))
- **ui:** implement branded 500 error UX with in-place error handling ([ae591d9](https://github.com/andrewck24/volleybro/commit/ae591d9533585c666400156e85c6d065ccbc54db))
- **ui:** show persistent inline errors in AlertDialogs for high-stakes mutations ([538d4cd](https://github.com/andrewck24/volleybro/commit/538d4cd8f8d9997dd27fc765bfb581f47abecc4e)), closes [hi#stakes](https://github.com/hi/issues/stakes)
- **user-profile:** migrate user/profile domain to throw-only AppError pattern ([91ca922](https://github.com/andrewck24/volleybro/commit/91ca92233107bdd3bbc951172aebb328be7d5ab5))

### Performance Improvements

- **T126:** optimize SWR cache strategy and reduce API requests ([6174af1](https://github.com/andrewck24/volleybro/commit/6174af1c959c27c174100ee88e2d6b9ed779c205))

## [0.10.0](https://github.com/andrewck24/volleybro/compare/v0.9.0...v0.10.0) (2025-12-20)

### Features

- **auth:** add layered validation to Profile API ([c66ef5d](https://github.com/andrewck24/volleybro/commit/c66ef5d66f758a239c03caaf2fe36035f701dd23))
- **auth:** implement Clean Architecture profile auto-creation ([b23f02e](https://github.com/andrewck24/volleybro/commit/b23f02e8e2a828a96c0f3c6ff6943d52c02579c1))
- **auth:** migrate from NextAuth.js to Better Auth ([915c999](https://github.com/andrewck24/volleybro/commit/915c99912d7c94fe4866cb34f993ec5f5224492f))
- **auth:** update environment variable for Better Auth client URL ([206efab](https://github.com/andrewck24/volleybro/commit/206efabbcf2f4ba810848f8ca50897ec3d628e62))

### BREAKING CHANGES

#### **auth:** Authentication system migrated from NextAuth.js v5 to Better Auth

- Implement Better Auth with Google OAuth
  - Add Better Auth server config (src/lib/auth.ts)
  - Add Better Auth client (src/lib/auth-client.ts)
  - Configure MongoDB adapter for Better Auth
  - Add auth API route handler ([...all]/route.ts)

- Separate User and Profile entities
  - User: Authentication data (Better Auth managed)
  - Profile: Business data (teams, preferences)
  - Add Profile repository and schema
  - Auto-create profile on first access

- Update all API routes to use Better Auth session
  - Replace auth() with auth.api.getSession()
  - Standardize session checks (session?.user)
  - Implement email-based team inviting with User lookup

- Update components for Better Auth
  - Use authClient for sign-in flow
  - Add error handling to Home component
  - Remove SessionProvider wrapper

- Documentation and migration
  - Update CLAUDE.md with Better Auth flow
  - Archive migration script with documentation
  - Add migration guide in docs/archive/migrations/

Tests passing. Build has pre-existing TypeScript error in info-form.tsx
(unrelated to this migration, tracked for future fix).

## [0.9.0](https://github.com/andrewck24/volleybro/compare/v0.8.2...v0.9.0) (2025-08-25)

### Bug Fixes

- **landing:** add SSR placeholder for CTA Button to prevent hydration mismatch ([254e107](https://github.com/andrewck24/volleybro/commit/254e1073ca9da4bcd59b49022012be79c450db89))
- **landing:** remove legacy features.tsx and restore inline exports ([0c3a1a6](https://github.com/andrewck24/volleybro/commit/0c3a1a612f311eb617aca7bb9de4bcbddbbe3d04))
- **landing:** resolve animate-pulse visibility issue in FeatureDemoImage ([ff55497](https://github.com/andrewck24/volleybro/commit/ff55497e58bb987536b6725d9bb23e02ed534865))
- **landing:** resolve FeatureDemoImage hydration mismatch and optimize image loading ([2212ae6](https://github.com/andrewck24/volleybro/commit/2212ae624a25c3305b6057b2733bc9819136782e))
- **landing:** resolve TypeScript export issue in features components ([041ae91](https://github.com/andrewck24/volleybro/commit/041ae91cc1aae971c97100e5902f665aa73cacbd))
- **tests:** update CTA button text in hero component tests ([3f8cf57](https://github.com/andrewck24/volleybro/commit/3f8cf57e7e2e163cd873d68663acf76bc5ae2c47))
- **ui:** resolve FlipWords animation logic bug when currentWord becomes out of sync ([fd30edc](https://github.com/andrewck24/volleybro/commit/fd30edcde1ff4e7247e1ea0bfe223a98f3a5e75f)), closes [#256](https://github.com/andrewck24/volleybro/issues/256)
- **ui:** resolve React Hooks rules violations in FlipWords components ([c8fdf33](https://github.com/andrewck24/volleybro/commit/c8fdf333c3bf296d1ea2ad266e9dde3eb674479f))

### Features

- **landing:** decouple header/hero and unify CTA button ([38b5b76](https://github.com/andrewck24/volleybro/commit/38b5b76d06e82b686ffe5e30be7e07e5b596750a))
- **landing:** finalize Highlights component with responsive dual-layout architecture ([65dcb23](https://github.com/andrewck24/volleybro/commit/65dcb23053c2c3d39e5aaf671f52d7eeea1d2e48))
- **landing:** implement AnalyticsSection with data analysis features ([c984df6](https://github.com/andrewck24/volleybro/commit/c984df6c8a00d4c7a5e14daf97fbd7246c977fd6))
- **landing:** implement CTASection with TDD and comprehensive QA review ([3e40ce9](https://github.com/andrewck24/volleybro/commit/3e40ce99426d955a9651aa2e10614252e8da24f3))
- **landing:** implement Features component with RecordingSection functionality ([0d2281a](https://github.com/andrewck24/volleybro/commit/0d2281ab55cdfe2cbe22f84d438fd54659d79b57))
- **landing:** implement header glassmorphism effect with mobile optimization ([ed9d5f0](https://github.com/andrewck24/volleybro/commit/ed9d5f0cde86af7c5b979f8f51e063ca8f6566c2))
- **landing:** implement hero section optimization with CSS code splitting ([b7b8dba](https://github.com/andrewck24/volleybro/commit/b7b8dba57c95aa322d8a00c35984866bad99dbde))
- **landing:** implement Highlights component with TDD methodology ([1c65d33](https://github.com/andrewck24/volleybro/commit/1c65d33a282ce30f9f64cd792725da27ecada3b3))
- **landing:** implement TeamManagementSection with team feature cards ([a61850e](https://github.com/andrewck24/volleybro/commit/a61850ef6d5e25797266f3508e2edf4886bb1ace))
- **landing:** improve CTA Button type safety and Hero RWD layout ([46b317a](https://github.com/andrewck24/volleybro/commit/46b317a4c227527a523ff262c84e5f916ecb243a))
- **landing:** modularize Hero component with 7 sub-components ([10ae90e](https://github.com/andrewck24/volleybro/commit/10ae90e6ede4c35b47c16f3f9b1e6c47093778a0))
- **landing:** refactor header layout with preview badge integration ([2d756fa](https://github.com/andrewck24/volleybro/commit/2d756fad54866de11216de71309663ff15947b08))
- upgrade BMad framework to v4.39.0 ([c49d138](https://github.com/andrewck24/volleybro/commit/c49d138b2a0beb0e3cfd6fd8fbbd2b09a9c701d7))

### Performance Improvements

- **landing:** implement LazyMotion architecture for 42% motion bundle reduction ([4b1dd8b](https://github.com/andrewck24/volleybro/commit/4b1dd8b31172e69ee7e660db13a5665e07c9821b))
- **landing:** optimize FeatureDemoImage theme-dependent value calculations ([37a3ab0](https://github.com/andrewck24/volleybro/commit/37a3ab0af63c6056ed6a66a17e4cbdcedb7df1a6)), closes [#256](https://github.com/andrewck24/volleybro/issues/256)
- **ui:** optimize FlipWords components with LazyMotion and SSR compatibility ([56087d0](https://github.com/andrewck24/volleybro/commit/56087d0573f75621b0e4391c5fee0feed9e7bccb))

## [0.8.2](https://github.com/andrewck24/volleybro/compare/v0.8.1...v0.8.2) (2025-08-14)

### Bug Fixes

- **auth:** resolve ObjectId serialization causing team page failures ([91ade6c](https://github.com/andrewck24/volleybro/commit/91ade6c6d11a4cae3823e269df61cef447942047)), closes [#239](https://github.com/andrewck24/volleybro/issues/239)

## [0.8.1](https://github.com/andrewck24/volleybro/compare/v0.8.0...v0.8.1) (2025-08-07)

### Bug Fixes

- **header:** adjust header height to accommodate safe area insets ([6a52884](https://github.com/andrewck24/volleybro/commit/6a528842c1305b3c33086a358a0cc27df526fe94))
- **header:** increase z-index of header for improved visibility ([2ae6dbb](https://github.com/andrewck24/volleybro/commit/2ae6dbb38d54b318d63b1d7786a52ab6280795af))
- **ui:** remove fixed padding from Card in PanelContent ([7f40f45](https://github.com/andrewck24/volleybro/commit/7f40f45e41568fd273f320ca7f943f40327bbed8)), closes [#214](https://github.com/andrewck24/volleybro/issues/214)

## [0.8.0](https://github.com/andrewck24/volleybro/compare/v0.7.0...v0.8.0) (2025-08-01)

### Bug Fixes

- **comp:** adjust styles for `NewRecordForm` and `Calendar` components ([e53574e](https://github.com/andrewck24/volleybro/commit/e53574e47512e332fb1870f67e4616eab2d0f30e))
- **record:** adjust setIndex logic in initialize reducer ([378f9a1](https://github.com/andrewck24/volleybro/commit/378f9a1566d0fb5a29bfcb940b18327c30ccc433))
- **record:** correct params type for Next.js 15 page component ([6eef140](https://github.com/andrewck24/volleybro/commit/6eef140d1466f2364927d5a77320e66d553303b6))
- **record:** ensure proper handling of empty team stats in getTeamsStats function ([c475a80](https://github.com/andrewck24/volleybro/commit/c475a803ce289f9e7e216537256622fe30d48fe3))
- **record:** update setEditingEntryStatus to include setIndex in payload ([45da66a](https://github.com/andrewck24/volleybro/commit/45da66ac9a512fd11ebd96b7a758b8ba5d566866))
- **styles:** remove redundant overflow-y-scroll from body styles ([7450a60](https://github.com/andrewck24/volleybro/commit/7450a604369a693160b8e860e3d7ce26dee1d51d))
- update dependencies for date-fns and react-day-picker ([1ab6f95](https://github.com/andrewck24/volleybro/commit/1ab6f954ae14cff6a7420e476cf3d7b78ef65908))

### Features

- add shadcn/ui components and update global state management ([998ab99](https://github.com/andrewck24/volleybro/commit/998ab9918d0f7920dbd4a39c3e51a8a7e87bdd59))
- **match:** add match record overview page and related components ([5118e5a](https://github.com/andrewck24/volleybro/commit/5118e5a876f7c392f492f56497bf31a60c460319))
- **record:** add `Interval` component integrated with `StatsForOneSet`component ([d4b7d94](https://github.com/andrewck24/volleybro/commit/d4b7d94aede6f332c52888883bd2b554855f7b6b))
- **record:** Add `Summary` component to `Interval` ([df61486](https://github.com/andrewck24/volleybro/commit/df6148661335b002d7ac907e9b19caf92d33d8b0))
- **record:** add match sets overview and layout components ([9d72ccd](https://github.com/andrewck24/volleybro/commit/9d72ccd71efbbb51ead5d3f447f59e57acf4a37c))
- **record:** add set and match completion detection in rally helpers ([992fa10](https://github.com/andrewck24/volleybro/commit/992fa10456fc6d3dae8d590a8bc55edfadccaf7a))
- **record:** add SetEdit component and integrate with SetsList for editing functionality ([ee27759](https://github.com/andrewck24/volleybro/commit/ee277594f3892a205bc1f04f24d512c8124321e6))
- **record:** integrate accordion for sets list and enhance UI interactions ([3343c1a](https://github.com/andrewck24/volleybro/commit/3343c1ad6b173be331e6a11b846b1887680d4223))
- **record:** integrate SetOptions dialog in Interval component and improve panel styling ([e004c19](https://github.com/andrewck24/volleybro/commit/e004c19db0db240d20b9c9a206a2e2f666931070))

## [0.7.0](https://github.com/AndrewCK24/volleybro/compare/v0.6.1...v0.7.0) (2025-03-27)

### Bug Fixes

- **entities:** make Set.options.time property optional ([b5d7053](https://github.com/AndrewCK24/volleybro/commit/b5d7053396cb68707fe6841ed26e094c136bbbe1))
- **record:** handle undefined sets in serving status calculation ([f76257f](https://github.com/AndrewCK24/volleybro/commit/f76257ff43dc9a16b71f87c8fbe6bc17d757be1a))

### Features

- **record:** implement infinite scrolling for match listing ([db42a27](https://github.com/AndrewCK24/volleybro/commit/db42a274a539c9b5c18fb0d2c91795274f2933ba))

## [0.6.1](https://github.com/AndrewCK24/volleybro/compare/v0.6.0...v0.6.1) (2025-03-17)

### Bug Fixes

- **pwa:** add apple-mobile-web-app-capable meta tag to enable iOS splash screen ([61dc50d](https://github.com/AndrewCK24/volleybro/commit/61dc50d99159c3f878e012b9dd38dbf0284ddfbd))

## [0.6.0](https://github.com/AndrewCK24/volleybro/compare/v0.5.2...v0.6.0) (2025-03-16)

### Bug Fixes

- **auth:** resolve type conflicts by consolidating auth type declarations ([4e8e6c5](https://github.com/AndrewCK24/volleybro/commit/4e8e6c582aa151749888296c6f60d5ec58cd7fb2))

### Features

- **core:** implement dependency injection with InversifyJS ([3bc3849](https://github.com/AndrewCK24/volleybro/commit/3bc3849b2853aa4bf22939608c0c74fe7aa8d160))

## [0.5.2](https://github.com/AndrewCK24/volleybro/compare/v0.5.1...v0.5.2) (2025-03-04)

### CI

- **ci:** integrate `semantic-release` for automated versioning ([19dafca](https://github.com/AndrewCK24/volleybro/commit/19dafcae0c8382008cac648362196db8c5bc02b7))
