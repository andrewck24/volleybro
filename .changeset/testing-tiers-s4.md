---
"volleybro": patch
---

### Changed

#### Infrastructure

- The landing, hook and auth tests run the real components, hooks, response class and DI container; no frontend test mocks `apiClient`, `fetch`, SWR or a module under `src/components` or `src/hooks` any more, except where the test file names the jsdom limitation
- The shared frontend setup no longer stubs `motion`; the real library runs in every test

### Removed

#### Infrastructure

- Landing tests that only read Tailwind class strings, the call shapes of a mocked scroll handler or the test ids of stubs
