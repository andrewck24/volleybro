---
"volleybro": patch
---

### Changed

#### Infrastructure

- `pnpm blueprint:gate <slug>` runs a Blueprint gate in one step: it refuses an unpushed branch, publishes the Change page, runs the gate check and prints the branch preview to compare; `--gate G1` sets a new G1 baseline for a page that already has a Review tab
- `check:workflow` drops its Spectra-era checks and the check on the Pre-PR section's wording
