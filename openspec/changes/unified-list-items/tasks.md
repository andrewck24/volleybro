## 1. PersonItem Component (Presentation layer)

- [x] [P] 1.1 Write tests for PersonItem component — renders name, avatar fallback, image, href as Link, onClick as button, static as div, action slot stopPropagation (PersonItem component renders person information in a unified layout)
- [x] [P] 1.2 Implement PersonItem component structure at `src/components/custom/person-item.tsx` — horizontal flex, h-12, avatar circle, truncated name, children metadata slot, action slot with event isolation

## 2. TeamItem Component (Presentation layer)

- [x] [P] 2.1 Write tests for TeamItem component — fetches team name via useTeam, shows skeleton while loading, renders team name, supports href/onClick navigation pattern (TeamItem component displays team information fetched by teamId)
- [x] [P] 2.2 Implement TeamItem component structure at `src/components/custom/team-item.tsx` — uses useTeam(teamId), RiGroupLine icon, same visual layout as PersonItem, loading skeleton

## 3. Refactor Invitations (Presentation layer)

- [x] 3.1 Refactor Invitations to use TeamItem in flex list layout — replace Table structure, display team name instead of player name, accept/reject in action slot (Invitations display team names using TeamItem, Invitations refactor to flex list)
- [x] 3.2 Update Invitations tests if existing

## 4. Refactor Menu Team List (Presentation layer)

- [x] 4.1 Refactor Menu team list to use TeamItem with onClick — replace Button items, show team name instead of player name, active team visual distinction (Menu team list displays team names using TeamItem, Menu team list refactor)

## 5. Refactor PlayersList (Presentation layer)

- [ ] 5.1 Refactor PlayersList to use PersonItem — replace ListItem import, pass number and position as children/metadata
- [ ] 5.2 Remove old `src/components/team/players/list-item.tsx` after migration

## 6. RosterTable → RosterList (Presentation layer)

- [ ] 6.1 Rename roster-table.tsx to roster-list.tsx, refactor to use PersonItem — number in metadata, ListBadge in action slot, remove Table structure (RosterList uses PersonItem instead of Table, RosterTable → RosterList)
- [ ] 6.2 Update import in `src/components/record/new/index.tsx`

## 7. Verification

- [ ] 7.1 Run `npm test`, `npm run lint`, `npm run build` — all must pass
