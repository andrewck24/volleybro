---
"volleybro": patch
---

### Fixed

#### Record

- Keep rallies that have not reached the server on screen. Reopening the game, coming back onto the network, returning after a few minutes away, or recording while an earlier rally is still being sent no longer makes them disappear
- Show the failed-write marker and its retry on the rally it belongs to, in the cases where that row had gone missing along with the rally
- Show the set score a set has actually reached, instead of leaving it a set short when the server never recorded the result
