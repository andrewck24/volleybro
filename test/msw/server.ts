import { setupServer } from "msw/node";

// One server per test file. A test adds its own handlers with `server.use`;
// they are dropped after each test, so no handler leaks between tests.
export const server = setupServer();
