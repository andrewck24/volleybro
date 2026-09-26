---
"volleybro": patch
---

### Changed

#### Infrastructure

- Decision records are defined once, by the parser the Blueprint runs: the JSON Schema file and each record's `$schema` line are gone, an unknown field is rejected, and a record that fails names the field and the rule it broke
- The branch holding published Blueprint Change pages can no longer be deleted or force-pushed, and pulling it warns once its history passes 50 MB
- A pull request for a Change links to the Change page on the branch's Blueprint preview
