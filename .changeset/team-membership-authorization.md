---
"volleybro": patch
---

### Security

#### Team

- Only members of a team can read its information, its roster and the details of a player on it; people outside the team, and anyone not signed in, no longer can
- Someone who has been invited but has not accepted yet no longer counts as a member: they cannot record games, edit lineups or manage the roster until they accept
- The team owner can no longer be demoted or deleted by an administrator, and nobody can change their own role or delete their own player — leaving a team is what the leave action is for

### Fixed

#### Team

- Inviting someone who already has an account now reaches them: the invitation appears in their invitation list instead of waiting for an account that already exists
- Signing up with an email that differs only in letter case from the invited address now still picks up the invitation
- Transferring ownership to the current owner is refused instead of leaving the team without an owner
- Inviting a person who is already on the roster, or an address that already has a pending invitation, now explains that instead of creating a second entry for the same person
- A player on the roster without an account no longer shows a role, and a role is only offered when an invitation is actually being sent
- Being removed from a team no longer leaves that team selected: the app falls back to another team you have joined, and team pages that cannot be read now show an error instead of a blank or broken screen

### Changed

#### Team

- The team owner is called 擁有者 rather than 隊長, the plain member role is called 一般成員, and removing a player from the roster is called 刪除球員
