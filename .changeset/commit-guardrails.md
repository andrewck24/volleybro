---
"volleybro": patch
---

### Changed

#### Infrastructure

- Commit messages are checked before a commit exists: a `commit-msg` hook runs commitlint on the conventional type, a required body, and the absence of AI attribution, and CI re-runs the same checks over every commit of a pull request into `dev`. Scope stays free-form, except for retired tool names
- A branch named `feat/<slug>`, `fix/<slug>` or `refactor/<slug>` is a Change branch, and every commit on it must carry a `Blueprint-Change: <slug>` trailer naming that same slug. Fix-path work moves to `hotfix/<slug>`, whatever its commit type, and needs no trailer
- A `pre-commit` hook formats and lints only the staged files; typechecking and tests stay in the verify gates
- The automated release commit is now `chore(release): update versions` with a body, so the release sync back into `dev` passes the same commit checks
- Commit rules that the tooling now enforces are removed from `CONTRIBUTING.md`, which points at the commitlint configuration instead of repeating the type table
