# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

An installable Progressive Web App (Serwist): the same web app runs in a phone browser at the sideline, installed to the home screen, or on a laptop after the match.

## Users

- **Sideline recorders** — a coach, team manager, or player of a school team (high school, college or department team) or an amateur club team, recording a live match rally by rally on the phone already in their pocket. This is the primary user.
- **The same team after the match** — reviewing what happened: team statistics by skill, set-by-set scores, and every rally of the match.
- **Team admins** — create a team, invite members, manage roles and per-match lineups. A supporting job, not the reason people arrive.

## Product Purpose

Replace the paper scoresheet — or no record at all — with a recording flow fast enough to keep up with live play, so a coach can keep coaching. Success: a recorder captures a whole match without falling behind, and the statistics exist the moment the match ends, with no separate tidy-up.

## Positioning

- Each rally is three taps: pick the player, log our side's move, log the opponent's response.
- Statistics are a by-product of recording, never a second data-entry step.
- Sending never waits for the network: a rally is applied locally at once and synced in the background.
- Set and match results are derived from the rallies by the server, never entered by hand.

The alternatives users have today are a paper scoresheet tidied up by hand after the match, or no record at all.

## Operating Context

- Live matches at the sideline: one hand, divided attention, unreliable gym connectivity.
- 6-player indoor volleyball: 25-point sets with a two-point lead, 15 in a deciding set; lineups, rotation, substitutions and a libero.
- Teams are organised around a roster of players; a player may or may not be linked to a user account (terms defined in `CONTEXT.md`).

## Capabilities and Constraints

Shipped:

- Rally recording (three-step entry, inline substitutions), offline-tolerant sending with a persisted pending-writes queue.
- Match analysis: match overview, team statistics by skill (serving, blocking, attack, reception, defense, setting, unforced errors), set-by-set scoring, the full rally list.
- Team management: teams, invitations by user search, roles (owner / admin / member), per-match lineups.
- Sign-in with Google only.

Planned, not shipped (may be described with an `開發中` marker, never as available):

- Per-player and cross-match statistics with advanced charts.
- Several devices recording the same match at once, with a read-only live view for members.

Constraints:

- The product is in public preview (shown as `Beta`); the 1.0 public release has not happened.
- Interface language is Traditional Chinese (zh-TW) only; i18n is a later milestone.
- The domain glossary in `CONTEXT.md` is authoritative for product terms.

## Brand Commitments

- Name: VolleyBro.
- The V mark (`public/brand/`, `src/components/brand/`): built from the Saira Stencil One lowercase `v`, with a fixed coral `#FC7A56` right arm and theme-adaptive neutral parts.
- Voice: direct and concrete, from the recorder's side of the court; say what a tap does and what comes out of it, not generic claims such as 「數位化解決方案」.

## Evidence on Hand

- Real app screenshots, light and dark: `public/landing/features/` (`game-demo-*`, `team-demo-*`).
- The real recording and statistics components can be rendered with fixture data as live demonstrations.
- **No public usage evidence exists**: no testimonials, team names, user counts, ratings or press. Future work must not fabricate any of these.

## Product Principles

1. Never make the recorder fall behind the match: fewer taps beats more options.
2. Record once; everything else — statistics, set results, history — is derived.
3. Be honest about state: planned features say so, and sync status never claims more than the queue knows.
4. The phone at the sideline is the reference device; the laptop after the match is second.

## Accessibility & Inclusion

Target WCAG 2.x AA, including text and non-text contrast. Known gap: some colour-token pairings fail AA and are tracked as their own issue. Motion must respect `prefers-reduced-motion`.
