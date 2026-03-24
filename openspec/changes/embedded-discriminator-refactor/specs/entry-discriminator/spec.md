## ADDED Requirements

### Requirement: Entry embedded discriminator validation

This is an internal refactor — no external capability changes. The Mongoose `entries` array SHALL use embedded discriminators to validate entry subdocuments by type. External behavior remains identical.

#### Scenario: Internal refactor preserves existing behavior

- **WHEN** entries are read from or written to the database
- **THEN** all existing functionality SHALL continue to work identically
