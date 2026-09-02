---
"volleybro": patch
---

### Fixed

#### Record

- Stop the sync indicator spinning through an entire offline stretch. It now settles into a static state a few seconds after the writes actually start failing, and says the rallies are saved and what happens next, instead of implying the app is stuck
- Treat a connection that reports itself as online but cannot reach the server the same as being offline, which is the more common case in a gym
- Reserve the warning colour, in the indicator and on the rally rows, for entries a retry cannot save. Entries merely waiting out a backoff send themselves and no longer look like something went wrong
- Hide the manual retry while the device is off the network, where it could only fail, and show it as busy while its own request is in flight
- Say so when this device cannot keep unsent rallies at all — before the first rally is recorded, while switching browser mode or device is still an option
