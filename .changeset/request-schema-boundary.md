---
"volleybro": patch
---

### Fixed

#### Game

- Answer a malformed recording request with the field that is wrong, instead of a generic "unexpected error". Sending a set, a rally, a substitution, or a new game in the wrong shape used to reach the database before anything noticed
- Record "no player attributed" one way instead of two, so a rally that credits nobody reads the same everywhere it is stored and displayed
- Stop a game from being created with a temperature reading, a duplicated roster, or a nested copy of both teams — three fields the recording form sent that nothing ever read
