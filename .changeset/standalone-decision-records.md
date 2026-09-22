---
"volleybro": patch
---

### Changed

#### Infrastructure

- Decision records now live in one flat `blueprint/content/decisions/` store that belongs to the repository rather than to a Change. A record is written the moment the decision is made and is adopted from that moment: there is no proposed stage, no per-capability copy, and no promotion or renumbering at Archive. The 65 files that held 45 records are now 45 files
- A Feature page renders the decision records whose `capabilities` name it, instead of importing and listing them by hand. One decision governing several capabilities stays one file and appears on every page it names
- The decision-record schema moves to version 2: `targets` is now `capabilities`, only `schemaVersion`, `id`, `title`, `capabilities` and `decision` are required, and `originDecision` is gone. A decision may be a title, a capability and a paragraph. Records already published inside Change pages on the store branch stay at version 1 and keep rendering through the compatibility layer
- The Fix path may write and correct a decision record — a typo, a stale reference, a wrong `capabilities` entry, or a decision that was made but never written down. Editing a record's `decision` body or setting `supersededBy` still escalates to a normal Change
- A Fix-path commit carries `Refs: <tracker issue>` only when the fix came from a tracker issue, and no reference trailer when it was found and agreed inside a session
- Research and working notes no longer earn a file of their own. Investigation results go back to their tracker issue, and the sources behind a decision go in the Proposal page's `## References` section, which a Change that consulted no outside source simply does not have
