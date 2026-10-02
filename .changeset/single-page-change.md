---
"volleybro": patch
---

### Changed

#### Infrastructure

- A Blueprint Change is now one page with a Proposal tab and, from G2, a Review tab; it opens on Proposal and `#review` opens the Review tab
- The Review tab leads with what the developer must decide or do and where to focus the review, then deviations, a result per scenario and the test plan, with verification detail and findings collapsed
- Decision records render as collapsible cards; a superseded record links to the one that replaced it, and Feature pages anchor every record
- Figures on a Change page come from `facts.json`, written at every publish, and the gate check fails a Review missing a scenario result or a required section, or a Proposal changed after G1
